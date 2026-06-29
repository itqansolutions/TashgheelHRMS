'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useAuthStore } from '../../../../../store/auth';
import { api } from '../../../../../lib/api';
import {
  CreditCard,
  Plus,
  Search,
  AlertCircle,
  Loader2,
  X,
  CheckCircle2,
  Banknote,
} from 'lucide-react';

/* ─────────────────── Types ─────────────────── */

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'BANK_TRANSFER' | 'CHECK' | 'CASH' | 'CREDIT_CARD';
  referenceNumber: string | null;
  invoice: { invoiceNumber: string; totalAmount: number; company?: { name: string } };
}

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  company: { name: string };
  status: string;
}

interface PaymentForm {
  invoiceId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: 'BANK_TRANSFER' | 'CHECK' | 'CASH' | 'CREDIT_CARD';
  referenceNumber: string;
}

/* ─────────────────── Helpers ─────────────────── */

const today = () => new Date().toISOString().split('T')[0] || '';

const emptyForm = (): PaymentForm => ({
  invoiceId: '',
  amount: '',
  paymentDate: today(),
  paymentMethod: 'BANK_TRANSFER',
  referenceNumber: '',
});

/* ─────────────────── Page ─────────────────── */

export default function PaymentsPage() {
  const t = useTranslations('ats.finance.payments');
  const params = useParams();
  const locale = params.locale as string;
  const { user } = useAuthStore();

  /* list state */
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const limit = 20;

  /* modal state */
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyForm());

  /* dropdown data */
  const [invoiceOptions, setInvoiceOptions] = useState<InvoiceOption[]>([]);

  /* ── fetch payments ── */
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
          setTotal(res.data.meta?.total ?? data.length);
        }
      })
      .catch((err) => setErrorMsg(err.response?.data?.message || 'Failed to load payments'))
      .finally(() => setLoading(false));
  };

  /* ── fetch unpaid invoices on mount ── */
  const fetchInvoiceOptions = () => {
    api.get('/finance/invoices', { params: { limit: 100, status: 'SENT' } })
      .then((res) => {
        if (res.data?.success) {
          const all: InvoiceOption[] = res.data.invoices ?? [];
          setInvoiceOptions(all.filter((inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED'));
        }
      })
      .catch(() => {
        // fallback: try without status filter
        api.get('/finance/invoices', { params: { limit: 100 } })
          .then((res) => {
            if (res.data?.success) {
              const all: InvoiceOption[] = res.data.invoices ?? [];
              setInvoiceOptions(all.filter((inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED'));
            }
          })
          .catch(() => {});
      });
  };

  useEffect(() => {
    fetchInvoiceOptions();
  }, []);

  useEffect(() => { fetchPayments(); }, [page, search]);

  /* ── method badge ── */
  const getMethodClass = (method: string) => {
    switch (method) {
      case 'BANK_TRANSFER': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'CREDIT_CARD': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'CASH': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'CHECK': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  /* ── submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.invoiceId) { setModalError('Please select an invoice'); return; }
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) { setModalError('Enter a valid amount'); return; }
    setIsSubmitting(true);
    setModalError(null);
    try {
      const payload: any = {
        invoiceId: paymentForm.invoiceId,
        amount: Number(paymentForm.amount),
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod,
      };
      if (paymentForm.referenceNumber) payload.referenceNumber = paymentForm.referenceNumber;
      await api.post('/finance/payments', payload);
      setShowPaymentModal(false);
      setPaymentForm(emptyForm());
      fetchPayments();
      fetchInvoiceOptions();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowPaymentModal(false);
    setPaymentForm(emptyForm());
    setModalError(null);
  };

  /* selected invoice outstanding */
  const selectedInvoice = invoiceOptions.find((inv) => inv.id === paymentForm.invoiceId);

  /* ─────────────────── Render ─────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">{t('title')}</h2>
        </div>
        <button
          onClick={() => setShowPaymentModal(true)}
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

      {/* Filters */}
      <div className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-2">
        <div className="relative">
          <Search className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:left-3 rtl:right-3" />
          <input
            type="text"
            placeholder={locale === 'ar' ? 'بحث برقم الفاتورة...' : 'Search by invoice number or reference...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-100 bg-slate-50/50 py-2.5 outline-none focus:border-[#00B67A] focus:bg-white text-sm ltr:pl-9 ltr:pr-4 rtl:pr-9 rtl:pl-4 transition-all"
          />
        </div>
      </div>

      {/* Table */}
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
                      {pay.invoice.company && (
                        <div className="text-xs font-normal text-slate-400 mt-0.5">
                          {pay.invoice.company.name}
                        </div>
                      )}
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

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <span className="text-sm text-slate-400">Page {page} · {total} total</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={page * limit >= total}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ Record Payment Slide Panel ═══════════════ */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closeModal} />

          {/* Panel */}
          <div
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col"
            style={{ animation: 'slideInRight 0.3s ease-out' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-[#2A2C4E] px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Record Payment</h3>
                  <p className="text-xs text-white/60">Log a payment against an invoice</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

                {modalError && (
                  <div className="flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-100 p-3 text-sm text-rose-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Invoice */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Invoice <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={paymentForm.invoiceId}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, invoiceId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#00B67A] bg-white"
                  >
                    <option value="">Select invoice…</option>
                    {invoiceOptions.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} · {inv.company.name}
                        {inv.outstandingAmount != null ? ` · Outstanding: ${Number(inv.outstandingAmount).toLocaleString()} SAR` : ` · Total: ${Number(inv.totalAmount).toLocaleString()} SAR`}
                      </option>
                    ))}
                  </select>
                  {selectedInvoice && (
                    <div className="mt-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-xs text-amber-700 flex items-center justify-between">
                      <span>Outstanding</span>
                      <span className="font-bold text-sm">
                        {selectedInvoice.outstandingAmount != null
                          ? Number(selectedInvoice.outstandingAmount).toLocaleString()
                          : Number(selectedInvoice.totalAmount).toLocaleString()
                        } SAR
                      </span>
                    </div>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Amount (SAR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    required
                    placeholder="0.00"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#00B67A]"
                  />
                </div>

                {/* Payment Date */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, paymentDate: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#00B67A]"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['BANK_TRANSFER', 'CHECK', 'CASH', 'CREDIT_CARD'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentForm((p) => ({ ...p, paymentMethod: method }))}
                        className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                          paymentForm.paymentMethod === method
                            ? 'border-[#00B67A] bg-[#00B67A]/10 text-[#00B67A]'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {method.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reference Number */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Reference Number <span className="text-slate-400 font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-00123"
                    value={paymentForm.referenceNumber}
                    onChange={(e) => setPaymentForm((p) => ({ ...p, referenceNumber: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#00B67A]"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="border border-slate-200 rounded-xl px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-[#00B67A] text-white rounded-xl px-6 py-2.5 font-bold hover:bg-[#009b67] transition-colors disabled:opacity-60 text-sm"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {isSubmitting ? 'Saving…' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}
