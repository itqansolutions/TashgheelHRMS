import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { InvoiceStatus } from '@repo/database';

@Injectable()
export class PaymentsService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreatePaymentDto, actorId: string) {
    const invoice = await this.db.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { payments: true },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === InvoiceStatus.PAID) throw new BadRequestException('Invoice is already fully paid');
    if (invoice.status === InvoiceStatus.CANCELLED) throw new BadRequestException('Cannot pay a cancelled invoice');

    const amountPaidSoFar = invoice.payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const newAmountPaid = amountPaidSoFar + dto.amount;
    
    if (newAmountPaid > Number(invoice.totalAmount)) {
      throw new BadRequestException('Payment amount exceeds invoice total amount');
    }

    const payment = await this.db.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          invoiceId: dto.invoiceId,
          amount: dto.amount,
          paymentDate: new Date(dto.paymentDate),
          paymentMethod: dto.paymentMethod,
          referenceNumber: dto.referenceNumber,
        },
      });

      // Update invoice status
      let newStatus = invoice.status;
      if (newAmountPaid === Number(invoice.totalAmount)) {
        newStatus = InvoiceStatus.PAID;
      } else if (newAmountPaid > 0) {
        newStatus = InvoiceStatus.PARTIALLY_PAID;
      }

      if (newStatus !== invoice.status) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: newStatus },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CREATE',
          resource: 'Payment',
          resourceId: created.id,
          afterValue: created as any,
        },
      });

      return created;
    });

    return payment;
  }

  async findAll(query: { page?: number; limit?: number; invoiceId?: string }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.invoiceId) where.invoiceId = query.invoiceId;

    const [payments, total] = await Promise.all([
      this.db.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          invoice: { select: { invoiceNumber: true, totalAmount: true } },
        },
        orderBy: { paymentDate: 'desc' },
      }),
      this.db.payment.count({ where }),
    ]);

    return {
      payments,
      meta: { total, page, pages: Math.ceil(total / limit) },
    };
  }
}
