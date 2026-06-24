import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateInvoiceDto, UpdateInvoiceStatusDto } from './dto/invoice.dto';
import { InvoiceStatus } from '@repo/database';

@Injectable()
export class InvoicesService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateInvoiceDto, actorId: string) {
    const subtotal = dto.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const vatAmount = (subtotal * dto.vatRate) / 100;
    const totalAmount = subtotal + vatAmount;

    // Generate Invoice Number (Mock logic - in production use a sequence or atomic counter)
    const count = await this.db.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const invoice = await this.db.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          companyId: dto.companyId,
          placementId: dto.placementId,
          invoiceNumber,
          issueDate: new Date(dto.issueDate),
          dueDate: new Date(dto.dueDate),
          subtotal,
          vatAmount,
          totalAmount,
          status: InvoiceStatus.DRAFT,
          items: {
            create: dto.items.map(i => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.quantity * i.unitPrice,
            })),
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CREATE',
          resource: 'Invoice',
          resourceId: created.id,
          afterValue: created as any,
        },
      });

      return created;
    });

    return this.findOne(invoice.id);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    status?: InvoiceStatus;
    companyId?: string;
  }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.companyId) where.companyId = query.companyId;

    const [invoices, total] = await Promise.all([
      this.db.invoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: { select: { id: true, name: true } },
          placement: {
            include: {
              application: {
                include: { candidate: { select: { firstName: true, lastName: true } } },
              },
            },
          },
        },
        orderBy: { issueDate: 'desc' },
      }),
      this.db.invoice.count({ where }),
    ]);

    return {
      invoices,
      meta: { total, page, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const invoice = await this.db.invoice.findUnique({
      where: { id },
      include: {
        company: true,
        items: true,
        payments: true,
        placement: {
          include: {
            application: {
              include: {
                candidate: true,
                jobOpening: { select: { title: true } },
              },
            },
          },
        },
      },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async updateStatus(id: string, dto: UpdateInvoiceStatusDto, actorId: string) {
    const invoice = await this.findOne(id);
    const beforeValue = { ...invoice };
    delete beforeValue.items;
    delete beforeValue.payments;
    delete beforeValue.company;
    delete beforeValue.placement;

    const updated = await this.db.invoice.update({
      where: { id },
      data: {
        status: dto.status,
        cancellationReason: dto.cancellationReason ?? null,
      },
    });

    await this.db.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE_STATUS',
        resource: 'Invoice',
        resourceId: id,
        beforeValue: beforeValue as any,
        afterValue: updated as any,
      },
    });

    return this.findOne(id);
  }
}
