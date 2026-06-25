import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface SendEmailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SystemTaskPayload {
  action: string;
  userId?: string;
  metadata?: any;
}

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
    @InjectQueue('system') private readonly systemQueue: Queue,
  ) {}

  async sendEmail(payload: SendEmailPayload) {
    this.logger.log(`Queueing email to ${payload.to}`);
    await this.emailQueue.add('send-email', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }

  async scheduleInterviewEmail(candidateEmail: string, candidateName: string, date: string) {
    await this.sendEmail({
      to: candidateEmail,
      subject: 'Interview Scheduled - Tashgheel',
      html: `
        <h3>Hello ${candidateName},</h3>
        <p>Your interview has been scheduled for <strong>${date}</strong>.</p>
        <p>Please let us know if you have any questions.</p>
      `,
    });
  }

  async sendOfferEmail(candidateEmail: string, candidateName: string, jobTitle: string) {
    await this.sendEmail({
      to: candidateEmail,
      subject: `Job Offer: ${jobTitle} - Tashgheel`,
      html: `
        <h3>Congratulations ${candidateName}!</h3>
        <p>We are thrilled to offer you the position of <strong>${jobTitle}</strong>.</p>
        <p>Please review the attached offer letter and let us know your decision.</p>
      `,
    });
  }

  async queueSystemTask(payload: SystemTaskPayload) {
    await this.systemQueue.add('system-task', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }
}
