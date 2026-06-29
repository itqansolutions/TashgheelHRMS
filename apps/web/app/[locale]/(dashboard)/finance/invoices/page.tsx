'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
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
  EyeOff,
  Loader2,
  Download,
  X,
  Trash2,
  ChevronDown,
} from 'lucide-react';

/* ─────────────────── Types ─────────────────── */

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  vatAmount: number;
  subtotal: number;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  company: { id: string; name: string };
  items?: InvoiceItem[];
  payments?: { id: string; amount: number; paymentDate: string; paymentMethod: string }[];
}

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

interface Company {
  id: string;
  name: string;
}

interface Placement {
  id: string;
  candidate: { firstName: string; lastName: string };
  job: { title: string };
}

interface CreateForm {
  companyId: string;
  placementId: string;
  issueDate: string;
  dueDate: string;
  vatRate: number;
  items: InvoiceItem[];
}

/* ─────────────────── Helpers ─────────────────── */

const today = () => new Date().toISOString().split('T')[0] || '';
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0] || '';
};

const emptyForm = (): CreateForm => ({
  companyId: '',
  placementId: '',
  issueDate: today(),
  dueDate: daysFromNow(30),
  vatRate: 15,
  items: [{ description: '', quantity: 1, unitPrice: 0 }],
});

/* ─────────────────── Page ─────────────────── */

