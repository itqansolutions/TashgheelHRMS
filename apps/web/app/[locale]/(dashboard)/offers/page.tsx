'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../store/auth';
import { api } from '../../../../lib/api';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  Check,
  X,
  Loader2,
  DollarSign,
  Calendar,
} from 'lucide-react';

interface Offer {
  id: string;
  salaryAmount: number;
  currency: string;
  benefits: string | null;
  startDate: string;
  expiryDate: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  application: {
    id: string;
    candidate: { firstName: string; lastName: string };
    jobOpening: { title: string; company: { name: string } };
  };
  creator: { firstName: string; lastName: string };
  approver: { firstName: string; lastName: string } | null;
  rejectionReason: string | null;
}

interface ApplicationOption {
  id: string;
  candidate: { firstName: string; lastName: string };
  jobOpening: { title: string; company: { name: string } };
}

interface CreateForm {
  applicationId: string;
  salaryAmount: string;
  currency: string;
  startDate: string;
  expiryDate: string;
  benefits: string;
}

const today = () => new Date().toISOString().split('T')[0] || '';
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0] || '';
};

const emptyForm = (): CreateForm => ({
  applicationId: '',
  salaryAmount: '',
  currency: 'SAR',
  startDate: today(),
  expiryDate: daysFromNow(7),
  benefits: '',
});

