'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useNotificationStore } from '../store/notifications';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

export function NotificationDropdown({ locale }: { locale: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore((state) => ({
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    markAsRead: state.markAsRead,
    markAllAsRead: state.markAllAsRead,
  }));

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#E54B4B] text-[9px] font-extrabold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-100 bg-white shadow-xl shadow-slate-200/50 ${locale === 'ar' ? 'left-0' : 'right-0'}`}>
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h3 className="font-bold text-[#1A1C29]">
              {locale === 'ar' ? 'الإشعارات' : 'Notifications'}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs font-semibold text-[#00B67A] hover:text-[#009665]"
              >
                {locale === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all read'}
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                {locale === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex flex-col gap-1 border-b border-slate-50 p-4 transition-colors ${
                      notif.isRead ? 'bg-white' : 'bg-[#F2FCF8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-[#1A1C29]">{notif.title}</span>
                        <p className="text-xs text-slate-500 line-clamp-2">{notif.message}</p>
                      </div>
                      {!notif.isRead && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="mt-0.5 shrink-0 rounded-full p-1 text-[#00B67A] hover:bg-[#00B67A]/10"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <span className="mt-1 text-[10px] font-medium text-slate-400">
                      {formatDistanceToNow(new Date(notif.createdAt), {
                        addSuffix: true,
                        locale: locale === 'ar' ? ar : enUS,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
