'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { FileClock, Search, Loader2, RefreshCw, Eye } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  beforeValue: any;
  afterValue: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export default function AuditLogsPage() {
  const params = useParams();
  const locale = params.locale as string;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  
  // Selected log for detailed view modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = () => {
    setIsLoading(true);
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('limit', '20');
    if (searchQuery) queryParams.append('resource', searchQuery);
    if (actionFilter) queryParams.append('action', actionFilter);

    api.get(`/audit-logs?${queryParams.toString()}`)
      .then((res) => {
        if (res.data?.success) {
          setLogs(res.data.data.logs);
          setTotalPages(res.data.data.meta.pages || 1);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, [page, searchQuery, actionFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">
            {locale === 'ar' ? 'سجل العمليات (Audit Logs)' : 'Audit Logs'}
          </h2>
          <p className="text-sm text-slate-500">
            {locale === 'ar' ? 'سجل غير قابل للتعديل يوثق جميع عمليات الإضافة والحذف والتعديل في النظام.' : 'Immutable audit logs detailing all data mutation operations across your organization.'}
          </p>
        </div>
        
        <button
          onClick={fetchLogs}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4 text-slate-500" />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={locale === 'ar' ? 'تصفية حسب نوع الكيان (مثال: User, Company)...' : 'Filter by resource (e.g. User, Company)...'}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 py-2 pr-4 pl-10 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-3 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
          >
            <option value="">{locale === 'ar' ? 'جميع العمليات' : 'All Actions'}</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN">LOGIN</option>
            <option value="UPDATE_PERMISSIONS">UPDATE_PERMISSIONS</option>
            <option value="UPDATE_SETTINGS">UPDATE_SETTINGS</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Grid */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <FileClock className="h-12 w-12 stroke-[1.5]" />
            <p className="mt-2 text-sm">{locale === 'ar' ? 'لا توجد سجلات مطابقة للبحث.' : 'No audit logs found.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">{locale === 'ar' ? 'التاريخ والوقت' : 'Timestamp'}</th>
                  <th className="px-6 py-4">{locale === 'ar' ? 'المستخدم' : 'Actor'}</th>
                  <th className="px-6 py-4">{locale === 'ar' ? 'العملية' : 'Action'}</th>
                  <th className="px-6 py-4">{locale === 'ar' ? 'الكيان المستهدف' : 'Resource'}</th>
                  <th className="px-6 py-4">{locale === 'ar' ? 'الرقم التعريفي للكيان' : 'Resource ID'}</th>
                  <th className="px-6 py-4 text-center">{locale === 'ar' ? 'التفاصيل' : 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(log.createdAt).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#1A1C29]">
                      {log.user ? (
                        <div>
                          <p className="text-xs font-bold leading-tight">{log.user.firstName} {log.user.lastName}</p>
                          <p className="text-[10px] text-slate-400 leading-none">{log.user.email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">{locale === 'ar' ? 'تلقائي / النظام' : 'System / Cron'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        log.action === 'CREATE'
                          ? 'bg-green-50 text-[#00B67A]'
                          : log.action === 'DELETE'
                          ? 'bg-red-50 text-[#E54B4B]'
                          : log.action === 'LOGIN'
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'bg-amber-50 text-[#E86B13]'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{log.resource}</td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400 truncate max-w-[120px]">
                      {log.resourceId}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(log.beforeValue || log.afterValue) ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4 shadow-sm rounded-xl">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {locale === 'ar' ? 'السابق' : 'Previous'}
          </button>
          <span className="text-xs text-slate-500">
            {locale === 'ar' ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {locale === 'ar' ? 'التالي' : 'Next'}
          </button>
        </div>
      )}

      {/* Detailed Values Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedLog(null)}
          ></div>

          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <Eye className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-[#1A1C29]">
              {locale === 'ar' ? 'تفاصيل العملية والتغيرات' : 'Operation Data Mutation Details'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedLog.action} on {selectedLog.resource} (ID: {selectedLog.resourceId})
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 text-xs">
              <div className="space-y-2">
                <h4 className="font-extrabold uppercase tracking-wider text-slate-500">
                  {locale === 'ar' ? 'القيمة السابقة' : 'Before Value'}
                </h4>
                <pre className="overflow-auto rounded-lg bg-slate-50 p-4 font-mono leading-relaxed max-h-60 border">
                  {selectedLog.beforeValue ? JSON.stringify(selectedLog.beforeValue, null, 2) : 'null'}
                </pre>
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold uppercase tracking-wider text-slate-500">
                  {locale === 'ar' ? 'القيمة اللاحقة' : 'After Value'}
                </h4>
                <pre className="overflow-auto rounded-lg bg-slate-50 p-4 font-mono leading-relaxed max-h-60 border">
                  {selectedLog.afterValue ? JSON.stringify(selectedLog.afterValue, null, 2) : 'null'}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                {locale === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
