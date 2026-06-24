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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    AuditModule,
    RolesModule,
    SettingsModule,
    NotificationsModule,
    StorageModule,
    CompaniesModule,
    ContactsModule,
    ContractsModule,
    BranchesModule,
    ActivitiesModule,
    JobsModule,
    CandidatesModule,
    ApplicationsModule,
  ],
})
export class AppModule {}


