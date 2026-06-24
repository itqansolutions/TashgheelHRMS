import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { PaymentsService } from './payments.service';
import { ExpensesService } from './expenses.service';
import { InvoicesController } from './invoices.controller';
import { PaymentsController } from './payments.controller';
import { ExpensesController } from './expenses.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [InvoicesController, PaymentsController, ExpensesController],
  providers: [InvoicesService, PaymentsService, ExpensesService],
  exports: [InvoicesService, PaymentsService, ExpensesService],
})
export class FinanceModule {}
