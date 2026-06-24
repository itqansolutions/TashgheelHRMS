import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { InviteUserDto, UpdateUserDto, CreateUserDto } from './dto/user.dto';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) {
      where.status = query.status;
    }

    const [users, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          status: true,
          createdAt: true,
          userRoles: {
            select: {
              role: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        ...u,
        roles: u.userRoles.map((ur) => ur.role),
      })),
      meta: { total, page, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const user = await this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                rolePermissions: { select: { permissionId: true } },
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      ...user,
      roles: user.userRoles.map((ur) => ur.role.name),
      permissions: [
        ...new Set(
          user.userRoles.flatMap((ur) =>
            ur.role.rolePermissions.map((rp) => rp.permissionId),
          ),
        ),
      ],
    };
  }

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.db.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const role = await this.db.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.db.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        userRoles: { create: { roleId: dto.roleId } },
      },
    });

    await this.db.auditLog.create({
      data: {
        userId: actorId,
        action: 'CREATE',
        resource: 'User',
        resourceId: user.id,
        afterValue: { email: user.email, role: role.name },
      },
    });

    return { id: user.id, email: user.email };
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.db.user.update({
      where: { id },
      data: dto,
    });

    await this.db.auditLog.create({
      data: {
        userId: actorId,
        action: 'UPDATE',
        resource: 'User',
        resourceId: id,
        beforeValue: { firstName: user.firstName, lastName: user.lastName },
        afterValue: dto as any,
      },
    });

    return { id: updated.id, email: updated.email, firstName: updated.firstName, lastName: updated.lastName };
  }

  async deactivate(id: string, actorId: string) {
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (id === actorId) throw new ForbiddenException('Cannot deactivate your own account');

    await this.db.user.update({ where: { id }, data: { status: 'DEACTIVATED' } });

    await this.db.auditLog.create({
      data: {
        userId: actorId,
        action: 'DEACTIVATE',
        resource: 'User',
        resourceId: id,
      },
    });

    return { message: 'User deactivated successfully' };
  }

  async activate(id: string, actorId: string) {
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.db.user.update({ where: { id }, data: { status: 'ACTIVE' } });

    await this.db.auditLog.create({
      data: {
        userId: actorId,
        action: 'ACTIVATE',
        resource: 'User',
        resourceId: id,
      },
    });

    return { message: 'User activated successfully' };
  }

  async getRoles() {
    return this.db.role.findMany({
      include: { rolePermissions: { select: { permissionId: true } } },
    });
  }

  async getPermissions() {
    return this.db.permission.findMany();
  }
}