export default function OffersPage() {
  const t = useTranslations('ats.offers');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const { user } = useAuthStore();

  /* List state */
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const limit = 20;

  /* Modal state */
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyForm());

  /* Dropdown options */
  const [applications, setApplications] = useState<ApplicationOption[]>([]);

  const fetchOffers = () => {
    setLoading(true);
    const paramsObj: any = { page, limit };
    if (status) paramsObj.status = status;

    api.get('/offers', { params: paramsObj })
      .then((res) => {
        if (res.data?.success) {
          let data = res.data.offers;
          if (search) {
            data = data.filter((o: Offer) => 
              o.application.candidate.firstName.toLowerCase().includes(search.toLowerCase()) ||
              o.application.candidate.lastName.toLowerCase().includes(search.toLowerCase()) ||
              o.application.jobOpening.title.toLowerCase().includes(search.toLowerCase())
            );
          }
          setOffers(data);
          setTotal(res.data.meta.total);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load offers');
      })
      .finally(() => setLoading(false));
  };

  const fetchApplications = () => {
    api.get('/applications', { params: { limit: 100 } })
      .then((res) => {
        if (res.data?.success) {
          setApplications(res.data.applications ?? []);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchOffers();
  }, [page, status, search]);

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.post(`/offers/${id}/approve`);
      setSuccessMsg(locale === 'ar' ? 'تم اعتماد العرض بنجاح' : 'Offer approved successfully');
      fetchOffers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to approve offer');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt(t('rejectionReason'));
    if (!reason) return;
    try {
      await api.post(`/offers/${id}/reject`, { reason });
      setSuccessMsg(locale === 'ar' ? 'تم رفض العرض بنجاح' : 'Offer rejected successfully');
      fetchOffers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to reject offer');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.applicationId) { setModalError('Please select an application'); return; }
    if (!createForm.salaryAmount || Number(createForm.salaryAmount) <= 0) { setModalError('Enter a valid salary amount'); return; }
    
    setIsSubmitting(true);
    setModalError(null);

    try {
      await api.post('/offers', {
        applicationId: createForm.applicationId,
        salaryAmount: Number(createForm.salaryAmount),
        currency: createForm.currency,
        startDate: createForm.startDate,
        expiryDate: createForm.expiryDate,
        benefits: createForm.benefits || undefined,
      });

      setShowCreateModal(false);
      setCreateForm(emptyForm());
      setSuccessMsg(locale === 'ar' ? 'تم إنشاء العرض بنجاح' : 'Offer created successfully');
      fetchOffers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to generate offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setCreateForm(emptyForm());
    setModalError(null);
  };

  const getStatusClass = (status: Offer['status']) => {
    switch (status) {
      case 'APPROVED':
      case 'ACCEPTED':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'PENDING_APPROVAL':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'REJECTED':
      case 'EXPIRED':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'SENT':
        return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'DRAFT':
        return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const canApprove = user?.permissions?.includes('offers:approve');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">{t('title')}</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/25 transition-all hover:bg-[#009b67] hover:shadow-[#00B67A]/35"
        >
          <Plus className="h-5 w-5" />
          <span>{t('generate')}</span>
        </button>
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
            <option value="DRAFT">{t('DRAFT')}</option>
            <option value="PENDING_APPROVAL">{t('PENDING_APPROVAL')}</option>
            <option value="APPROVED">{t('APPROVED')}</option>
            <option value="SENT">{t('SENT')}</option>
            <option value="ACCEPTED">{t('ACCEPTED')}</option>
            <option value="REJECTED">{t('REJECTED')}</option>
            <option value="EXPIRED">{t('EXPIRED')}</option>
          </select>
          <Filter className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:right-3 rtl:left-3 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-50 bg-white/50">
          <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
        </div>
      ) : offers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <FileText className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="text-base font-bold text-[#1A1C29]">{t('noOffers')}</h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4 rtl:text-right">Candidate</th>
                  <th className="px-6 py-4 rtl:text-right">Position</th>
                  <th className="px-6 py-4 rtl:text-right">{t('salaryAmount')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('startDate')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('status')}</th>
                  <th className="px-6 py-4 text-right rtl:text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {offers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-bold text-[#1A1C29] rtl:text-right">
                      {offer.application.candidate.firstName} {offer.application.candidate.lastName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600 rtl:text-right">
                      {offer.application.jobOpening.title}
                      <div className="text-xs text-slate-400 mt-0.5">{offer.application.jobOpening.company.name}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-emerald-600 rtl:text-right">
                      {Number(offer.salaryAmount).toLocaleString()} {offer.currency}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                      {new Date(offer.startDate).toLocaleDateString(locale)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 rtl:text-right">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusClass(offer.status)}`}>
                        {t(offer.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-slate-500 rtl:text-left">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          title="View details"
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#2A2C4E]"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </button>
                        {(offer.status === 'PENDING_APPROVAL' || offer.status === 'DRAFT') && canApprove && (
                          <>
                            <button
                              onClick={() => handleApprove(offer.id)}
                              title={t('approve')}
                              className="rounded-lg p-2 text-emerald-500 hover:bg-emerald-50"
                            >
                              <Check className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={() => handleReject(offer.id)}
                              title={t('reject')}
                              className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                            >
                              <X className="h-4.5 w-4.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════ Create Offer Slide Panel ═══════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closeModal} />

          {/* Panel */}
          <div
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col animate-[slideInRight_0.3s_ease-out]"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-[#2A2C4E] px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Generate Job Offer</h3>
                  <p className="text-xs text-white/60">Generate a new offer for a candidate</p>
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

                {/* Application Selection */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Candidate Application <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={createForm.applicationId}
                    onChange={(e) => setCreateForm((p) => ({ ...p, applicationId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#00B67A] bg-white"
                  >
                    <option value="">Select candidate & position…</option>
                    {applications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.candidate.firstName} {app.candidate.lastName} — {app.jobOpening.title} ({app.jobOpening.company.name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Salary Amount & Currency */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Salary Amount <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute top-3 h-4 w-4 text-slate-400 ltr:left-3 rtl:right-3" />
                      <input
                        type="number"
                        min={1}
                        required
                        placeholder="e.g. 15000"
                        value={createForm.salaryAmount}
                        onChange={(e) => setCreateForm((p) => ({ ...p, salaryAmount: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 py-2.5 text-sm outline-none focus:border-[#00B67A] ltr:pl-9 ltr:pr-4 rtl:pr-9 rtl:pl-4"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Currency
                    </label>
                    <select
                      value={createForm.currency}
                      onChange={(e) => setCreateForm((p) => ({ ...p, currency: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#00B67A] bg-white"
                    >
                      <option value="SAR">SAR</option>
                      <option value="USD">USD</option>
                      <option value="AED">AED</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                {/* Start Date & Expiry Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Start Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={createForm.startDate}
                      onChange={(e) => setCreateForm((p) => ({ ...p, startDate: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#00B67A]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Expiry Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={createForm.expiryDate}
                      onChange={(e) => setCreateForm((p) => ({ ...p, expiryDate: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#00B67A]"
                    />
                  </div>
                </div>

                {/* Benefits */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Benefits <span className="text-slate-400 font-normal normal-case">(optional)</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="e.g. Medical insurance, housing allowance, flight tickets..."
                    value={createForm.benefits}
                    onChange={(e) => setCreateForm((p) => ({ ...p, benefits: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-[#00B67A] resize-none"
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
                  {isSubmitting ? 'Generating…' : 'Generate Offer'}
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
