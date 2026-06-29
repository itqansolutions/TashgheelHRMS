import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PlacementStatus, GuaranteeStatus } from '@repo/database';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Runs every day at 00:05 AM to auto-close expired guarantee periods.
   * Finds placements where guaranteeEndDate <= NOW and guaranteeStatus = ACTIVE,
   * updates them to EXPIRED/COMPLETED, and notifies the recruiter.
   */
  @Cron('5 0 * * *')
  async checkGuaranteePeriods() {
    this.logger.log('[CRON] Running guarantee period expiry check...');

    try {
      const now = new Date();

      const expiredPlacements = await this.db.placement.findMany({
        where: {
          guaranteeEndDate: { lte: now },
          guaranteeStatus: GuaranteeStatus.ACTIVE,
          status: PlacementStatus.GUARANTEE_PERIOD,
        },
        include: {
          application: {
            include: {
              candidate: { select: { firstName: true, lastName: true } },
              jobOpening: {
                include: { company: { select: { name: true } } },
              },
              recruiter: { select: { id: true, firstName: true } },
            },
          },
        },
        take: 100,
      });

      this.logger.log(`[CRON] Found ${expiredPlacements.length} expired guarantee periods`);

      for (const placement of expiredPlacements) {
        try {
          await this.db.placement.update({
            where: { id: placement.id },
            data: {
              guaranteeStatus: GuaranteeStatus.EXPIRED,
              status: PlacementStatus.COMPLETED,
            },
          });

          this.logger.log(`[CRON] Placement ${placement.id} guarantee period closed → COMPLETED`);

          const candidate = placement.application.candidate;
          const company = placement.application.jobOpening.company;
          const recruiter = placement.application.recruiter;

          if (recruiter?.id) {
            await this.notificationsService.createNotification({
              userId: recruiter.id,
              type: 'GUARANTEE_EXPIRED',
              title: '⏰ Guarantee Period Ended',
              message: `The 90-day guarantee period for ${candidate.firstName} ${candidate.lastName} at ${company.name} has ended. Placement is now marked as Completed.`,
              metadata: { placementId: placement.id },
            }).catch(() => {});
          }
        } catch (placementErr) {
          this.logger.error(`[CRON] Failed to process placement ${placement.id}`, placementErr);
        }
      }

      this.logger.log('[CRON] Guarantee period check complete.');
    } catch (err) {
      this.logger.error('[CRON] Guarantee period check failed', err);
    }
  }

  /**
   * Runs every day at 01:00 AM to flag overdue invoices.
   * Any SENT or DRAFT invoice past its due date becomes OVERDUE.
   */
  @Cron('0 1 * * *')
  async checkOverdueInvoices() {
    this.logger.log('[CRON] Running overdue invoice check...');

    try {
      const now = new Date();

      const result = await this.db.invoice.updateMany({
        where: {
          dueDate: { lt: now },
          status: { in: ['SENT', 'DRAFT'] as any },
        },
        data: { status: 'OVERDUE' as any },
      });

      this.logger.log(`[CRON] Marked ${result.count} invoice(s) as OVERDUE.`);
    } catch (err) {
      this.logger.error('[CRON] Overdue invoice check failed', err);
    }
  }

  /**
   * Runs every day at 02:00 AM to auto-expire stale offers.
   * Any DRAFT, APPROVED, or SENT offer past its expiryDate becomes EXPIRED.
   */
  @Cron('0 2 * * *')
  async checkExpiredOffers() {
    this.logger.log('[CRON] Running expired offer check...');

    try {
      const now = new Date();

      const result = await this.db.offer.updateMany({
        where: {
          expiryDate: { lt: now },
          status: { in: ['DRAFT', 'APPROVED', 'SENT'] as any },
        },
        data: { status: 'EXPIRED' as any },
      });

      this.logger.log(`[CRON] Expired ${result.count} offer(s).`);
    } catch (err) {
      this.logger.error('[CRON] Expired offer check failed', err);
    }
  }
}
