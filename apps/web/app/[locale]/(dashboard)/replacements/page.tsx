'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../store/auth';
import { api } from '../../../../lib/api';
import {
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  Calendar,
} from 'lucide-react';

interface Replacement {
  id: string;
  reason: string;
  detailNotes: string | null;
  status: 'REQUESTED' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
  completedAt: string | null;
  placement: {
    id: string;
    application: {
      candidate: { firstName: string; lastName: string };
      jobOpening: { title: string; company: { name: string } };
    };
  };
  replacementCandidate: { firstName: string; lastName: string } | null;
}

export default function ReplacementsPage() {
  const t = useTranslations('ats.replacements');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const { user } = useAuthStore();

  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const limit = 20;

  const fetchReplacements = () => {
    setLoading(true);
    const paramsObj: any = { page, limit };
    if (status) paramsObj.status = status;

    api.get('/replacements', { params: paramsObj })
      .then((res) => {
        if (res.data?.success) {
          let data = res.data.replacements;
          if (search) {
            data = data.filter((r: Replacement) => 
              r.placement.application.candidate.firstName.toLowerCase().includes(search.toLowerCase()) ||
              r.placement.application.candidate.lastName.toLowerCase().includes(search.toLowerCase()) ||
              r.placement.application.jobOpening.company.name.toLowerCase().includes(search.toLowerCase())
            );
          }
          setReplacements(data);
          setTotal(res.data.meta.total);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load replacements');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReplacements();
  }, [page, status, search]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'REQUESTED': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'IN_PROGRESS': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">{t('title')}</h2>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-600">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-2">
        <div className="relative">
          <Search className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:left-3 rtl:right-3" />
          <input
            type="text"
            placeholder={locale === 'ar' ? 'بحث باسم المترشح أو الشركة...' : 'Search by candidate or company...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-100 bg-slate-50/50 py-2.5 outline-none focus:border-[#00B67A] focus:bg-white text-sm ltr:pl-9 ltr:pr-4 rtl:pr-9 rtl:pl-4 transition-all"
          />
        </div>
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 outline-none focus:border-[#00B67A] focus:bg-white text-sm text-slate-700 transition-all"
          >
            <option value="">{locale === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
            <option value="REQUESTED">{t('REQUESTED')}</option>
            <option value="IN_PROGRESS">{t('IN_PROGRESS')}</option>
            <option value="COMPLETED">{t('COMPLETED')}</option>
          </select>
          <Filter className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:right-3 rtl:left-3 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-50 bg-white/50">
          <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
        </div>
      ) : replacements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <RotateCcw className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="text-base font-bold text-[#1A1C29]">{t('noReplacements')}</h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4 rtl:text-right">Original Candidate</th>
                  <th className="px-6 py-4 rtl:text-right">Company / Position</th>
                  <th className="px-6 py-4 rtl:text-right">{t('reason')}</th>
                  <th className="px-6 py-4 rtl:text-right">Replacement</th>
                  <th className="px-6 py-4 rtl:text-right">{t('status')}</th>
                  <th className="px-6 py-4 text-right rtl:text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {replacements.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-bold text-[#1A1C29] rtl:text-right">
                      {rep.placement.application.candidate.firstName} {rep.placement.application.candidate.lastName}
                      <div className="text-xs font-normal text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {new Date(rep.createdAt).toLocaleDateString(locale)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600 rtl:text-right">
                      {rep.placement.application.jobOpening.title}
                      <div className="text-xs text-slate-400 mt-0.5">{rep.placement.application.jobOpening.company.name}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                      <span className="font-semibold">{t(rep.reason)}</span>
                      {rep.detailNotes && (
                        <div className="text-xs text-slate-400 mt-0.5 max-w-[150px] truncate" title={rep.detailNotes}>
                          {rep.detailNotes}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                      {rep.replacementCandidate ? (
                        <span className="text-emerald-600 font-medium">
                          {rep.replacementCandidate.firstName} {rep.replacementCandidate.lastName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Pending...</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 rtl:text-right">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusClass(rep.status)}`}>
                        {t(rep.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-slate-500 rtl:text-left">
                      <button
                        title="View details"
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#2A2C4E]"
                      >
                        <Eye className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
