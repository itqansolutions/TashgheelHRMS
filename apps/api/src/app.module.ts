import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { RolesModule } from './roles/roles.module';
import { SettingsModule } from './settings/settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StorageModule } from './storage/storage.module';
import { CompaniesModule } from './companies/companies.module';
import { ContactsModule } from './contacts/contacts.module';
import { ContractsModule } from './contracts/contracts.module';
import { BranchesModule } from './branches/branches.module';
import { ActivitiesModule } from './activities/activities.module';
import { JobsModule } from './jobs/jobs.module';
import { CandidatesModule } from './candidates/candidates.module';
import { ApplicationsModule } from './applications/applications.module';
import { InterviewsModule } from './interviews/interviews.module';
import { OffersModule } from './offers/offers.module';
import { PlacementsModule } from './placements/placements.module';
import { ReplacementsModule } from './replacements/replacements.module';
import { FinanceModule } from './finance/finance.module';
import { AiModule } from './ai/ai.module';
import { ReportsModule } from './reports/reports.module';

import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { AutomationsModule } from './automations/automations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'email',
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: 'system',
      adapter: BullMQAdapter,
    }),
    AuthModule,
    UsersModule,
    AuditModule,
    RolesModule,
    SettingsModule,
    NotificationsModule,
    AutomationsModule,
    StorageModule,
    CompaniesModule,
    ContactsModule,
    ContractsModule,
    BranchesModule,
    ActivitiesModule,
    JobsModule,
    CandidatesModule,
    ApplicationsModule,
    InterviewsModule,
    OffersModule,
    PlacementsModule,
    ReplacementsModule,
    FinanceModule,
    AiModule,
    ReportsModule,
  ],
})
export class AppModule {}


