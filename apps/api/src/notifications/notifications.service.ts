import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async findAllForUser(userId: string, query: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      this.db.systemNotification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.systemNotification.count({ where }),
    ]);

    return {
      notifications,
      meta: {
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: any;
  }) {
    const notification = await this.db.systemNotification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata ?? {},
      },
    });

    // Real-time push via Socket.IO
    this.gateway.sendToUser(data.userId, 'notification', notification);

    return notification;
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.db.systemNotification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.db.systemNotification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.db.systemNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { success: true, message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string) {
    const count = await this.db.systemNotification.count({
      where: { userId, isRead: false },
    });

    return { count };
  }
}
