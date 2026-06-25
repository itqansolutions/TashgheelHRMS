import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { SendEmailPayload } from '../automations.service';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    super();
    // Using Ethereal Email for local dev / testing
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.EMAIL_USER || 'ethereal.user@ethereal.email', // Replace in prod
        pass: process.env.EMAIL_PASS || 'ethereal-pass',
      },
    });
  }

  async process(job: Job<SendEmailPayload, any, string>): Promise<any> {
    this.logger.log(`Processing email job ${job.id} for ${job.data.to}`);
    
    try {
      const info = await this.transporter.sendMail({
        from: '"Tashgheel HRMS" <noreply@tashgheel.com>',
        to: job.data.to,
        subject: job.data.subject,
        text: job.data.text || 'No plain text version provided.',
        html: job.data.html || '<p>No HTML version provided.</p>',
      });

      this.logger.log(`Email sent: ${info.messageId}`);
      if (info.messageId && process.env.NODE_ENV !== 'production') {
        this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      return { success: true, messageId: info.messageId };
    } catch (error) {
      this.logger.error(`Failed to send email to ${job.data.to}`, error.stack);
      throw error;
    }
  }
}
