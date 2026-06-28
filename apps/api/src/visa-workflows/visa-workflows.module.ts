import { Module } from '@nestjs/common';
import { VisaWorkflowsService } from './visa-workflows.service';
import { VisaWorkflowsController } from './visa-workflows.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [VisaWorkflowsController],
  providers: [VisaWorkflowsService],
})
export class VisaWorkflowsModule {}
