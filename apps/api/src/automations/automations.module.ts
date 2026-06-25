import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AutomationsService } from './automations.service';
import { EmailProcessor } from './processors/email.processor';
import { SystemProcessor } from './processors/system.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [
    DatabaseModule,
    NotificationsModule,
    BullModule.registerQueue({
      name: 'email',
    }),
    BullModule.registerQueue({
      name: 'system',
    }),
  ],
  providers: [AutomationsService, EmailProcessor, SystemProcessor],
  exports: [AutomationsService],
})
export class AutomationsModule {}
