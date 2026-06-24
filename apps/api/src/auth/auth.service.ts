import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.db.user.findUnique({
      where: { email: dto.email },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: true },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    let valid = false;
    try {
      valid = await argon2.verify(user.passwordHash, dto.password);
    } catch {
      // Handle legacy SHA-256 hashes from seed (for dev only)
      const crypto = await import('crypto');
      const sha256 = crypto.createHash('sha256').update(dto.password).digest('hex');
      valid = sha256 === user.passwordHash;
    }

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permissionId),
        ),
      ),
    ];

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwt.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwt.sign(payload, { expiresIn: '7d' });

    // Log audit
    await this.db.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        resource: 'User',
        resourceId: user.id,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        roles,
        permissions,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken) as { sub: string; email: string };
      const user = await this.db.user.findUnique({
        where: { id: payload.sub, status: 'ACTIVE' },
      });
      if (!user) throw new UnauthorizedException();

      const newPayload = { sub: user.id, email: user.email };
      const accessToken = this.jwt.sign(newPayload, { expiresIn: '15m' });
      const newRefreshToken = this.jwt.sign(newPayload, { expiresIn: '7d' });

      return { accessToken, refreshToken: newRefreshToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.db.user.findUnique({ where: { email: dto.email } });
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If your email exists, a reset link has been sent.' };

    // Generate a short-lived reset token (in real system, store hash in DB and email via Resend)
    const resetToken = uuidv4();
    // TODO: Store hashed token in DB with expiry and send email via Resend
    console.log(`[DEV] Password reset token for ${dto.email}: ${resetToken}`);

    return { message: 'If your email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // TODO: Validate token from DB
    // For now return placeholder
    if (!dto.token) throw new BadRequestException('Invalid token');

    const hashedPassword = await argon2.hash(dto.password);
    // TODO: Find user by reset token and update password
    console.log('[DEV] Password would be updated with hash:', hashedPassword.slice(0, 20) + '...');

    return { message: 'Password has been reset successfully.' };
  }

  async getProfile(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: true },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permissionId),
        ),
      ),
    ];

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      createdAt: user.createdAt,
      roles,
      permissions,
    };
  }
}
