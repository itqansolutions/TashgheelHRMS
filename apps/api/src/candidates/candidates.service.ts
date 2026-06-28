import { Injectable, NotFoundException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { CreatePoolDto } from './dto/create-pool.dto';
import { CandidateDocumentType } from '@repo/database';
import { AiService } from '../ai/ai.service';

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly storageService: StorageService,
    private readonly aiService: AiService,
  ) {}

  async create(dto: CreateCandidateDto, actorId: string) {
    if (dto.email) {
      const existing = await this.db.candidate.findFirst({
        where: { email: dto.email, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException('A candidate with this email address already exists');
      }
    }

    return this.db.$transaction(async (tx) => {
      const candidate = await tx.candidate.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
          linkedinUrl: dto.linkedinUrl,
          nationality: dto.nationality,
          currentLocation: dto.currentLocation,
          expectedSalary: dto.expectedSalary,
          availability: dto.availability ?? 'AVAILABLE',
          source: dto.source,
          experience: dto.experience
            ? {
                createMany: {
                  data: dto.experience.map((e) => ({
                    companyName: e.companyName,
                    title: e.title,
                    startDate: new Date(e.startDate),
                    endDate: e.endDate ? new Date(e.endDate) : null,
                    isCurrent: e.isCurrent ?? false,
                    description: e.description,
                  })),
                },
              }
            : undefined,
          education: dto.education
            ? {
                createMany: {
                  data: dto.education.map((edu) => ({
                    institution: edu.institution,
                    degree: edu.degree,
                    fieldOfStudy: edu.fieldOfStudy,
                    startDate: new Date(edu.startDate),
                    endDate: edu.endDate ? new Date(edu.endDate) : null,
                  })),
                },
              }
            : undefined,
          skills: dto.skills
            ? {
                createMany: {
                  data: dto.skills.map((s) => ({
                    skillName: s.skillName,
                    proficiency: s.proficiency ?? 'INTERMEDIATE',
                  })),
                },
              }
            : undefined,
        },
        include: {
          experience: true,
          education: true,
          skills: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CREATE',
          resource: 'Candidate',
          resourceId: candidate.id,
          afterValue: candidate as any,
        },
      });

      return candidate;
    }).then(async (candidate) => {
      try {
        const skillsText = dto.skills ? dto.skills.map((s) => s.skillName).join(', ') : '';
        const experienceText = dto.experience ? dto.experience.map((e) => `${e.title} at ${e.companyName}`).join(', ') : '';
        const textToEmbed = `${candidate.firstName} ${candidate.lastName}. Skills: ${skillsText}. Experience: ${experienceText}.`;
        await this.aiService.syncCandidateEmbedding(candidate.id, textToEmbed);
      } catch (err) {
        this.logger.error(`Failed to sync embedding for candidate ${candidate.id}`, err);
      }
      return candidate;
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    skills?: string;
    location?: string;
    availability?: string;
    expectedSalaryMax?: number;
  }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null, // Soft delete filter
    };

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.location) {
      where.currentLocation = { contains: query.location, mode: 'insensitive' };
    }

    if (query.availability) {
      where.availability = query.availability;
    }

    if (query.expectedSalaryMax) {
      where.expectedSalary = { lte: query.expectedSalaryMax };
    }

    if (query.skills) {
      const skillsArray = query.skills.split(',').map((s) => s.trim());
      where.skills = {
        some: {
          skillName: { in: skillsArray, mode: 'insensitive' },
        },
      };
    }

    const [candidates, total] = await Promise.all([
      this.db.candidate.findMany({
        where,
        skip,
        take: limit,
        include: {
          skills: true,
          experience: {
            orderBy: { startDate: 'desc' },
            take: 1, // Get most recent job title
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.candidate.count({ where }),
    ]);

    return {
      candidates,
      meta: { total, page, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const candidate = await this.db.candidate.findFirst({
      where: { id, deletedAt: null },
      include: {
        experience: { orderBy: { startDate: 'desc' } },
        education: { orderBy: { startDate: 'desc' } },
        skills: { orderBy: { skillName: 'asc' } },
        documents: { orderBy: { createdAt: 'desc' } },
        applications: {
          include: {
            jobOpening: {
              select: { id: true, title: true, company: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    return candidate;
  }

  async update(id: string, dto: UpdateCandidateDto, actorId: string) {
    const candidate = await this.findOne(id);

    if (dto.email && dto.email !== candidate.email) {
      const existing = await this.db.candidate.findFirst({
        where: { email: dto.email, deletedAt: null, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('A candidate with this email address already exists');
      }
    }

    return this.db.$transaction(async (tx) => {
      // 1. Delete and sync sub-relations if passed in DTO
      if (dto.experience) {
        await tx.candidateExperience.deleteMany({ where: { candidateId: id } });
      }
      if (dto.education) {
        await tx.candidateEducation.deleteMany({ where: { candidateId: id } });
      }
      if (dto.skills) {
        await tx.candidateSkill.deleteMany({ where: { candidateId: id } });
      }

      // 2. Perform main update + nested creations
      const updated = await tx.candidate.update({
        where: { id },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone,
          linkedinUrl: dto.linkedinUrl,
          nationality: dto.nationality,
          currentLocation: dto.currentLocation,
          expectedSalary: dto.expectedSalary,
          availability: dto.availability,
          source: dto.source,
          experience: dto.experience
            ? {
                createMany: {
                  data: dto.experience.map((e) => ({
                    companyName: e.companyName,
                    title: e.title,
                    startDate: new Date(e.startDate),
                    endDate: e.endDate ? new Date(e.endDate) : null,
                    isCurrent: e.isCurrent ?? false,
                    description: e.description,
                  })),
                },
              }
            : undefined,
          education: dto.education
            ? {
                createMany: {
                  data: dto.education.map((edu) => ({
                    institution: edu.institution,
                    degree: edu.degree,
                    fieldOfStudy: edu.fieldOfStudy,
                    startDate: new Date(edu.startDate),
                    endDate: edu.endDate ? new Date(edu.endDate) : null,
                  })),
                },
              }
            : undefined,
          skills: dto.skills
            ? {
                createMany: {
                  data: dto.skills.map((s) => ({
                    skillName: s.skillName,
                    proficiency: s.proficiency ?? 'INTERMEDIATE',
                  })),
                },
              }
            : undefined,
        },
        include: {
          experience: true,
          education: true,
          skills: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'UPDATE',
          resource: 'Candidate',
          resourceId: id,
          beforeValue: candidate as any,
          afterValue: updated as any,
        },
      });

      return updated;
    }).then(async (updated) => {
      try {
        const skillsText = updated.skills ? updated.skills.map((s) => s.skillName).join(', ') : '';
        const experienceText = updated.experience ? updated.experience.map((e) => `${e.title} at ${e.companyName}`).join(', ') : '';
        const textToEmbed = `${updated.firstName} ${updated.lastName}. Skills: ${skillsText}. Experience: ${experienceText}.`;
        await this.aiService.syncCandidateEmbedding(updated.id, textToEmbed);
      } catch (err) {
        this.logger.error(`Failed to sync embedding for updated candidate ${updated.id}`, err);
      }
      return updated;
    });
  }

  async remove(id: string, actorId: string) {
    const candidate = await this.findOne(id);

    return this.db.$transaction(async (tx) => {
      const deleted = await tx.candidate.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'DELETE',
          resource: 'Candidate',
          resourceId: id,
          beforeValue: candidate as any,
          afterValue: deleted as any,
        },
      });

      return { success: true };
    });
  }

  // --- DOCUMENTS ---

  async uploadDocument(
    candidateId: string,
    file: Express.Multer.File,
    type: CandidateDocumentType,
    actorId: string,
  ) {
    await this.findOne(candidateId);

    const uploadResult = await this.storageService.uploadFile(file, 'candidates');

    return this.db.$transaction(async (tx) => {
      const doc = await tx.candidateDocument.create({
        data: {
          candidateId,
          type: type ?? 'CV',
          fileName: file.originalname,
          fileUrl: uploadResult.url,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'UPLOAD_DOCUMENT',
          resource: 'CandidateDocument',
          resourceId: doc.id,
          afterValue: doc as any,
        },
      });

      return doc;
    });
  }

  async removeDocument(id: string, actorId: string) {
    const doc = await this.db.candidateDocument.findUnique({ where: { id } });
    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    let fileKeyToCleanup: string | null = null;
    const urlParts = doc.fileUrl.split('/storage/file/');
    if (urlParts.length > 1) {
      fileKeyToCleanup = urlParts[1];
    } else {
      const r2Parts = doc.fileUrl.split('.com/');
      if (r2Parts.length > 1) {
        fileKeyToCleanup = r2Parts[1].substring(r2Parts[1].indexOf('/') + 1);
      }
    }

    return this.db.$transaction(async (tx) => {
      await tx.candidateDocument.delete({ where: { id } });

      if (fileKeyToCleanup) {
        await this.storageService.deleteFile(fileKeyToCleanup);
      }

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'REMOVE_DOCUMENT',
          resource: 'CandidateDocument',
          resourceId: id,
          beforeValue: doc as any,
        },
      });

      return { success: true };
    });
  }

  // --- CANDIDATE POOLS ---

  async createPool(dto: CreatePoolDto, actorId: string) {
    return this.db.$transaction(async (tx) => {
      const pool = await tx.candidatePool.create({
        data: {
          name: dto.name,
          description: dto.description,
          creatorId: actorId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CREATE',
          resource: 'CandidatePool',
          resourceId: pool.id,
          afterValue: pool as any,
        },
      });

      return pool;
    });
  }

  async findAllPools() {
    return this.db.candidatePool.findMany({
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOnePool(id: string) {
    const pool = await this.db.candidatePool.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        members: {
          include: {
            candidate: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                availability: true,
                currentLocation: true,
              },
            },
          },
        },
      },
    });
    if (!pool) {
      throw new NotFoundException('Pool not found');
    }
    return pool;
  }

  async addPoolMember(poolId: string, candidateId: string, actorId: string) {
    // Check pool and candidate exist
    const pool = await this.db.candidatePool.findUnique({ where: { id: poolId } });
    if (!pool) throw new NotFoundException('Pool not found');

    const candidate = await this.findOne(candidateId);

    // Check duplicate membership
    const existing = await this.db.candidatePoolMember.findUnique({
      where: { poolId_candidateId: { poolId, candidateId } },
    });
    if (existing) {
      return { success: true, message: 'Already a member' };
    }

    return this.db.$transaction(async (tx) => {
      const member = await tx.candidatePoolMember.create({
        data: { poolId, candidateId },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'ADD_POOL_MEMBER',
          resource: 'CandidatePoolMember',
          resourceId: `${poolId}:${candidateId}`,
          afterValue: member as any,
        },
      });

      return { success: true, data: member };
    });
  }

  async removePoolMember(poolId: string, candidateId: string, actorId: string) {
    const member = await this.db.candidatePoolMember.findUnique({
      where: { poolId_candidateId: { poolId, candidateId } },
    });
    if (!member) {
      throw new NotFoundException('Pool membership not found');
    }

    return this.db.$transaction(async (tx) => {
      await tx.candidatePoolMember.delete({
        where: { poolId_candidateId: { poolId, candidateId } },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'REMOVE_POOL_MEMBER',
          resource: 'CandidatePoolMember',
          resourceId: `${poolId}:${candidateId}`,
          beforeValue: member as any,
        },
      });

      return { success: true };
    });
  }

  async parseAndCreateFromCv(file: Express.Multer.File, actorId: string) {
    const { PDFParse } = require('pdf-parse');
    let text = '';
    const isPdf = file.originalname?.toLowerCase().endsWith('.pdf') || file.mimetype === 'application/pdf';

    if (isPdf) {
      try {
        const parser = new PDFParse({ data: file.buffer });
        const pdfData = await parser.getText();
        text = (pdfData.text || '').substring(0, 10000); // Take up to 10k chars
      } catch (err) {
        throw new BadRequestException('Failed to extract text from the PDF file. Please ensure it is a valid, unencrypted PDF.');
      }
    } else {
      // Fallback if not a PDF (e.g. text/docx)
      text = file.buffer.toString('utf-8').substring(0, 5000);
    }

    if (!text || text.trim().length < 50) {
      throw new BadRequestException(
        'The uploaded CV does not contain enough readable text. If this is a scanned PDF (an image), please convert it to a searchable PDF with OCR or upload a text-based document.'
      );
    }

    let parsedData;
    try {
      parsedData = await this.aiService.parseResumeText(text);
    } catch (error: any) {
      throw new BadRequestException(`AI Resume Parser failed: ${error.message || error}`);
    }

    // Ensure text types for extracted values and trim them safely
    const cleanString = (val: any): string | undefined => {
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      }
      return undefined;
    };

    const parseDateSafe = (dateStr: any): Date => {
      if (!dateStr) return new Date();
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? new Date() : d;
    };

    const parseEndDateSafe = (dateStr: any, isCurrent?: boolean): Date | null => {
      if (isCurrent) return null;
      if (!dateStr) return null;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    };

    const email = cleanString(parsedData?.email);
    const phone = cleanString(parsedData?.phone);
    const firstName = cleanString(parsedData?.firstName) || 'Candidate';
    const lastName = cleanString(parsedData?.lastName) || 'Profile';
    const aiSummary = cleanString(parsedData?.aiSummary) || '';
    const linkedinUrl = cleanString(parsedData?.linkedinUrl);
    const currentLocation = cleanString(parsedData?.currentLocation);
    const expectedSalary = parsedData?.expectedSalary ? Number(parsedData.expectedSalary) : undefined;
    const nationality = cleanString(parsedData?.nationality);

    // Check for duplicates in the DB (only active candidates, where deletedAt is null)
    let existingCandidate = null;
    if (email) {
      existingCandidate = await this.db.candidate.findFirst({
        where: { email, deletedAt: null },
      });
    }

    if (!existingCandidate && phone) {
      existingCandidate = await this.db.candidate.findFirst({
        where: { phone, deletedAt: null },
      });
    }

    if (existingCandidate) {
      return {
        created: false,
        duplicated: true,
        candidate: existingCandidate,
      };
    }

    // Create a new candidate profile
    let candidate;
    try {
      candidate = await this.db.$transaction(async (tx) => {
        const createdCandidate = await tx.candidate.create({
          data: {
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phone,
            aiSummary: aiSummary,
            linkedinUrl: linkedinUrl,
            currentLocation: currentLocation,
            expectedSalary: expectedSalary,
            nationality: nationality,
            availability: 'AVAILABLE',
            skills: Array.isArray(parsedData?.skills) && parsedData.skills.length > 0
              ? {
                  createMany: {
                    data: parsedData.skills
                      .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
                      .map((skillName: string) => ({
                        skillName: skillName.trim(),
                        proficiency: 'INTERMEDIATE',
                      })),
                  },
                }
              : undefined,
            experience: Array.isArray(parsedData?.experience) && parsedData.experience.length > 0
              ? {
                  createMany: {
                    data: parsedData.experience.map((exp: any) => ({
                      companyName: cleanString(exp.companyName) || 'Company',
                      title: cleanString(exp.title) || 'Role',
                      startDate: parseDateSafe(exp.startDate),
                      endDate: parseEndDateSafe(exp.endDate, exp.isCurrent),
                      isCurrent: !!exp.isCurrent,
                      description: cleanString(exp.description) || '',
                    })),
                  },
                }
              : undefined,
            education: Array.isArray(parsedData?.education) && parsedData.education.length > 0
              ? {
                  createMany: {
                    data: parsedData.education.map((edu: any) => ({
                      institution: cleanString(edu.institution) || 'Institution',
                      degree: cleanString(edu.degree) || 'Degree',
                      fieldOfStudy: cleanString(edu.fieldOfStudy) || '',
                      startDate: parseDateSafe(edu.startDate),
                      endDate: parseEndDateSafe(edu.endDate),
                    })),
                  },
                }
              : undefined,
          },
          include: {
            skills: true,
            experience: true,
            education: true,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: 'CREATE',
            resource: 'Candidate',
            resourceId: createdCandidate.id,
            afterValue: createdCandidate as any,
          },
        });

        return createdCandidate;
      });
    } catch (err: any) {
      // Catch duplicate constraint errors (P2002) in case database has a soft-deleted or concurrent candidate
      if (err.code === 'P2002') {
        const orConditions = [];
        if (email) orConditions.push({ email });
        if (phone) orConditions.push({ phone });
        
        if (orConditions.length > 0) {
          const existing = await this.db.candidate.findFirst({
            where: {
              OR: orConditions,
            },
          });
          if (existing) {
            return {
              created: false,
              duplicated: true,
              candidate: existing,
            };
          }
        }
      }
      throw err; // rethrow if it is some other error
    }

    // Upload the CV file and link it to the newly created candidate as a CV Document
    try {
      const uploadResult = await this.storageService.uploadFile(file, 'candidates');

      await this.db.$transaction(async (tx) => {
        const doc = await tx.candidateDocument.create({
          data: {
            candidateId: candidate.id,
            type: 'CV',
            fileName: file.originalname,
            fileUrl: uploadResult.url,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: actorId,
            action: 'UPLOAD_DOCUMENT',
            resource: 'CandidateDocument',
            resourceId: doc.id,
            afterValue: doc as any,
          },
        });
      });
    } catch (uploadError) {
      this.logger.error(`Failed to upload CV document for candidate ${candidate.id}`, uploadError);
    }

    // Sync candidate embedding based on full detailed history to support highly accurate vector matching
    try {
      const skillsArray = Array.isArray(candidate.skills) ? candidate.skills.map((s: any) => s.skillName) : [];
      const expArray = Array.isArray(candidate.experience) ? candidate.experience.map((e: any) => {
        const dateStr = e.isCurrent ? 'Present' : e.endDate ? new Date(e.endDate).getFullYear() : '';
        return `${e.title} at ${e.companyName} (${dateStr}): ${e.description || ''}`;
      }) : [];
      const eduArray = Array.isArray(candidate.education) ? candidate.education.map((e: any) => 
        `${e.degree} in ${e.fieldOfStudy || ''} from ${e.institution}`
      ) : [];

      const textParts = [
        `Candidate: ${candidate.firstName} ${candidate.lastName}`,
        `Summary: ${candidate.aiSummary || ''}`,
        `Skills: ${skillsArray.join(', ')}`
      ];

      if (expArray.length > 0) {
        textParts.push(`Experience: ${expArray.join('. ')}`);
      }
      if (eduArray.length > 0) {
        textParts.push(`Education: ${eduArray.join('. ')}`);
      }

      const textToEmbed = textParts.join('\n');
      await this.aiService.syncCandidateEmbedding(candidate.id, textToEmbed);
    } catch (embedError) {
      this.logger.error(`Failed to sync candidate embedding for candidate ${candidate.id}`, embedError);
    }

    return {
      created: true,
      duplicated: false,
      candidate,
    };
  }

  async reparseCandidateCv(candidateId: string, actorId: string) {
    const candidate = await this.db.candidate.findUnique({
      where: { id: candidateId },
      include: { documents: true },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    const cvDoc = candidate.documents.find((d) => d.type === 'CV');
    if (!cvDoc) {
      throw new BadRequestException('No CV resume file uploaded for this candidate');
    }

    let fileKey: string | null = null;
    const urlParts = cvDoc.fileUrl.split('/storage/file/');
    if (urlParts.length > 1) {
      fileKey = urlParts[1];
    } else {
      const r2Parts = cvDoc.fileUrl.split('.com/');
      if (r2Parts.length > 1) {
        fileKey = r2Parts[1].substring(r2Parts[1].indexOf('/') + 1);
      }
    }

    if (!fileKey) {
      throw new BadRequestException('Could not resolve file key from document URL');
    }

    const fileStreamResult = await this.storageService.getFileStream(fileKey);
    if (!fileStreamResult) {
      throw new BadRequestException('Failed to retrieve the CV file from storage');
    }

    // Helper to read stream into buffer
    const streamToBuffer = async (stream: any): Promise<Buffer> => {
      return new Promise((resolve, reject) => {
        const chunks: any[] = [];
        stream.on('data', (chunk: any) => chunks.push(chunk));
        stream.on('error', (err: any) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    };

    let buffer: Buffer;
    try {
      buffer = await streamToBuffer(fileStreamResult.stream);
    } catch (err) {
      throw new BadRequestException('Failed to load file contents from stream');
    }

    const { PDFParse } = require('pdf-parse');
    let text = '';
    const isPdf = cvDoc.fileName?.toLowerCase().endsWith('.pdf') || cvDoc.fileUrl?.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      try {
        const parser = new PDFParse({ data: buffer });
        const pdfData = await parser.getText();
        text = (pdfData.text || '').substring(0, 10000);
      } catch (err) {
        throw new BadRequestException('Failed to extract text from PDF file');
      }
    } else {
      text = buffer.toString('utf-8').substring(0, 5000);
    }

    if (!text || text.trim().length < 50) {
      throw new BadRequestException('The CV document does not contain enough readable text to parse');
    }

    let parsedData;
    try {
      parsedData = await this.aiService.parseResumeText(text);
    } catch (error: any) {
      throw new BadRequestException(`AI Resume Parser failed: ${error.message || error}`);
    }

    const cleanString = (val: any): string | undefined => {
      if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      }
      return undefined;
    };

    const parseDateSafe = (dateStr: any): Date => {
      if (!dateStr) return new Date();
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? new Date() : d;
    };

    const parseEndDateSafe = (dateStr: any, isCurrent?: boolean): Date | null => {
      if (isCurrent) return null;
      if (!dateStr) return null;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d;
    };

    const email = cleanString(parsedData?.email) || candidate.email;
    const phone = cleanString(parsedData?.phone) || candidate.phone;
    const firstName = cleanString(parsedData?.firstName) || candidate.firstName;
    const lastName = cleanString(parsedData?.lastName) || candidate.lastName;
    const aiSummary = cleanString(parsedData?.aiSummary) || '';
    const linkedinUrl = cleanString(parsedData?.linkedinUrl) || candidate.linkedinUrl;
    const currentLocation = cleanString(parsedData?.currentLocation) || candidate.currentLocation;
    const expectedSalary = parsedData?.expectedSalary ? Number(parsedData.expectedSalary) : (candidate.expectedSalary ? Number(candidate.expectedSalary) : undefined);
    const nationality = cleanString(parsedData?.nationality) || candidate.nationality;

    const updatedCandidate = await this.db.$transaction(async (tx) => {
      // Clean old entries
      await tx.candidateExperience.deleteMany({ where: { candidateId } });
      await tx.candidateEducation.deleteMany({ where: { candidateId } });
      await tx.candidateSkill.deleteMany({ where: { candidateId } });

      return await tx.candidate.update({
        where: { id: candidateId },
        data: {
          firstName,
          lastName,
          email,
          phone,
          aiSummary,
          linkedinUrl,
          currentLocation,
          expectedSalary,
          nationality,
          skills: Array.isArray(parsedData?.skills) && parsedData.skills.length > 0
            ? {
                createMany: {
                  data: parsedData.skills
                    .filter((s: any) => typeof s === 'string' && s.trim().length > 0)
                    .map((skillName: string) => ({
                      skillName: skillName.trim(),
                      proficiency: 'INTERMEDIATE',
                    })),
                },
              }
            : undefined,
          experience: Array.isArray(parsedData?.experience) && parsedData.experience.length > 0
            ? {
                createMany: {
                  data: parsedData.experience.map((exp: any) => ({
                    companyName: cleanString(exp.companyName) || 'Company',
                    title: cleanString(exp.title) || 'Role',
                    startDate: parseDateSafe(exp.startDate),
                    endDate: parseEndDateSafe(exp.endDate, exp.isCurrent),
                    isCurrent: !!exp.isCurrent,
                    description: cleanString(exp.description) || '',
                  })),
                },
              }
            : undefined,
          education: Array.isArray(parsedData?.education) && parsedData.education.length > 0
            ? {
                createMany: {
                  data: parsedData.education.map((edu: any) => ({
                    institution: cleanString(edu.institution) || 'Institution',
                    degree: cleanString(edu.degree) || 'Degree',
                    fieldOfStudy: cleanString(edu.fieldOfStudy) || '',
                    startDate: parseDateSafe(edu.startDate),
                    endDate: parseEndDateSafe(edu.endDate),
                  })),
                },
              }
            : undefined,
        },
        include: {
          skills: true,
          experience: true,
          education: true,
        },
      });
    });

    // Sync candidate embedding
    try {
      const skillsArray = Array.isArray(updatedCandidate.skills) ? updatedCandidate.skills.map((s: any) => s.skillName) : [];
      const expArray = Array.isArray(updatedCandidate.experience) ? updatedCandidate.experience.map((e: any) => {
        const dateStr = e.isCurrent ? 'Present' : e.endDate ? new Date(e.endDate).getFullYear() : '';
        return `${e.title} at ${e.companyName} (${dateStr}): ${e.description || ''}`;
      }) : [];
      const eduArray = Array.isArray(updatedCandidate.education) ? updatedCandidate.education.map((e: any) => 
        `${e.degree} in ${e.fieldOfStudy || ''} from ${e.institution}`
      ) : [];

      const textParts = [
        `Candidate: ${updatedCandidate.firstName} ${updatedCandidate.lastName}`,
        `Summary: ${updatedCandidate.aiSummary || ''}`,
        `Skills: ${skillsArray.join(', ')}`
      ];

      if (expArray.length > 0) textParts.push(`Experience: ${expArray.join('. ')}`);
      if (eduArray.length > 0) textParts.push(`Education: ${eduArray.join('. ')}`);

      await this.aiService.syncCandidateEmbedding(updatedCandidate.id, textParts.join('\n'));
    } catch (embedError) {
      this.logger.error(`Failed to sync embedding for candidate ${updatedCandidate.id} on reparse`, embedError);
    }

    return updatedCandidate;
  }

  async resyncCandidateEmbedding(id: string) {
    const candidate = await this.findOne(id);
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    try {
      const skillsArray = Array.isArray(candidate.skills) ? candidate.skills.map((s: any) => s.skillName) : [];
      const expArray = Array.isArray(candidate.experience) ? candidate.experience.map((e: any) => {
        const dateStr = e.isCurrent ? 'Present' : e.endDate ? new Date(e.endDate).getFullYear() : '';
        return `${e.title} at ${e.companyName} (${dateStr}): ${e.description || ''}`;
      }) : [];
      const eduArray = Array.isArray(candidate.education) ? candidate.education.map((e: any) => 
        `${e.degree} in ${e.fieldOfStudy || ''} from ${e.institution}`
      ) : [];

      const textParts = [
        `Candidate: ${candidate.firstName} ${candidate.lastName}`,
        `Summary: ${candidate.aiSummary || ''}`,
        `Skills: ${skillsArray.join(', ')}`
      ];

      if (expArray.length > 0) textParts.push(`Experience: ${expArray.join('. ')}`);
      if (eduArray.length > 0) textParts.push(`Education: ${eduArray.join('. ')}`);

      await this.aiService.syncCandidateEmbedding(candidate.id, textParts.join('\n'));
      return { success: true };
    } catch (err) {
      this.logger.error(`Failed to manually sync embedding for candidate ${candidate.id}`, err);
      throw new BadRequestException('Failed to generate AI embedding');
    }
  }
}
