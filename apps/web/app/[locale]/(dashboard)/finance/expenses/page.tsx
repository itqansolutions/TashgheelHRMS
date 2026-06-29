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
  X,
  CheckCircle2,
  Link as LinkIcon,
  Receipt,
} from 'lucide-react';

/* ─────────────────── Types ─────────────────── */

interface Expense {
  id: string;
  category: 'OFFICE' | 'TRAVEL' | 'MARKETING' | 'SOFTWARE' | 'UTILITIES' | 'OTHER';
  description: string;
  amount: number;
  expenseDate: string;
  receiptUrl: string | null;
  recordedBy: { firstName: string; lastName: string };
}

interface ExpenseForm {
  category: 'OFFICE' | 'TRAVEL' | 'MARKETING' | 'SOFTWARE' | 'UTILITIES' | 'OTHER' | '';
  description: string;
  amount: string;
  expenseDate: string;
  receiptUrl: string;
}

/* ─────────────────── Helpers ─────────────────── */

const today = () => new Date().toISOString().split('T')[0] || '';

const emptyForm = (): ExpenseForm => ({
  category: '',
  description: '',
  amount: '',
  expenseDate: today(),
  receiptUrl: '',
});

const CATEGORIES = [
  { value: 'OFFICE', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
  { value: 'TRAVEL', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  { value: 'MARKETING', color: 'text-fuchsia-600', bg: 'bg-fuchsia-50', border: 'border-fuchsia-100' },
  { value: 'SOFTWARE', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  { value: 'UTILITIES', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
  { value: 'OTHER', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100' },
] as const;

/* ─────────────────── Page ─────────────────── */

export default function ExpensesPage() {
  const t = useTranslations('ats.finance.expenses');
  const params = useParams();
  const locale = params.locale as string;
  const { user } = useAuthStore();

  /* list state */
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const limit = 20;

  /* modal state */
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyForm());

  /* ── fetch list ── */
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
          setTotal(res.data.meta?.total ?? data.length);
        }
      })
      .catch((err) => setErrorMsg(err.response?.data?.message || 'Failed to load expenses'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchExpenses(); }, [page, category, search]);

  /* ── category style helper ── */
  const getCategoryStyle = (cat: string) => {
    const found = CATEGORIES.find((c) => c.value === cat);
    return found
      ? `${found.bg} ${found.color} ${found.border}`
      : 'bg-slate-50 text-slate-500 border-slate-100';
  };

  /* ── submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.category) { setModalError('Please select a category'); return; }
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) { setModalError('Enter a valid amount'); return; }
    setIsSubmitting(true);
    setModalError(null);
    try {
      const payload: any = {
        category: expenseForm.category,
        description: expenseForm.description,
        amount: Number(expenseForm.amount),
        expenseDate: expenseForm.expenseDate,
      };
      if (expenseForm.receiptUrl) payload.receiptUrl = expenseForm.receiptUrl;
      await api.post('/finance/expenses', payload);
      setShowExpenseModal(false);
      setExpenseForm(emptyForm());
      fetchExpenses();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to log expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowExpenseModal(false);
    setExpenseForm(emptyForm());
    setModalError(null);
  };

  /* ─────────────────── Render ─────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">{t('title')}</h2>
        </div>
        <button
          onClick={() => setShowExpenseModal(true)}
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

      {/* Filters */}
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

      {/* Table */}
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
                      <div className="text-xs text-slate-400 mt-0.5">
                        Recorded by {exp.recordedBy.firstName}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 rtl:text-right">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getCategoryStyle(exp.category)}`}>
                        {t(exp.category)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-bold text-rose-600 rtl:text-right">
                      {Number(exp.amount).toLocaleString()} SAR
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                      {exp.receiptUrl ? (
                        <a
                          href={exp.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#00B67A] hover:underline"
                        >
                          <LinkIcon className="h-4 w-4" /> View
                        </a>
                      ) : '-'}
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

      {/* ═══════════════ Log Expense Slide Panel ═══════════════ */}
      {showExpenseModal && (
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
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Log Expense</h3>
                  <p className="text-xs text-white/60">Record a business expense</p>
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

                {/* Category */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setExpenseForm((p) => ({ ...p, category: cat.value }))}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                          expenseForm.category === cat.value
                            ? `${cat.bg} ${cat.color} border-current`
                            : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {cat.value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Description <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe the expense…"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#00B67A] resize-none"
                  />
                </div>

                {/* Amount + Date */}
                <div className="grid grid-cols-2 gap-4">
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
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#00B67A]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Expense Date
                    </label>
                    <input
                      type="date"
                      required
                      value={expenseForm.expenseDate}
                      onChange={(e) => setExpenseForm((p) => ({ ...p, expenseDate: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#00B67A]"
                    />
                  </div>
                </div>

                {/* Receipt URL */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Receipt URL <span className="text-slate-400 font-normal normal-case">(optional)</span>
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute top-3 h-4 w-4 text-slate-400 ltr:left-3 rtl:right-3" />
                    <input
                      type="url"
                      placeholder="https://…"
                      value={expenseForm.receiptUrl}
                      onChange={(e) => setExpenseForm((p) => ({ ...p, receiptUrl: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 py-2.5 text-sm outline-none focus:border-[#00B67A] ltr:pl-9 ltr:pr-4 rtl:pr-9 rtl:pl-4"
                    />
                  </div>
                </div>

                {/* Preview card */}
                {expenseForm.amount && Number(expenseForm.amount) > 0 && (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 flex items-center justify-between">
                    <span className="text-sm text-rose-600">
                      {expenseForm.category || 'Expense'} on {expenseForm.expenseDate}
                    </span>
                    <span className="text-base font-bold text-rose-600">
                      {Number(expenseForm.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR
                    </span>
                  </div>
                )}
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
                  {isSubmitting ? 'Saving…' : 'Log Expense'}
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
