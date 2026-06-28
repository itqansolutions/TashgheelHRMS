import { Module } from '@nestjs/common';
import { VisaCasesService } from './visa-cases.service';
import { VisaCasesController } from './visa-cases.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [VisaCasesController],
  providers: [VisaCasesService],
})
export class VisaCasesModule {}
