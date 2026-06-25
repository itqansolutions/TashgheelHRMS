import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Injectable()
export class ContractsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storageService: StorageService,
  ) {}

  async create(dto: CreateContractDto, file: Express.Multer.File, actorId: string) {
    if (!file) {
      throw new Error('Contract file upload is required');
    }

    const company = await this.db.company.findFirst({
      where: { id: dto.companyId, deletedAt: null },
    });
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Check unique contract number
    const existing = await this.db.contract.findUnique({
      where: { contractNumber: dto.contractNumber },
    });
    if (existing) {
      throw new ConflictException('A contract with this contract number already exists');
    }

    // Upload the file
    const uploadResult = await this.storageService.uploadFile(file, 'contracts');

    return this.db.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: {
          companyId: dto.companyId,
          contractNumber: dto.contractNumber,
          fileUrl: uploadResult.url,
          startDate: dto.startDate,
          endDate: dto.endDate,
          status: dto.status ?? 'DRAFT',
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CREATE',
          resource: 'Contract',
          resourceId: contract.id,
          afterValue: contract as any,
        },
      });

      return contract;
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    companyId?: string;
    status?: string;
  }) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [contracts, total] = await Promise.all([
      this.db.contract.findMany({
        where,
        skip,
        take: limit,
        include: {
          company: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.contract.count({ where }),
    ]);

    return {
      contracts,
      meta: { total, page, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const contract = await this.db.contract.findUnique({
      where: { id },
      include: {
        company: {
          select: { id: true, name: true },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  async update(id: string, dto: UpdateContractDto, file: Express.Multer.File | undefined, actorId: string) {
    const contract = await this.findOne(id);

    if (dto.contractNumber && dto.contractNumber !== contract.contractNumber) {
      const existing = await this.db.contract.findFirst({
        where: { contractNumber: dto.contractNumber, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('A contract with this contract number already exists');
      }
    }

    let fileUrl = contract.fileUrl;
    let oldFileKeyToCleanup: string | null = null;

    if (file) {
      const uploadResult = await this.storageService.uploadFile(file, 'contracts');
      fileUrl = uploadResult.url;

      // Extract key from old URL if it was R2 or local
      const urlParts = contract.fileUrl.split('/storage/file/');
      if (urlParts.length > 1) {
        oldFileKeyToCleanup = urlParts[1];
      } else {
        const r2Parts = contract.fileUrl.split('.com/');
        if (r2Parts.length > 1) {
          oldFileKeyToCleanup = r2Parts[1].substring(r2Parts[1].indexOf('/') + 1);
        }
      }
    }

    return this.db.$transaction(async (tx) => {
      const updated = await tx.contract.update({
        where: { id },
        data: {
          contractNumber: dto.contractNumber,
          startDate: dto.startDate,
          endDate: dto.endDate,
          status: dto.status,
          fileUrl,
        },
      });

      if (oldFileKeyToCleanup) {
        await this.storageService.deleteFile(oldFileKeyToCleanup);
      }

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'UPDATE',
          resource: 'Contract',
          resourceId: id,
          beforeValue: contract as any,
          afterValue: updated as any,
        },
      });

      return updated;
    });
  }

  async remove(id: string, actorId: string) {
    const contract = await this.findOne(id);

    let oldFileKeyToCleanup: string | null = null;
    const urlParts = contract.fileUrl.split('/storage/file/');
    if (urlParts.length > 1) {
      oldFileKeyToCleanup = urlParts[1];
    } else {
      const r2Parts = contract.fileUrl.split('.com/');
      if (r2Parts.length > 1) {
        oldFileKeyToCleanup = r2Parts[1].substring(r2Parts[1].indexOf('/') + 1);
      }
    }

    return this.db.$transaction(async (tx) => {
      await tx.contract.delete({
        where: { id },
      });

      if (oldFileKeyToCleanup) {
        await this.storageService.deleteFile(oldFileKeyToCleanup);
      }

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'DELETE',
          resource: 'Contract',
          resourceId: id,
          beforeValue: contract as any,
        },
      });

      return { success: true };
    });
  }
}
