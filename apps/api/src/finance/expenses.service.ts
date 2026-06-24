import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/expense.dto';
import { ExpenseCategory } from '@repo/database';

@Injectable()
export class ExpensesService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateExpenseDto, actorId: string) {
    const expense = await this.db.expense.create({
      data: {
        category: dto.category,
        description: dto.description,
        amount: dto.amount,
        expenseDate: new Date(dto.expenseDate),
        receiptUrl: dto.receiptUrl,
        recordedById: actorId,
      },
    });

    await this.db.auditLog.create({
      data: {
        userId: actorId,
        action: 'CREATE',
        resource: 'Expense',
        resourceId: expense.id,
        afterValue: expense as any,
      },
    });

    return expense;
  }

  async findAll(query: { page?: number; limit?: number; category?: ExpenseCategory }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.category) where.category = query.category;

    const [expenses, total] = await Promise.all([
      this.db.expense.findMany({
        where,
        skip,
        take: limit,
        include: {
          recordedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { expenseDate: 'desc' },
      }),
      this.db.expense.count({ where }),
    ]);

    return {
      expenses,
      meta: { total, page, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const expense = await this.db.expense.findUnique({
      where: { id },
      include: {
        recordedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async update(id: string, dto: UpdateExpenseDto, actorId: string) {
    const expense = await this.findOne(id);
    const beforeValue = { ...expense };
    delete beforeValue.recordedBy;

    const updated = await this.db.expense.update({
      where: { id },
      data: dto,
    });

    await this.db.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE',
        resource: 'Expense',
        resourceId: id,
        beforeValue: beforeValue as any,
        afterValue: updated as any,
      },
    });

    return this.findOne(id);
  }
}
