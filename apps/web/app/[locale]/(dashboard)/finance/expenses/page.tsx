'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useAuthStore } from '../../../../../store/auth';
import { api } from '../../../../../lib/api';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  Calendar,
  Link as LinkIcon,
} from 'lucide-react';

interface Expense {
  id: string;
  category: 'OFFICE' | 'TRAVEL' | 'MARKETING' | 'SOFTWARE' | 'UTILITIES' | 'OTHER';
  description: string;
  amount: number;
  expenseDate: string;
  receiptUrl: string | null;
  recordedBy: { firstName: string; lastName: string };
}

export default function ExpensesPage() {
  const t = useTranslations('ats.finance.expenses');
  const params = useParams();
  const locale = params.locale as string;
  const { user } = useAuthStore();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const limit = 20;

  const fetchExpenses = () => {
    setLoading(true);
    const paramsObj: any = { page, limit };
    if (category) paramsObj.category = category;

    api.get('/finance/expenses', { params: paramsObj })
      .then((res) => {
        if (res.data?.success) {
          let data = res.data.expenses;
          if (search) {
            data = data.filter((e: Expense) => 
              e.description.toLowerCase().includes(search.toLowerCase())
            );
          }
          setExpenses(data);
          setTotal(res.data.meta.total);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load expenses');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExpenses();
  }, [page, category, search]);

  const getCategoryClass = (cat: string) => {
    switch (cat) {
      case 'SOFTWARE': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'MARKETING': return 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100';
      case 'TRAVEL': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'OFFICE': return 'bg-teal-50 text-teal-600 border-teal-100';
      case 'UTILITIES': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">{t('title')}</h2>
        </div>
        <button
          onClick={() => { /* open record modal */ }}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/25 transition-all hover:bg-[#009b67]"
        >
          <Plus className="h-5 w-5" />
          <span>{t('logExpense')}</span>
        </button>
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
            placeholder={locale === 'ar' ? 'بحث بالوصف...' : 'Search by description...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-100 bg-slate-50/50 py-2.5 outline-none focus:border-[#00B67A] focus:bg-white text-sm ltr:pl-9 ltr:pr-4 rtl:pr-9 rtl:pl-4 transition-all"
          />
        </div>
        <div className="relative">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 outline-none focus:border-[#00B67A] focus:bg-white text-sm text-slate-700 transition-all"
          >
            <option value="">{locale === 'ar' ? 'كل التصنيفات' : 'All Categories'}</option>
            <option value="OFFICE">{t('OFFICE')}</option>
            <option value="TRAVEL">{t('TRAVEL')}</option>
            <option value="MARKETING">{t('MARKETING')}</option>
            <option value="SOFTWARE">{t('SOFTWARE')}</option>
            <option value="UTILITIES">{t('UTILITIES')}</option>
            <option value="OTHER">{t('OTHER')}</option>
          </select>
          <Filter className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:right-3 rtl:left-3 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-50 bg-white/50">
          <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Wallet className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="text-base font-bold text-[#1A1C29]">{t('noExpenses')}</h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4 rtl:text-right">{t('date')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('description')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('category')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('amount')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('receipt')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-[#1A1C29] font-medium rtl:text-right">
                      {new Date(exp.expenseDate).toLocaleDateString(locale)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-[#2A2C4E] rtl:text-right">
                      <div className="font-bold">{exp.description}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Recorded by {exp.recordedBy.firstName}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 rtl:text-right">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getCategoryClass(exp.category)}`}>
                        {t(exp.category)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-bold text-rose-600 rtl:text-right">
                      {Number(exp.amount).toLocaleString()} SAR
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                      {exp.receiptUrl ? (
                        <a href={exp.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#00B67A] hover:underline">
                          <LinkIcon className="h-4 w-4" /> View
                        </a>
                      ) : (
                        '-'
                      )}
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
