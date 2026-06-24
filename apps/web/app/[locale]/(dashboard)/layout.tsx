'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/auth';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  GitPullRequest,
  Calendar,
  FileSpreadsheet,
  Coins,
  Settings,
  ShieldCheck,
  FileClock,
  Menu,
  X,
  Globe,
  Bell,
  LogOut,
  ChevronDown,
  User as UserIcon,
} from 'lucide-react';
import { api } from '../../../lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const pathname = usePathname();
  const t = useTranslations('nav');

  const { user, isLoading, isAuthenticated, fetchProfile, logout } = useAuthStore();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    fetchProfile().then((profile) => {
      if (!profile) {
        router.replace(`/${locale}/login`);
      }
    });

    // Fetch unread notification count
    api.get('/notifications/unread-count')
      .then((res) => {
        if (res.data?.success) {
          setUnreadNotifications(res.data.data.count);
        }
      })
      .catch(() => {});
  }, [fetchProfile, router, locale]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F7FB]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00B67A] border-t-transparent"></div>
          <p className="text-sm font-semibold text-slate-500">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const toggleLanguage = () => {
    const nextLocale = locale === 'en' ? 'ar' : 'en';
    const nextPath = pathname.replace(/^\/(en|ar)/, `/${nextLocale}`);
    router.push(nextPath);
  };

  const handleLogout = () => {
    logout();
    router.replace(`/${locale}/login`);
  };

  const navItems = [
    { name: t('dashboard'), href: `/${locale}/dashboard`, icon: LayoutDashboard },
    { name: t('companies'), href: `/${locale}/companies`, icon: Building2 },
    { name: t('contacts'), href: `/${locale}/contacts`, icon: Users },
    { name: t('jobs'), href: `/${locale}/jobs`, icon: Briefcase },
    { name: t('candidates'), href: `/${locale}/candidates`, icon: Users },
    { name: t('pipeline'), href: `/${locale}/pipeline`, icon: GitPullRequest },
    { name: t('interviews'), href: `/${locale}/interviews`, icon: Calendar },
    { name: t('offers'), href: `/${locale}/offers`, icon: FileSpreadsheet },
    { name: t('placements'), href: `/${locale}/placements`, icon: ShieldCheck },
    { name: t('finance'), href: `/${locale}/finance`, icon: Coins },
    { name: t('users'), href: `/${locale}/users`, icon: Users, permission: 'users:read' },
    { name: t('roles'), href: `/${locale}/roles`, icon: ShieldCheck, permission: 'users:read' },
    { name: t('settings'), href: `/${locale}/settings`, icon: Settings, permission: 'settings:read' },
    { name: t('auditLogs'), href: `/${locale}/audit-logs`, icon: FileClock, permission: 'audit_logs:read' },
  ];

  // Filter items based on user permissions
  const filteredNavItems = navItems.filter((item) => {
    if (!item.permission) return true;
    return user.permissions.includes(item.permission);
  });

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between bg-[#2A2C4E] text-white">
      <div>
        {/* Sidebar Header */}
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#00B67A] font-bold text-white shadow-md shadow-[#00B67A]/20">
            T
          </div>
          <span className="text-lg font-bold tracking-wider">Tashgheel HRMS</span>
        </div>

        {/* Sidebar Navigation */}
        <nav className="space-y-1 px-3 py-4">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#00B67A] text-white shadow-lg shadow-[#00B67A]/20'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Info footer in Sidebar */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00B67A] font-bold text-white">
            {user.firstName[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.firstName} {user.lastName}</p>
            <p className="truncate text-xs text-slate-400">{user.roles[0]}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          ></div>

          {/* Drawer content */}
          <div className="relative flex w-64 max-w-xs flex-col bg-[#2A2C4E]">
            {/* Close button */}
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-300 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main layout area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          {/* Left section: menu toggle on mobile */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="text-slate-600 hover:text-slate-800 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="hidden text-lg font-bold text-[#1A1C29] md:block">
              {locale === 'ar' ? 'نظام تشغيل التوظيف والتعيين' : 'Workspace'}
            </h1>
          </div>

          {/* Right section: actions */}
          <div className="flex items-center gap-4">
            {/* Language switch */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{locale === 'en' ? 'العربية' : 'English'}</span>
            </button>

            {/* Notification bell */}
            <Link
              href={`/${locale}/notifications`}
              className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#E54B4B] text-[9px] font-extrabold text-white">
                  {unreadNotifications}
                </span>
              )}
            </Link>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 rounded-lg p-1.5 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00B67A] font-bold text-white shadow-sm shadow-[#00B67A]/25">
                  {user.firstName[0]}
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-xs font-bold leading-none">{user.firstName}</p>
                  <p className="mt-0.5 text-[10px] leading-none text-slate-400">{user.roles[0]}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {isProfileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsProfileMenuOpen(false)}
                  ></div>
                  <div className={`absolute z-20 mt-2 w-48 rounded-xl border border-slate-100 bg-white p-1 shadow-xl shadow-slate-100 ${locale === 'ar' ? 'left-0' : 'right-0'}`}>
                    <div className="border-b border-slate-100 px-3 py-2 text-xs">
                      <p className="font-bold text-[#1A1C29]">{user.firstName} {user.lastName}</p>
                      <p className="mt-0.5 text-slate-400">{user.email}</p>
                    </div>

                    <Link
                      href={`/${locale}/settings`}
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <UserIcon className="h-4 w-4 text-slate-400" />
                      <span>{locale === 'ar' ? 'الملف الشخصي' : 'My Profile'}</span>
                    </Link>

                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#E54B4B] hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 text-[#E54B4B]" />
                      <span>{t('logout') || (locale === 'ar' ? 'تسجيل خروج' : 'Logout')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[#F5F7FB] p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
