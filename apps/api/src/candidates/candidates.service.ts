import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { CreatePoolDto } from './dto/create-pool.dto';
import { CandidateDocumentType } from '@repo/database';

@Injectable()
export class CandidatesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storageService: StorageService,
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
}
