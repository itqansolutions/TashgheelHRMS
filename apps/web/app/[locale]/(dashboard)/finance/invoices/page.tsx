'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../../store/auth';
import { api } from '../../../../../lib/api';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  Download,
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  company: { name: string };
}

export default function InvoicesPage() {
  const t = useTranslations('ats.finance.invoices');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const { user } = useAuthStore();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const limit = 20;

  const fetchInvoices = () => {
    setLoading(true);
    const paramsObj: any = { page, limit };
    if (status) paramsObj.status = status;

    api.get('/finance/invoices', { params: paramsObj })
      .then((res) => {
        if (res.data?.success) {
          let data = res.data.invoices;
          if (search) {
            data = data.filter((inv: Invoice) => 
              inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
              inv.company.name.toLowerCase().includes(search.toLowerCase())
            );
          }
          setInvoices(data);
          setTotal(res.data.meta.total);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load invoices');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, status, search]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'PARTIALLY_PAID': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'OVERDUE': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'CANCELLED': return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'SENT': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
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
          onClick={() => { /* open create modal */ }}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/25 transition-all hover:bg-[#009b67]"
        >
          <Plus className="h-5 w-5" />
          <span>{t('create')}</span>
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
            placeholder={locale === 'ar' ? 'بحث برقم الفاتورة أو الشركة...' : 'Search by invoice number or company...'}
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
            <option value="DRAFT">{t('DRAFT')}</option>
            <option value="SENT">{t('SENT')}</option>
            <option value="PARTIALLY_PAID">{t('PARTIALLY_PAID')}</option>
            <option value="PAID">{t('PAID')}</option>
            <option value="OVERDUE">{t('OVERDUE')}</option>
            <option value="CANCELLED">{t('CANCELLED')}</option>
          </select>
          <Filter className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:right-3 rtl:left-3 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-50 bg-white/50">
          <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <FileText className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="text-base font-bold text-[#1A1C29]">{t('noInvoices')}</h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4 rtl:text-right">{t('invoiceNumber')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('company')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('amount')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('dueDate')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('status')}</th>
                  <th className="px-6 py-4 text-right rtl:text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-bold text-[#2A2C4E] rtl:text-right">
                      {inv.invoiceNumber}
                      <div className="text-xs font-normal text-slate-400 mt-0.5">
                        {new Date(inv.issueDate).toLocaleDateString(locale)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600 rtl:text-right">
                      {inv.company.name}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-emerald-600 rtl:text-right">
                      {Number(inv.totalAmount).toLocaleString()} SAR
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                      {new Date(inv.dueDate).toLocaleDateString(locale)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 rtl:text-right">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusClass(inv.status)}`}>
                        {t(inv.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-slate-500 rtl:text-left">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          title="Download PDF"
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#00B67A]"
                        >
                          <Download className="h-4.5 w-4.5" />
                        </button>
                        <button
                          title="View details"
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#2A2C4E]"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </button>
                      </div>
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
