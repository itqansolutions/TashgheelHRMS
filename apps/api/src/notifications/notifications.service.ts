import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsGateway } from './notifications.gateway';

export interface CreateNotificationDto {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async createNotification(dto: CreateNotificationDto) {
    // Check preferences
    const prefs = await this.db.notificationPreference.findUnique({
      where: { userId: dto.userId },
    });

    if (prefs && !prefs.inAppEnabled) {
      return null;
    }

    const notification = await this.db.systemNotification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        metadata: dto.metadata || {},
      },
    });

    // Push via websocket
    this.gateway.sendNotificationToUser(dto.userId, notification);

    return notification;
  }

  async getNotifications(userId: string) {
    return this.db.systemNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    return this.db.systemNotification.count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.db.systemNotification.update({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.db.systemNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getPreferences(userId: string) {
    let prefs = await this.db.notificationPreference.findUnique({
      where: { userId },
    });
    if (!prefs) {
      prefs = await this.db.notificationPreference.create({
        data: { userId },
      });
    }
    return prefs;
  }

  async updatePreferences(userId: string, data: { inAppEnabled?: boolean; emailEnabled?: boolean }) {
    return this.db.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
  }
}
