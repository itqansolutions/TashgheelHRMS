import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@Injectable()
export class RolesService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const roles = await this.db.role.findMany({
      include: {
        rolePermissions: {
          select: {
            permissionId: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      permissions: role.rolePermissions.map((rp) => rp.permissionId),
    }));
  }

  async findOne(id: string) {
    const role = await this.db.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          select: {
            permissionId: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      permissions: role.rolePermissions.map((rp) => rp.permissionId),
    };
  }

  async updatePermissions(id: string, dto: UpdateRolePermissionsDto, actorId: string) {
    const role = await this.db.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Validate that all permissions exist
    const permissionsCount = await this.db.permission.count({
      where: {
        id: { in: dto.permissionIds },
      },
    });

    if (permissionsCount !== dto.permissionIds.length) {
      throw new NotFoundException('One or more permissions do not exist');
    }

    // Get current permissions for audit log
    const currentPermissions = await this.db.rolePermission.findMany({
      where: { roleId: id },
      select: { permissionId: true },
    });
    const beforePermissions = currentPermissions.map((cp) => cp.permissionId);

    // Update in transaction
    await this.db.$transaction(async (tx) => {
      // 1. Delete all existing permissions for this role
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // 2. Create the new permission associations
      if (dto.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: dto.permissionIds.map((permId) => ({
            roleId: id,
            permissionId: permId,
          })),
        });
      }

      // 3. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'UPDATE_PERMISSIONS',
          resource: 'Role',
          resourceId: id,
          beforeValue: { permissions: beforePermissions },
          afterValue: { permissions: dto.permissionIds },
        },
      });
    });

    return { success: true, message: 'Permissions updated successfully' };
  }

  async listPermissions() {
    return this.db.permission.findMany({
      orderBy: { id: 'asc' },
    });
  }
}
