'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { Bell, BellOff, Loader2, CheckCheck, CheckCircle2 } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const params = useParams();
  const locale = params.locale as string;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchNotifications = () => {
    setIsLoading(true);
    api.get('/notifications?limit=50')
      .then((res) => {
        if (res.data?.success) {
          setNotifications(res.data.data.notifications);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await api.patch(`/notifications/${id}/read`);
      if (res.data?.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch {}
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await api.patch('/notifications/read-all');
      if (res.data?.success) {
        setSuccessMsg(locale === 'ar' ? 'تم تحديد جميع الإشعارات كمقروءة!' : 'All notifications marked as read!');
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch {}
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">
            {locale === 'ar' ? 'التنبيهات والإشعارات' : 'System Notifications'}
          </h2>
          <p className="text-sm text-slate-500">
            {locale === 'ar' ? 'متابعة آخر التحديثات والإشعارات الخاصة بالتعيينات والفوترة والمهام اليومية.' : 'Keep track of workflow updates, placement guarantees, and invoices status.'}
          </p>
        </div>
        
        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
          >
            <CheckCheck className="h-4 w-4 text-[#00B67A]" />
            <span>{locale === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all read'}</span>
          </button>
        )}
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4 text-sm text-[#00B67A]">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Notifications List */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <BellOff className="h-12 w-12 stroke-[1.5]" />
            <p className="mt-2 text-sm">{locale === 'ar' ? 'لا توجد إشعارات حالياً.' : 'No notifications yet.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                className={`flex cursor-pointer items-start gap-4 p-5 transition-colors hover:bg-slate-50/50 ${
                  !n.isRead ? 'bg-[#00B67A]/5' : ''
                }`}
              >
                <div className={`rounded-xl p-2.5 ${!n.isRead ? 'bg-[#00B67A]/15 text-[#00B67A]' : 'bg-slate-100 text-slate-400'}`}>
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between">
                    <p className={`text-sm ${!n.isRead ? 'font-bold text-[#1A1C29]' : 'text-slate-600'}`}>{n.title}</p>
                    <span className="text-[10px] text-slate-400">
                      {new Date(n.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
