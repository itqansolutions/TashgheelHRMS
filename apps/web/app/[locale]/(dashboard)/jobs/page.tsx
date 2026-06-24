'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '../../../../store/auth';
import { api } from '../../../../lib/api';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Building2,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
}

interface Requisition {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY' | 'INTERNSHIP';
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  salaryMin: number | null;
  salaryMax: number | null;
  deadline: string | null;
  rejectionReason: string | null;
  createdAt: string;
  company: {
    id: string;
    name: string;
  };
  creator: {
    id: string;
    firstName: string;
    lastName: string;
  };
  approver: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface Opening {
  id: string;
  title: string;
  status: 'OPEN' | 'ON_HOLD' | 'CLOSED' | 'FILLED';
  openedAt: string;
  closedAt: string | null;
  company: {
    id: string;
    name: string;
  };
  requisition: {
    id: string;
    department: string;
    location: string;
    type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY' | 'INTERNSHIP';
    salaryMin: number | null;
    salaryMax: number | null;
  };
}

export default function JobsPage() {
  const t = useTranslations('ats');
  const navT = useTranslations('nav');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'openings' | 'requisitions'>('openings');
  const [companies, setCompanies] = useState<Company[]>([]);
  
  // Requisitions State
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatus, setReqStatus] = useState('');
  const [reqCompany, setReqCompany] = useState('');
  const [reqPage, setReqPage] = useState(1);
  const [reqTotal, setReqTotal] = useState(0);

  // Openings State
  const [openings, setOpenings] = useState<Opening[]>([]);
  const [opeLoading, setOpeLoading] = useState(false);
  const [opeSearch, setOpeSearch] = useState('');
  const [opeStatus, setOpeStatus] = useState('');
  const [opeCompany, setOpeCompany] = useState('');
  const [opePage, setOpePage] = useState(1);
  const [opeTotal, setOpeTotal] = useState(0);

