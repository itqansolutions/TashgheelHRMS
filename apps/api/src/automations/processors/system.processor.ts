import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { SystemTaskPayload } from '../automations.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Processor('system')
export class SystemProcessor extends WorkerHost {
  private readonly logger = new Logger(SystemProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job<SystemTaskPayload, any, string>): Promise<any> {
    this.logger.log(`Processing system task ${job.id}: ${job.data.action}`);
    
    try {
      if (job.data.action === 'CREATE_NOTIFICATION' && job.data.userId) {
        await this.notificationsService.createNotification({
          userId: job.data.userId,
          type: job.data.metadata?.type || 'SYSTEM_ALERT',
          title: job.data.metadata?.title || 'System Notification',
          message: job.data.metadata?.message || 'You have a new system alert.',
          metadata: job.data.metadata,
        });
      }

      // Handle other system actions here (e.g. DATA_SYNC, COMPLIANCE_CHECK)

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to process system task ${job.data.action}`, error.stack);
      throw error;
    }
  }
}
