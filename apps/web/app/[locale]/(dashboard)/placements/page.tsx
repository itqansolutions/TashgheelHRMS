'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../store/auth';
import { api } from '../../../../lib/api';
import {
  Briefcase,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface Placement {
  id: string;
  startDate: string;
  feeAmount: number;
  feeType: string;
  guaranteeDays: number;
  guaranteeEndDate: string;
  guaranteeStatus: 'ACTIVE' | 'EXPIRED' | 'CLAIMED';
  status: 'GUARANTEE_PERIOD' | 'PROBATION_PERIOD' | 'COMPLETED' | 'REPLACED';
  application: {
    candidate: { firstName: string; lastName: string };
    jobOpening: { title: string; company: { name: string } };
  };
}

export default function PlacementsPage() {
  const t = useTranslations('ats.placements');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const { user } = useAuthStore();

  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const limit = 20;

  const fetchPlacements = () => {
    setLoading(true);
    const paramsObj: any = { page, limit };
    if (status) paramsObj.status = status;

    api.get('/placements', { params: paramsObj })
      .then((res) => {
        if (res.data?.success) {
          let data = res.data.placements;
          if (search) {
            data = data.filter((p: Placement) => 
              p.application.candidate.firstName.toLowerCase().includes(search.toLowerCase()) ||
              p.application.candidate.lastName.toLowerCase().includes(search.toLowerCase()) ||
              p.application.jobOpening.company.name.toLowerCase().includes(search.toLowerCase())
            );
          }
          setPlacements(data);
          setTotal(res.data.meta.total);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load placements');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlacements();
  }, [page, status, search]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'GUARANTEE_PERIOD': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'PROBATION_PERIOD': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'REPLACED': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const getGuaranteeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-emerald-600 bg-emerald-50';
      case 'EXPIRED': return 'text-slate-500 bg-slate-100';
      case 'CLAIMED': return 'text-rose-600 bg-rose-50';
      default: return 'text-slate-500 bg-slate-50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">{t('title')}</h2>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-600">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
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
            placeholder={locale === 'ar' ? 'بحث باسم المترشح...' : 'Search by candidate...'}
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
            <option value="GUARANTEE_PERIOD">{t('GUARANTEE_PERIOD')}</option>
            <option value="PROBATION_PERIOD">{t('PROBATION_PERIOD')}</option>
            <option value="COMPLETED">{t('COMPLETED')}</option>
            <option value="REPLACED">{t('REPLACED')}</option>
          </select>
          <Filter className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:right-3 rtl:left-3 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-50 bg-white/50">
          <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
        </div>
      ) : placements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Briefcase className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="text-base font-bold text-[#1A1C29]">{t('noPlacements')}</h3>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {placements.map((plc) => (
            <div key={plc.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="border-b border-slate-50 p-5">
                <div className="flex items-start justify-between mb-4">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusClass(plc.status)}`}>
                    {t(plc.status)}
                  </span>
                  <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${getGuaranteeClass(plc.guaranteeStatus)}`}>
                    {t('guaranteeStatus')}: {t(plc.guaranteeStatus)}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-[#1A1C29] mb-1">
                  {plc.application.candidate.firstName} {plc.application.candidate.lastName}
                </h4>
                <p className="text-sm font-medium text-[#00B67A]">
                  {plc.application.jobOpening.title}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {plc.application.jobOpening.company.name}
                </p>
              </div>
              <div className="flex-1 bg-slate-50/50 p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t('startDate')}</span>
                  <span className="font-medium text-[#1A1C29]">
                    {new Date(plc.startDate).toLocaleDateString(locale)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t('feeAmount')}</span>
                  <span className="font-medium text-[#1A1C29]">
                    {Number(plc.feeAmount).toLocaleString()} ({plc.feeType})
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t('guaranteeEndDate')}</span>
                  <span className="font-medium text-[#1A1C29]">
                    {new Date(plc.guaranteeEndDate).toLocaleDateString(locale)}
                  </span>
                </div>
              </div>
              <div className="border-t border-slate-100 p-4 bg-white flex justify-end gap-2">
                 {plc.guaranteeStatus === 'ACTIVE' && (
                   <button className="flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-lg transition-colors">
                     <RotateCcw className="h-4 w-4" />
                     {t('requestReplacement')}
                   </button>
                 )}
                 <button className="text-xs font-bold text-[#2A2C4E] bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors">
                   <Eye className="h-4 w-4" />
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
