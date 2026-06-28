'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../../store/auth';
import { api } from '../../../../../lib/api';
import {
  CreditCard,
  Plus,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'BANK_TRANSFER' | 'CHECK' | 'CASH' | 'CREDIT_CARD';
  referenceNumber: string | null;
  invoice: { invoiceNumber: string; totalAmount: number };
}

export default function PaymentsPage() {
  const t = useTranslations('ats.finance.payments');
  const params = useParams();
  const locale = params.locale as string;
  const { user } = useAuthStore();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const limit = 20;

  const fetchPayments = () => {
    setLoading(true);
    const paramsObj: any = { page, limit };

    api.get('/finance/payments', { params: paramsObj })
      .then((res) => {
        if (res.data?.success) {
          let data = res.data.payments;
          if (search) {
            data = data.filter((p: Payment) => 
              p.invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
              (p.referenceNumber && p.referenceNumber.toLowerCase().includes(search.toLowerCase()))
            );
          }
          setPayments(data);
          setTotal(res.data.meta.total);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load payments');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPayments();
  }, [page, search]);

  const getMethodClass = (method: string) => {
    switch (method) {
      case 'BANK_TRANSFER': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'CREDIT_CARD': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'CASH': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'CHECK': return 'bg-slate-100 text-slate-600 border-slate-200';
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
          <span>{t('record')}</span>
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
            placeholder={locale === 'ar' ? 'بحث برقم الفاتورة...' : 'Search by invoice number...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-100 bg-slate-50/50 py-2.5 outline-none focus:border-[#00B67A] focus:bg-white text-sm ltr:pl-9 ltr:pr-4 rtl:pr-9 rtl:pl-4 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-50 bg-white/50">
          <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
        </div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <CreditCard className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="text-base font-bold text-[#1A1C29]">{t('noPayments')}</h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4 rtl:text-right">{t('date')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('invoice')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('amount')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('method')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('reference')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {payments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 text-[#1A1C29] font-medium rtl:text-right">
                      {new Date(pay.paymentDate).toLocaleDateString(locale)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-bold text-[#2A2C4E] rtl:text-right">
                      {pay.invoice.invoiceNumber}
                      <div className="text-xs font-normal text-slate-400 mt-0.5">
                        Total: {Number(pay.invoice.totalAmount).toLocaleString()}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-bold text-emerald-600 rtl:text-right">
                      {Number(pay.amount).toLocaleString()} SAR
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 rtl:text-right">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getMethodClass(pay.paymentMethod)}`}>
                        {t(pay.paymentMethod)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                      {pay.referenceNumber || '-'}
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
