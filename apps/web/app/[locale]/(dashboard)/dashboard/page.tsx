'use client';

import { useAuthStore } from '../../../../store/auth';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Briefcase, Users, Calendar, Receipt, Plus, ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../../../lib/api';

export default function DashboardPage() {
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const { user } = useAuthStore();
  const t = useTranslations('nav');

  const [dashboardData, setDashboardData] = useState({
    totalJobs: 0,
    totalCandidates: 0,
    upcomingInterviews: 0,
    pendingInvoices: 0,
    activePipeline: 0,
    totalPlacements: 0,
    totalRevenue: 0,
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/reports/dashboard');
        setDashboardData(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const stats = [
    { name: locale === 'ar' ? 'الوظائف النشطة' : 'Active Jobs', value: dashboardData.totalJobs.toString(), icon: Briefcase, color: 'bg-indigo-50 text-indigo-600 border-indigo-100', trend: 'Live' },
    { name: locale === 'ar' ? 'المترشحين' : 'Total Candidates', value: dashboardData.totalCandidates.toString(), icon: Users, color: 'bg-emerald-50 text-emerald-600 border-emerald-100', trend: 'Talent Pool' },
    { name: locale === 'ar' ? 'المقابلات القادمة' : 'Upcoming Interviews', value: dashboardData.upcomingInterviews.toString(), icon: Calendar, color: 'bg-amber-50 text-amber-600 border-amber-100', trend: 'Scheduled' },
    { name: locale === 'ar' ? 'الفواتير المستحقة' : 'Pending Invoices', value: dashboardData.pendingInvoices.toString(), icon: Receipt, color: 'bg-rose-50 text-rose-600 border-rose-100', trend: 'Unpaid' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#2A2C4E] p-6 text-white shadow-xl shadow-slate-100 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,182,122,0.15),transparent_40%)]"></div>
        <div className="relative z-10 max-w-2xl space-y-2">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {locale === 'ar' ? `مرحباً بك، ${user?.firstName} 👋` : `Welcome back, ${user?.firstName} 👋`}
          </h2>
          <p className="text-sm text-slate-300 md:text-base">
            {locale === 'ar'
              ? `لديك ${dashboardData.upcomingInterviews} مقابلة قادمة و ${dashboardData.pendingInvoices} فواتير قيد الانتظار. ها هو ملخص التوظيف الحالي الخاص بشركتك.`
              : `You have ${dashboardData.upcomingInterviews} upcoming interviews and ${dashboardData.pendingInvoices} pending invoices. Here is a summary of your workspace activities.`}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="group relative overflow-hidden rounded-xl border border-slate-100 bg-white p-6 shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-100"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">{stat.name}</span>
                <div className={`rounded-lg border p-2.5 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-[#1A1C29] tracking-tight">
                  {isLoading ? '...' : stat.value}
                </span>
                <span className="text-xs font-semibold text-slate-400">{stat.trend}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions & Recent Activities */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left/Main Column: Welcome & Quick Access */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#1A1C29]">
              {locale === 'ar' ? 'الوصول السريع' : 'Quick Actions'}
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <button 
                onClick={() => router.push(`/${locale}/jobs`)}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 p-4 text-center hover:border-[#00B67A] hover:bg-slate-50 transition-all"
              >
                <div className="rounded-full bg-[#00B67A]/10 p-2.5 text-[#00B67A]">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-700">
                  {locale === 'ar' ? 'إدارة الوظائف' : 'Manage Jobs'}
                </span>
              </button>

              <button 
                onClick={() => router.push(`/${locale}/candidates/new`)}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 p-4 text-center hover:border-[#00B67A] hover:bg-slate-50 transition-all"
              >
                <div className="rounded-full bg-[#00B67A]/10 p-2.5 text-[#00B67A]">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-700">
                  {locale === 'ar' ? 'إضافة مترشح' : 'Add Candidate'}
                </span>
              </button>

              <button 
                onClick={() => router.push(`/${locale}/users`)}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 p-4 text-center hover:border-[#00B67A] hover:bg-slate-50 transition-all"
              >
                <div className="rounded-full bg-[#00B67A]/10 p-2.5 text-[#00B67A]">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-slate-700">
                  {locale === 'ar' ? 'دعوة مستخدم' : 'Invite Recruiter'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Pending approvals / Quick Status */}
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#1A1C29]">
            {locale === 'ar' ? 'أداء النظام' : 'System Performance'}
          </h3>
          <div className="mt-4 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-50 pb-3">
              <div>
                <p className="text-xs font-bold text-[#1A1C29]">Active Pipeline</p>
                <p className="text-[10px] text-slate-400">Total ongoing applications</p>
              </div>
              <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600">
                {isLoading ? '...' : dashboardData.activePipeline}
              </span>
            </div>
            <div className="flex items-start justify-between border-b border-slate-50 pb-3">
              <div>
                <p className="text-xs font-bold text-[#1A1C29]">Total Placements</p>
                <p className="text-[10px] text-slate-400">Successful hires</p>
              </div>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                {isLoading ? '...' : dashboardData.totalPlacements}
              </span>
            </div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-[#1A1C29]">Total Revenue</p>
                <p className="text-[10px] text-slate-400">From finalized invoices</p>
              </div>
              <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600">
                ${isLoading ? '...' : dashboardData.totalRevenue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
