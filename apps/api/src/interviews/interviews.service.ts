import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewStatusDto } from './dto/update-interview-status.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { InterviewStatus, RecommendationStatus } from '@repo/database';

@Injectable()
export class InterviewsService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateInterviewDto, actorId: string) {
    const application = await this.db.application.findUnique({
      where: { id: dto.applicationId },
      include: {
        candidate: true,
        jobOpening: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // 1. Create interview and interviewers inside transaction
    const interview = await this.db.$transaction(async (tx) => {
      const createdInterview = await tx.interview.create({
        data: {
          applicationId: dto.applicationId,
          type: dto.type,
          scheduledAt: new Date(dto.scheduledAt),
          location: dto.location,
          videoLink: dto.videoLink,
          status: InterviewStatus.SCHEDULED,
        },
      });

      // Bind interviewers
      if (dto.interviewerIds && dto.interviewerIds.length > 0) {
        await tx.interviewer.createMany({
          data: dto.interviewerIds.map((userId) => ({
            interviewId: createdInterview.id,
            userId: userId,
          })),
        });
      }

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CREATE',
          resource: 'Interview',
          resourceId: createdInterview.id,
          afterValue: createdInterview as any,
        },
      });

      return createdInterview;
    });

    // 2. Schedule notifications for each interviewer
    for (const userId of dto.interviewerIds) {
      try {
        await this.db.systemNotification.create({
          data: {
            userId,
            type: 'INTERVIEW_SCHEDULED',
            title: 'New Interview Scheduled',
            message: `You have been scheduled as an interviewer for candidate ${application.candidate.firstName} ${application.candidate.lastName} on ${new Date(dto.scheduledAt).toLocaleString()}.`,
            metadata: {
              interviewId: interview.id,
              applicationId: dto.applicationId,
            },
          },
        });
      } catch (err) {
        // Fail-safe notification dispatching
        console.error('Failed to create in-app notification:', err);
      }
    }

    return this.findOne(interview.id);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    candidateId?: string;
    recruiterId?: string;
    interviewerId?: string;
    status?: InterviewStatus;
    fromDate?: string;
    toDate?: string;
  }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.candidateId) {
      where.application = { candidateId: query.candidateId };
    }
    if (query.recruiterId) {
      where.application = { ...where.application, recruiterId: query.recruiterId };
    }
    if (query.interviewerId) {
      where.interviewers = {
        some: { userId: query.interviewerId },
      };
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.fromDate || query.toDate) {
      where.scheduledAt = {};
      if (query.fromDate) {
        where.scheduledAt.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.scheduledAt.lte = new Date(query.toDate);
      }
    }

    const [interviews, total] = await Promise.all([
      this.db.interview.findMany({
        where,
        skip,
        take: limit,
        include: {
          application: {
            include: {
              candidate: true,
              jobOpening: {
                include: { company: true },
              },
            },
          },
          interviewers: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
              },
            },
          },
          feedbacks: {
            include: {
              interviewer: {
                select: { id: true, firstName: true, lastName: true, avatarUrl: true },
              },
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
      this.db.interview.count({ where }),
    ]);

    return {
      interviews,
      meta: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const interview = await this.db.interview.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            candidate: true,
            jobOpening: {
              include: { company: true },
            },
          },
        },
        interviewers: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
            },
          },
        },
        feedbacks: {
          include: {
            interviewer: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found');
    }

    return interview;
  }

  async updateStatus(id: string, dto: UpdateInterviewStatusDto, actorId: string) {
    const interview = await this.findOne(id);

    const beforeValue = { ...interview };
    delete (beforeValue as any).application;
    delete (beforeValue as any).interviewers;
    delete (beforeValue as any).feedbacks;

    const updated = await this.db.interview.update({
      where: { id },
      data: {
        status: dto.status,
        cancellationReason: dto.cancellationReason ?? null,
      },
    });

    // Create Audit Log
    await this.db.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE',
        resource: 'Interview',
        resourceId: id,
        beforeValue: beforeValue as any,
        afterValue: updated as any,
      },
    });

    return this.findOne(id);
  }

  async submitFeedback(id: string, dto: SubmitFeedbackDto, interviewerId: string) {
    const interview = await this.findOne(id);

    // Verify interviewer is assigned to this interview
    const isAssigned = interview.interviewers.some((int) => int.userId === interviewerId);
    if (!isAssigned) {
      throw new ForbiddenException('You are not assigned as an interviewer for this session.');
    }

    // Check if feedback already submitted by this interviewer
    const existingFeedback = await this.db.interviewFeedback.findFirst({
      where: {
        interviewId: id,
        interviewerId,
      },
    });

    if (existingFeedback) {
      throw new BadRequestException('Feedback already submitted for this interview by this interviewer.');
    }

    const feedback = await this.db.$transaction(async (tx) => {
      const createdFeedback = await tx.interviewFeedback.create({
        data: {
          interviewId: id,
          interviewerId,
          recommendation: dto.recommendation,
          notes: dto.notes,
          competencyRatings: dto.competencyRatings,
        },
      });

      // Log Audit
      await tx.auditLog.create({
        data: {
          userId: interviewerId,
          action: 'CREATE',
          resource: 'InterviewFeedback',
          resourceId: createdFeedback.id,
          afterValue: createdFeedback as any,
        },
      });

      // Update interview status to Completed if all interviewers have submitted feedback (optional flow)
      // For now we will keep it manual or auto-complete on first feedback
      return createdFeedback;
    });

    return feedback;
  }
}