  // Requisition Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    companyId: '',
    location: '',
    type: 'FULL_TIME' as Requisition['type'],
    salaryMin: '',
    salaryMax: '',
    descriptionEn: '',
    descriptionAr: '',
    requirementsEn: '',
    requirementsAr: '',
    deadline: '',
    status: 'PENDING' as 'DRAFT' | 'PENDING',
  });

  // Rejection Dialog State
  const [rejectingReqId, setRejectingReqId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const limit = 20;

  useEffect(() => {
    // Load companies list for form dropdown and filters
    api.get('/companies', { params: { limit: 100 } })
      .then((res) => {
        if (res.data?.success) {
          setCompanies(res.data.companies);
        }
      })
      .catch(() => {});
  }, []);

  const fetchRequisitions = () => {
    setReqLoading(true);
    const paramsObj: any = { page: reqPage, limit };
    if (reqSearch) paramsObj.search = reqSearch;
    if (reqStatus) paramsObj.status = reqStatus;
    if (reqCompany) paramsObj.companyId = reqCompany;

    api.get('/jobs/requisitions', { params: paramsObj })
      .then((res) => {
        if (res.data?.success) {
          setRequisitions(res.data.requisitions);
          setReqTotal(res.data.meta.total);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load requisitions');
      })
      .finally(() => {
        setReqLoading(false);
      });
  };

  const fetchOpenings = () => {
    setOpeLoading(true);
    const paramsObj: any = { page: opePage, limit };
    if (opeSearch) paramsObj.search = opeSearch;
    if (opeStatus) paramsObj.status = opeStatus;
    if (opeCompany) paramsObj.companyId = opeCompany;

    api.get('/jobs/openings', { params: paramsObj })
      .then((res) => {
        if (res.data?.success) {
          setOpenings(res.data.openings);
          setOpeTotal(res.data.meta.total);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load job openings');
      })
      .finally(() => {
        setOpeLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'requisitions') {
      fetchRequisitions();
    } else {
      fetchOpenings();
    }
  }, [activeTab, reqPage, reqSearch, reqStatus, reqCompany, opePage, opeSearch, opeStatus, opeCompany]);

  const handleOpenCreateModal = () => {
    setFormData({
      title: '',
      department: '',
      companyId: companies[0]?.id || '',
      location: '',
      type: 'FULL_TIME',
      salaryMin: '',
      salaryMax: '',
      descriptionEn: '',
      descriptionAr: '',
      requirementsEn: '',
      requirementsAr: '',
      deadline: '',
      status: 'PENDING',
    });
    setIsModalOpen(true);
  };

  const handleSaveRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      ...formData,
      salaryMin: formData.salaryMin ? parseFloat(formData.salaryMin) : undefined,
      salaryMax: formData.salaryMax ? parseFloat(formData.salaryMax) : undefined,
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
      descriptionAr: formData.descriptionAr || undefined,
      requirementsAr: formData.requirementsAr || undefined,
    };

    try {
      await api.post('/jobs/requisitions', payload);
      setSuccessMsg(locale === 'ar' ? 'تم إنشاء طلب التوظيف بنجاح' : 'Job requisition created successfully');
      setIsModalOpen(false);
      if (activeTab === 'requisitions') {
        fetchRequisitions();
      } else {
        setActiveTab('requisitions');
      }
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create requisition');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async (id: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.post(`/jobs/requisitions/${id}/approve`);
      setSuccessMsg(t('jobs.successApproved'));
      fetchRequisitions();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to approve requisition');
    }
  };

  const handleOpenRejectDialog = (id: string) => {
    setRejectingReqId(id);
    setRejectionReason('');
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReqId || !rejectionReason.trim()) return;

    setIsRejecting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.post(`/jobs/requisitions/${rejectingReqId}/reject`, { reason: rejectionReason });
      setSuccessMsg(t('jobs.successRejected'));
      setRejectingReqId(null);
      fetchRequisitions();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to reject requisition');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleUpdateOpeningStatus = async (id: string, status: Opening['status']) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.patch(`/jobs/openings/${id}/status`, { status });
      setSuccessMsg(locale === 'ar' ? 'تم تحديث حالة الوظيفة بنجاح' : 'Job opening status updated successfully');
      fetchOpenings();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update job status');
    }
  };

  const getReqStatusClass = (status: Requisition['status']) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'PENDING':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'DRAFT':
        return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const getOpeStatusClass = (status: Opening['status']) => {
    switch (status) {
      case 'OPEN':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'ON_HOLD':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'CLOSED':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'FILLED':
        return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    }
  };

  const canApprove = user?.permissions?.includes('jobs:approve');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">{t('jobs.title')}</h2>
          <p className="text-sm text-slate-500">
            {locale === 'ar'
              ? 'إدارة طلبات التوظيف، الموافقات، والوظائف الشاغرة النشطة.'
              : 'Manage job requisitions, approvals, and active job openings.'}
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/25 transition-all hover:bg-[#009b67] hover:shadow-[#00B67A]/35 active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" />
          <span>{t('jobs.addRequisition')}</span>
        </button>
      </div>

      {/* Success/Error Alerts */}
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

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => setActiveTab('openings')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'openings'
              ? 'border-[#00B67A] text-[#2A2C4E]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          {t('jobs.openings')}
        </button>
        <button
          onClick={() => setActiveTab('requisitions')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === 'requisitions'
              ? 'border-[#00B67A] text-[#2A2C4E]'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          {t('jobs.requisitions')}
        </button>
      </div>

      {/* Filters Area */}
      <div className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:left-3 rtl:right-3" />
          <input
            type="text"
            placeholder={locale === 'ar' ? 'بحث بالمسمى الوظيفي...' : 'Search by job title...'}
            value={activeTab === 'requisitions' ? reqSearch : opeSearch}
            onChange={(e) => {
              if (activeTab === 'requisitions') {
                setReqSearch(e.target.value);
                setReqPage(1);
              } else {
                setOpeSearch(e.target.value);
                setOpePage(1);
              }
            }}
            className="w-full rounded-xl border border-slate-100 bg-slate-50/50 py-2.5 outline-none focus:border-[#00B67A] focus:bg-white text-sm ltr:pl-9 ltr:pr-4 rtl:pr-9 rtl:pl-4 transition-all"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={activeTab === 'requisitions' ? reqStatus : opeStatus}
            onChange={(e) => {
              if (activeTab === 'requisitions') {
                setReqStatus(e.target.value);
                setReqPage(1);
              } else {
                setOpeStatus(e.target.value);
                setOpePage(1);
              }
            }}
            className="w-full appearance-none rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 outline-none focus:border-[#00B67A] focus:bg-white text-sm text-slate-700 transition-all"
          >
            <option value="">{locale === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
            {activeTab === 'requisitions' ? (
              <>
                <option value="DRAFT">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                <option value="PENDING">{locale === 'ar' ? 'قيد الانتظار' : 'Pending'}</option>
                <option value="APPROVED">{locale === 'ar' ? 'معتمد' : 'Approved'}</option>
                <option value="REJECTED">{locale === 'ar' ? 'مرفوض' : 'Rejected'}</option>
              </>
            ) : (
              <>
                <option value="OPEN">{locale === 'ar' ? 'شاغر مفتوح' : 'Open'}</option>
                <option value="ON_HOLD">{locale === 'ar' ? 'موقوف مؤقتاً' : 'On Hold'}</option>
                <option value="CLOSED">{locale === 'ar' ? 'مغلق' : 'Closed'}</option>
                <option value="FILLED">{locale === 'ar' ? 'تم التعيين' : 'Filled'}</option>
              </>
            )}
          </select>
          <Filter className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:right-3 rtl:left-3 pointer-events-none" />
        </div>

        {/* Company Filter */}
        <div className="relative">
          <select
            value={activeTab === 'requisitions' ? reqCompany : opeCompany}
            onChange={(e) => {
              if (activeTab === 'requisitions') {
                setReqCompany(e.target.value);
                setReqPage(1);
              } else {
                setOpeCompany(e.target.value);
                setOpePage(1);
              }
            }}
            className="w-full appearance-none rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 outline-none focus:border-[#00B67A] focus:bg-white text-sm text-slate-700 transition-all"
          >
            <option value="">{locale === 'ar' ? 'كل الشركات العملاء' : 'All Client Companies'}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Filter className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:right-3 rtl:left-3 pointer-events-none" />
        </div>
      </div>

      {/* Main Contents Grid */}
      {activeTab === 'requisitions' ? (
        reqLoading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-50 bg-white/50">
            <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
          </div>
        ) : requisitions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <Briefcase className="mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-base font-bold text-[#1A1C29]">{t('jobs.noJobs')}</h3>
            <p className="mt-1 text-sm text-slate-400">
              {locale === 'ar' ? 'ابدأ بإنشاء طلب توظيف جديد.' : 'Start by creating a new job requisition.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4 rtl:text-right">{t('jobs.jobTitle')}</th>
                    <th className="px-6 py-4 rtl:text-right">{locale === 'ar' ? 'العميل' : 'Client'}</th>
                    <th className="px-6 py-4 rtl:text-right">{t('jobs.department')}</th>
                    <th className="px-6 py-4 rtl:text-right">{t('jobs.location')}</th>
                    <th className="px-6 py-4 rtl:text-right">{t('jobs.type')}</th>
                    <th className="px-6 py-4 rtl:text-right">{t('jobs.status')}</th>
                    <th className="px-6 py-4 text-right rtl:text-left">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {requisitions.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 font-bold text-[#1A1C29] rtl:text-right">
                        <button
                          onClick={() => router.push(`/${locale}/jobs/${req.id}`)}
                          className="text-left font-bold text-[#2A2C4E] hover:text-[#00B67A] transition-colors rtl:text-right"
                        >
                          {req.title}
                        </button>
                        <div className="text-xs font-normal text-slate-400 mt-0.5">
                          {t('jobs.creator')}: {req.creator.firstName} {req.creator.lastName}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-600 rtl:text-right">
                        {req.company.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                        {req.department}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                        {req.location}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                        {t(`jobs.${req.type}`)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 rtl:text-right">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getReqStatusClass(req.status)}`}>
                          {req.status}
                        </span>
                        {req.status === 'REJECTED' && req.rejectionReason && (
                          <div className="text-[10px] text-rose-500 mt-1 max-w-[200px] truncate" title={req.rejectionReason}>
                            {req.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-slate-500 rtl:text-left">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={() => router.push(`/${locale}/jobs/${req.id}`)}
                            title={locale === 'ar' ? 'عرض التفاصيل' : 'View details'}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#2A2C4E]"
                          >
                            <Eye className="h-4.5 w-4.5" />
                          </button>

                          {req.status === 'PENDING' && canApprove && (
                            <>
                              <button
                                onClick={() => handleApprove(req.id)}
                                title={t('jobs.approve')}
                                className="rounded-lg p-2 text-emerald-500 hover:bg-emerald-50"
                              >
                                <Check className="h-4.5 w-4.5" />
                              </button>
                              <button
                                onClick={() => handleOpenRejectDialog(req.id)}
                                title={t('jobs.reject')}
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

            {/* Requisitions Pagination */}
            {reqTotal > limit && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/20 px-6 py-4">
                <span className="text-xs text-slate-400">
                  {locale === 'ar' ? `الإجمالي: ${reqTotal}` : `Total: ${reqTotal}`}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={reqPage === 1}
                    onClick={() => setReqPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
                  >
                    {locale === 'ar' ? 'السابق' : 'Previous'}
                  </button>
                  <button
                    disabled={reqPage * limit >= reqTotal}
                    onClick={() => setReqPage((p) => p + 1)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
                  >
                    {locale === 'ar' ? 'التالي' : 'Next'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      ) : (
        opeLoading ? (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-50 bg-white/50">
            <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
          </div>
        ) : openings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <Briefcase className="mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-base font-bold text-[#1A1C29]">{locale === 'ar' ? 'لا توجد وظائف شاغرة نشطة' : 'No active job openings'}</h3>
            <p className="mt-1 text-sm text-slate-400">
              {locale === 'ar' ? 'الوظائف الشاغرة تظهر هنا تلقائياً بعد اعتماد طلبات التوظيف.' : 'Active jobs will appear here automatically when requisitions are approved.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4 rtl:text-right">{t('jobs.jobTitle')}</th>
                    <th className="px-6 py-4 rtl:text-right">{locale === 'ar' ? 'العميل' : 'Client'}</th>
                    <th className="px-6 py-4 rtl:text-right">{t('jobs.department')}</th>
                    <th className="px-6 py-4 rtl:text-right">{t('jobs.location')}</th>
                    <th className="px-6 py-4 rtl:text-right">{t('jobs.type')}</th>
                    <th className="px-6 py-4 rtl:text-right">{t('jobs.status')}</th>
                    <th className="px-6 py-4 text-right rtl:text-left">{locale === 'ar' ? 'تعديل الحالة' : 'Change Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {openings.map((ope) => (
                    <tr key={ope.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 font-bold text-[#1A1C29] rtl:text-right">
                        <button
                          onClick={() => router.push(`/${locale}/jobs/${ope.id}?type=opening`)}
                          className="text-left font-bold text-[#2A2C4E] hover:text-[#00B67A] transition-colors rtl:text-right"
                        >
                          {ope.title}
                        </button>
                        <div className="text-xs font-normal text-slate-400 mt-0.5">
                          {locale === 'ar' ? 'تاريخ الفتح' : 'Opened'}: {new Date(ope.openedAt).toLocaleDateString(locale)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-600 rtl:text-right">
                        {ope.company.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                        {ope.requisition.department}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                        {ope.requisition.location}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                        {t(`jobs.${ope.requisition.type}`)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 rtl:text-right">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getOpeStatusClass(ope.status)}`}>
                          {ope.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-slate-500 rtl:text-left">
                        <div className="flex justify-end items-center gap-3">
                          <button
                            onClick={() => router.push(`/${locale}/jobs/${ope.id}?type=opening`)}
                            title={locale === 'ar' ? 'عرض التفاصيل' : 'View details'}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#2A2C4E]"
                          >
                            <Eye className="h-4.5 w-4.5" />
                          </button>

                          <select
                            value={ope.status}
                            onChange={(e) => handleUpdateOpeningStatus(ope.id, e.target.value as any)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-[#00B67A]"
                          >
                            <option value="OPEN">{locale === 'ar' ? 'شاغر مفتوح' : 'Open'}</option>
                            <option value="ON_HOLD">{locale === 'ar' ? 'موقوف مؤقتاً' : 'On Hold'}</option>
                            <option value="CLOSED">{locale === 'ar' ? 'مغلق' : 'Closed'}</option>
                            <option value="FILLED">{locale === 'ar' ? 'تم التعيين' : 'Filled'}</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Openings Pagination */}
            {opeTotal > limit && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/20 px-6 py-4">
                <span className="text-xs text-slate-400">
                  {locale === 'ar' ? `الإجمالي: ${opeTotal}` : `Total: ${opeTotal}`}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={opePage === 1}
                    onClick={() => setOpePage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
                  >
                    {locale === 'ar' ? 'السابق' : 'Previous'}
                  </button>
                  <button
                    disabled={opePage * limit >= opeTotal}
                    onClick={() => setOpePage((p) => p + 1)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
                  >
                    {locale === 'ar' ? 'التالي' : 'Next'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* Create Requisition Drawer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#1A1C29]/40 backdrop-blur-sm transition-all duration-300">
          <div className="flex h-full w-full flex-col bg-white shadow-2xl ltr:rounded-l-2xl sm:max-w-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-[#1A1C29]">
                {t('jobs.addRequisition')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#1A1C29]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRequisition} className="flex flex-1 flex-col overflow-y-auto p-6 space-y-5">
              {/* Row 1: Title & Department */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t('jobs.jobTitle')} <span className="text-[#E54B4B]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t('jobs.department')} <span className="text-[#E54B4B]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Row 2: Client Company & Work Location */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'الشركة العميل' : 'Client Company'} <span className="text-[#E54B4B]">*</span>
                  </label>
                  <select
                    value={formData.companyId}
                    required
                    onChange={(e) => setFormData((prev) => ({ ...prev, companyId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                  >
                    <option value="" disabled>{locale === 'ar' ? 'اختر شركة...' : 'Select company...'}</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t('jobs.location')} <span className="text-[#E54B4B]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g. Riyadh, Saudi Arabia"
                    className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Row 3: Job Type & Salary Range */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t('jobs.type')}
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as any }))}
                    className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                  >
                    <option value="FULL_TIME">{t('jobs.FULL_TIME')}</option>
                    <option value="PART_TIME">{t('jobs.PART_TIME')}</option>
                    <option value="CONTRACT">{t('jobs.CONTRACT')}</option>
                    <option value="TEMPORARY">{t('jobs.TEMPORARY')}</option>
                    <option value="INTERNSHIP">{t('jobs.INTERNSHIP')}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t('jobs.salaryMin')}
                  </label>
                  <input
                    type="number"
                    value={formData.salaryMin}
                    onChange={(e) => setFormData((prev) => ({ ...prev, salaryMin: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t('jobs.salaryMax')}
                  </label>
                  <input
                    type="number"
                    value={formData.salaryMax}
                    onChange={(e) => setFormData((prev) => ({ ...prev, salaryMax: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Deadline & Initial Status */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t('jobs.deadline')}
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'حالة الطلب المبدئية' : 'Initial Requisition Status'}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
                    className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                  >
                    <option value="PENDING">{locale === 'ar' ? 'قيد الانتظار (طلب اعتماد)' : 'Pending Approval'}</option>
                    <option value="DRAFT">{locale === 'ar' ? 'مسودة' : 'Draft'}</option>
                  </select>
                </div>
              </div>

              {/* Descriptions & Requirements */}
              <div className="space-y-4 border-t border-slate-100 pt-4">
                <h4 className="text-sm font-bold text-[#2A2C4E]">
                  {locale === 'ar' ? 'تفاصيل الوظيفة والشروط' : 'Job Specifications'}
                </h4>

                {/* English Descriptions */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Description (English) <span className="text-[#E54B4B]">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.descriptionEn}
                      onChange={(e) => setFormData((prev) => ({ ...prev, descriptionEn: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Requirements (English) <span className="text-[#E54B4B]">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.requirementsEn}
                      onChange={(e) => setFormData((prev) => ({ ...prev, requirementsEn: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Arabic Descriptions */}
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      الوصف الوظيفي (العربية)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.descriptionAr}
                      onChange={(e) => setFormData((prev) => ({ ...prev, descriptionAr: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      الشروط والمؤهلات (العربية)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.requirementsAr}
                      onChange={(e) => setFormData((prev) => ({ ...prev, requirementsAr: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 border-t border-slate-100 pt-6">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/20 hover:bg-[#009b67] active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{locale === 'ar' ? 'جاري الإنشاء...' : 'Creating...'}</span>
                    </>
                  ) : (
                    <span>{locale === 'ar' ? 'إنشاء طلب توظيف' : 'Create Requisition'}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 active:scale-[0.98] transition-all"
                >
                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal Dialog */}
      {rejectingReqId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1C29]/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#1A1C29] mb-4">
              {t('jobs.rejectConfirm')}
            </h3>
            <form onSubmit={handleReject} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('jobs.rejectionReason')} <span className="text-[#E54B4B]">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder={t('jobs.reasonPlaceholder')}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isRejecting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#E54B4B] px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600 active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                  {isRejecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>{t('jobs.reject')}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setRejectingReqId(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 active:scale-[0.98] transition-all"
                >
                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