export default function InvoicesPage() {
  const t = useTranslations('ats.finance.invoices');
  const params = useParams();
  const locale = params.locale as string;
  const { user } = useAuthStore();

  /* list state */
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const limit = 20;

  /* modal state */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyForm());

  /* dropdown data */
  const [companies, setCompanies] = useState<Company[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);

  /* ── fetch list ── */
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
          setTotal(res.data.meta?.total ?? data.length);
        }
      })
      .catch((err) => setErrorMsg(err.response?.data?.message || 'Failed to load invoices'))
      .finally(() => setLoading(false));
  };

  /* ── fetch dropdown data on mount ── */
  useEffect(() => {
    api.get('/companies', { params: { limit: 100 } })
      .then((res) => { if (res.data?.success) setCompanies(res.data.companies ?? res.data.data ?? []); })
      .catch(() => {});
    api.get('/placements', { params: { limit: 100 } })
      .then((res) => { if (res.data?.success) setPlacements(res.data.placements ?? res.data.data ?? []); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchInvoices(); }, [page, status, search]);

  /* ── invoice details expand ── */
  const toggleExpand = (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    // fetch details if not loaded
    const inv = invoices.find((i) => i.id === id);
    if (inv && !inv.items) {
      api.get(`/finance/invoices/${id}`)
        .then((res) => {
          if (res.data?.success) {
            setInvoices((prev) =>
              prev.map((i) => i.id === id ? { ...i, items: res.data.invoice?.items ?? [], payments: res.data.invoice?.payments ?? [] } : i)
            );
          }
        })
        .catch(() => {});
    }
  };

  /* ── status helper ── */
  const getStatusClass = (s: string) => {
    switch (s) {
      case 'PAID': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'PARTIALLY_PAID': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'OVERDUE': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'CANCELLED': return 'bg-slate-100 text-slate-500 border-slate-200';
      case 'SENT': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  /* ── line item helpers ── */
  const updateItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    setCreateForm((prev) => {
      const items = prev.items.map((it, i) =>
        i === idx ? { ...it, [field]: field === 'description' ? value : Number(value) } : it
      );
      return { ...prev, items };
    });
  };

  const addItem = () =>
    setCreateForm((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }],
    }));

  const removeItem = (idx: number) =>
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));

  /* ── live totals ── */
  const subtotal = createForm.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const vatAmount = (subtotal * createForm.vatRate) / 100;
  const totalAmount = subtotal + vatAmount;

  /* ── submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.companyId) { setModalError('Please select a company'); return; }
    if (createForm.items.length === 0) { setModalError('Add at least one line item'); return; }
    setIsSubmitting(true);
    setModalError(null);
    try {
      const payload: any = {
        companyId: createForm.companyId,
        issueDate: createForm.issueDate,
        dueDate: createForm.dueDate,
        vatRate: createForm.vatRate,
        items: createForm.items,
      };
      if (createForm.placementId) payload.placementId = createForm.placementId;
      await api.post('/finance/invoices', payload);
      setShowCreateModal(false);
      setCreateForm(emptyForm());
      fetchInvoices();
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setCreateForm(emptyForm());
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
          onClick={() => setShowCreateModal(true)}
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

      {/* Filters */}
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

      {/* Table */}
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
                  <React.Fragment key={inv.id}>
                    <tr className="hover:bg-slate-50/50 transition-colors">
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
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#00B67A] transition-colors"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            title={expandedId === inv.id ? 'Hide details' : 'View details'}
                            onClick={() => toggleExpand(inv.id)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#2A2C4E] transition-colors"
                          >
                            {expandedId === inv.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {expandedId === inv.id && (
                      <tr>
                        <td colSpan={6} className="bg-slate-50/70 px-6 py-5 border-b border-slate-100">
                          <div className="grid gap-6 sm:grid-cols-2">
                            {/* Line Items */}
                            <div>
                              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Line Items</p>
                              {inv.items === undefined ? (
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                                </div>
                              ) : inv.items.length === 0 ? (
                                <p className="text-sm text-slate-400">No items</p>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-slate-500 font-semibold">
                                      <th className="pb-1 text-left">Description</th>
                                      <th className="pb-1 text-right">Qty</th>
                                      <th className="pb-1 text-right">Unit</th>
                                      <th className="pb-1 text-right">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {inv.items.map((it, i) => (
                                      <tr key={i} className="text-slate-600">
                                        <td className="py-1">{it.description}</td>
                                        <td className="py-1 text-right">{it.quantity}</td>
                                        <td className="py-1 text-right">{Number(it.unitPrice).toLocaleString()}</td>
                                        <td className="py-1 text-right font-semibold">{(it.quantity * it.unitPrice).toLocaleString()}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>

                            {/* Payments */}
                            <div>
                              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Payments</p>
                              {inv.payments === undefined ? (
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                                </div>
                              ) : inv.payments.length === 0 ? (
                                <p className="text-sm text-slate-400">No payments yet</p>
                              ) : (
                                <div className="space-y-2">
                                  {inv.payments.map((pay) => (
                                    <div key={pay.id} className="flex items-center justify-between rounded-lg bg-white border border-slate-100 px-3 py-2 text-xs">
                                      <span className="text-slate-500">{new Date(pay.paymentDate).toLocaleDateString(locale)}</span>
                                      <span className="text-slate-400">{pay.paymentMethod.replace('_', ' ')}</span>
                                      <span className="font-bold text-emerald-600">{Number(pay.amount).toLocaleString()} SAR</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Summary */}
                              <div className="mt-4 space-y-1 text-xs">
                                <div className="flex justify-between text-slate-500">
                                  <span>Total</span>
                                  <span className="font-semibold text-[#2A2C4E]">{Number(inv.totalAmount).toLocaleString()} SAR</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <span className="text-sm text-slate-400">
                Page {page} · {total} total
              </span>
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

      {/* ═══════════════ Create Invoice Slide Panel ═══════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Panel */}
          <div
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col"
            style={{ animation: 'slideInRight 0.3s ease-out' }}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between bg-[#2A2C4E] px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Create Invoice</h3>
                  <p className="text-xs text-white/60">Fill in the details below</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

                {modalError && (
                  <div className="flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-100 p-3 text-sm text-rose-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Company */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Company <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={createForm.companyId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, companyId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#00B67A] bg-white"
                  >
                    <option value="">Select company…</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Placement */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Placement <span className="text-slate-400 font-normal normal-case">(optional)</span>
                  </label>
                  <select
                    value={createForm.placementId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, placementId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#00B67A] bg-white"
                  >
                    <option value="">No placement</option>
                    {placements.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.candidate.firstName} {pl.candidate.lastName} — {pl.job.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      required
                      value={createForm.issueDate}
                      onChange={(e) => setCreateForm((p) => ({ ...p, issueDate: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#00B67A]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Due Date
                    </label>
                    <input
                      type="date"
                      required
                      value={createForm.dueDate}
                      onChange={(e) => setCreateForm((p) => ({ ...p, dueDate: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#00B67A]"
                    />
                  </div>
                </div>

                {/* VAT Rate */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    VAT Rate (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={createForm.vatRate}
                    onChange={(e) => setCreateForm((p) => ({ ...p, vatRate: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#00B67A]"
                  />
                </div>

                {/* Line Items */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Line Items</label>
                    <button
                      type="button"
                      onClick={addItem}
                      className="flex items-center gap-1 rounded-lg bg-[#00B67A]/10 px-3 py-1 text-xs font-semibold text-[#00B67A] hover:bg-[#00B67A]/20 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {createForm.items.map((it, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-400">Item {idx + 1}</span>
                          {createForm.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="rounded-lg p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Description"
                            required
                            value={it.description}
                            onChange={(e) => updateItem(idx, 'description', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A] bg-white"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Qty</label>
                              <input
                                type="number"
                                min={1}
                                required
                                value={it.quantity}
                                onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A] bg-white"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Unit Price (SAR)</label>
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                required
                                value={it.unitPrice}
                                onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A] bg-white"
                              />
                            </div>
                          </div>
                          <div className="text-right text-xs font-semibold text-[#2A2C4E]">
                            Line total: {(it.quantity * it.unitPrice).toLocaleString()} SAR
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Total Preview */}
                <div className="rounded-xl border border-slate-200 bg-[#2A2C4E]/5 p-4 space-y-2">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span>{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>VAT ({createForm.vatRate}%)</span>
                    <span>{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-[#2A2C4E]">
                    <span>Total</span>
                    <span className="text-[#00B67A]">{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} SAR</span>
                  </div>
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
                  {isSubmitting ? 'Creating…' : 'Create Invoice'}
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
