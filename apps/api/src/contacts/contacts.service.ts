import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly db: DatabaseService) {}

  private async ensureOnlyOnePrimary(tx: any, companyId: string, contactIdToExclude?: string) {
    await tx.contact.updateMany({
      where: {
        companyId,
        isPrimary: true,
        ...(contactIdToExclude ? { NOT: { id: contactIdToExclude } } : {}),
      },
      data: { isPrimary: false },
    });
  }

  async create(dto: CreateContactDto, actorId: string) {
    // Verify company exists
    const company = await this.db.company.findFirst({
      where: { id: dto.companyId, deletedAt: null },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return this.db.$transaction(async (tx) => {
      const contact = await tx.contact.create({
        data: dto,
      });

      if (dto.isPrimary) {
        await this.ensureOnlyOnePrimary(tx, dto.companyId, contact.id);
      }

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CREATE',
          resource: 'Contact',
          resourceId: contact.id,
          afterValue: contact as any,
        },
      });

      return contact;
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    companyId?: string;
  }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [contacts, total] = await Promise.all([
      this.db.contact.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: {
            select: { id: true, name: true },
          },
        },
        orderBy: { firstName: 'asc' },
      }),
      this.db.contact.count({ where }),
    ]);

    return {
      contacts,
      meta: { total, page, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const contact = await this.db.contact.findUnique({
      where: { id },
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  async update(id: string, dto: UpdateContactDto, actorId: string) {
    const contact = await this.findOne(id);

    return this.db.$transaction(async (tx) => {
      const updated = await tx.contact.update({
        where: { id },
        data: dto,
      });

      if (dto.isPrimary) {
        await this.ensureOnlyOnePrimary(tx, updated.companyId, id);
      }

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'UPDATE',
          resource: 'Contact',
          resourceId: id,
          beforeValue: contact as any,
          afterValue: updated as any,
        },
      });

      return updated;
    });
  }

  async remove(id: string, actorId: string) {
    const contact = await this.findOne(id);

    return this.db.$transaction(async (tx) => {
      await tx.contact.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'DELETE',
          resource: 'Contact',
          resourceId: id,
          beforeValue: contact as any,
        },
      });

      return { success: true };
    });
  }
}
