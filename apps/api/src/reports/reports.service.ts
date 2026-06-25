import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { JobRequisitionStatus, ApplicationStage } from '@repo/database';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  async getDashboardKpis() {
    const totalJobs = await this.db.jobOpening.count({ where: { status: 'OPEN' } });
    const totalCandidates = await this.db.candidate.count();
    const activePipeline = await this.db.application.count({
      where: { stage: { notIn: [ApplicationStage.PLACEMENT, ApplicationStage.REJECTED, ApplicationStage.WITHDRAWN] } },
    });
    const placements = await this.db.placement.count();

    const invoices = await this.db.invoice.aggregate({
      _sum: { totalAmount: true },
    });

    return {
      totalJobs,
      totalCandidates,
      activePipeline,
      totalPlacements: placements,
      totalRevenue: invoices._sum.totalAmount ? Number(invoices._sum.totalAmount) : 0,
    };
  }

  async getRecruiterPerformance() {
    const users = await this.db.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, firstName: true, lastName: true },
    });

    const performance = await Promise.all(
      users.map(async (user) => {
        const jobs = await this.db.jobRequisition.count({ where: { creatorId: user.id } });
        const placements = await this.db.placement.count({
          where: { application: { recruiterId: user.id } },
        });
        const interviews = await this.db.interviewer.count({ where: { userId: user.id } });

        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          jobsCreated: jobs,
          interviewsScheduled: interviews,
          placementsMade: placements,
        };
      })
    );

    return performance;
  }

  async getPipelineFunnel() {
    const stages = [
      ApplicationStage.NEW_APPLICATION,
      ApplicationStage.SCREENING,
      ApplicationStage.HR_INTERVIEW,
      ApplicationStage.TECHNICAL_INTERVIEW,
      ApplicationStage.ASSESSMENT,
      ApplicationStage.OFFER,
      ApplicationStage.PLACEMENT,
      ApplicationStage.REJECTED,
      ApplicationStage.WITHDRAWN,
    ];

    const counts = await this.db.application.groupBy({
      by: ['stage'],
      _count: true,
    });

    const funnel = stages.map((stage) => {
      const match = counts.find((c) => c.stage === stage);
      return {
        stage,
        count: match?._count || 0,
      };
    });

    return funnel;
  }

  async getClientReport() {
    const clients = await this.db.company.findMany({
      include: {
        _count: {
          select: { jobOpenings: true },
        },
      },
    });

    const report = await Promise.all(
      clients.map(async (client) => {
        const placements = await this.db.placement.count({
          where: { application: { jobOpening: { companyId: client.id } } },
        });
        return {
          id: client.id,
          name: client.name,
          industry: client.industry,
          activeJobs: client._count.jobOpenings,
          totalPlacements: placements,
        };
      })
    );

    return report;
  }

  async getFinanceReport() {
    const invoices = await this.db.invoice.groupBy({
      by: ['status'],
      _sum: {
        totalAmount: true,
      },
    });

    const data = invoices.map((inv) => ({
      status: inv.status,
      amount: inv._sum.totalAmount ? Number(inv._sum.totalAmount) : 0,
    }));

    return data;
  }
}
