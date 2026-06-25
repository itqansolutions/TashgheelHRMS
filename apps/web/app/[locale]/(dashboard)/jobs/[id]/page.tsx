'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../../../../../store/auth';
import { api } from '../../../../../lib/api';
import {
  Briefcase,
  Building2,
  MapPin,
  Calendar,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Check,
  X,
  Loader2,
  FileText,
  User,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface RequisitionDetails {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY' | 'INTERNSHIP';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  salaryMin: number | null;
  salaryMax: number | null;
  descriptionEn: string;
  descriptionAr: string | null;
  requirementsEn: string;
  requirementsAr: string | null;
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
  jobOpening?: {
    id: string;
    status: string;
  } | null;
}

interface OpeningDetails {
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
    descriptionEn: string;
    descriptionAr: string | null;
    requirementsEn: string;
    requirementsAr: string | null;
  };
  applications: Array<{
    id: string;
    createdAt: string;
    stage: string;
    candidate: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
}

export default function JobDetailPage() {
  const t = useTranslations('ats');
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();

  const locale = params.locale as string;
  const id = params.id as string;
  const isOpening = searchParams.get('type') === 'opening';

  const [requisition, setRequisition] = useState<RequisitionDetails | null>(null);
  const [opening, setOpening] = useState<OpeningDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeSubTab, setActiveSubTab] = useState<'applied' | 'ai_matches'>('applied');
  const [aiMatches, setAiMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Rejection Dialog State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDetails = () => {
    setIsLoading(true);
    const endpoint = isOpening ? `/jobs/openings/${id}` : `/jobs/requisitions/${id}`;
    
    api.get(endpoint)
      .then((res) => {
        if (res.data?.success) {
          if (isOpening) {
            setOpening(res.data.data);
          } else {
            setRequisition(res.data.data);
          }
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load details');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const fetchAiMatches = async () => {
    if (!opening) return;
    setLoadingMatches(true);
    try {
      const res = await api.get(`/ai/jobs/${opening.id}/matches`);
      if (res.data?.success) {
        setAiMatches(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch AI matches', err);
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDetails();
    }
  }, [id, isOpening]);

  useEffect(() => {
    if (activeSubTab === 'ai_matches' && aiMatches.length === 0) {
      fetchAiMatches();
    }
  }, [activeSubTab, opening]);

  const handleApprove = async () => {
    if (!requisition) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.post(`/jobs/requisitions/${requisition.id}/approve`);
      setSuccessMsg(t('jobs.successApproved'));
      fetchDetails();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to approve requisition');
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requisition || !rejectionReason.trim()) return;

    setIsRejecting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.post(`/jobs/requisitions/${requisition.id}/reject`, { reason: rejectionReason });
      setSuccessMsg(t('jobs.successRejected'));
      setShowRejectModal(false);
      fetchDetails();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to reject requisition');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleUpdateOpeningStatus = async (status: OpeningDetails['status']) => {
    if (!opening) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.patch(`/jobs/openings/${opening.id}/status`, { status });
      setSuccessMsg(locale === 'ar' ? 'تم تحديث حالة الوظيفة بنجاح' : 'Job opening status updated successfully');
      fetchDetails();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update job status');
    }
  };

  const getReqStatusClass = (status: RequisitionDetails['status']) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'PENDING_APPROVAL':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'REJECTED':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'DRAFT':
        return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  const getOpeStatusClass = (status: OpeningDetails['status']) => {
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

  const formatSalary = (min: number | null | undefined, max: number | null | undefined) => {
    const hasMin = min !== null && min !== undefined;
    const hasMax = max !== null && max !== undefined;
    if (!hasMin && !hasMax) return locale === 'ar' ? 'غير محدد' : 'Not specified';
    if (hasMin && hasMax) return `${min.toLocaleString()} - ${max.toLocaleString()}`;
    if (hasMin) return `${locale === 'ar' ? 'من' : 'From'} ${min.toLocaleString()}`;
    return `${locale === 'ar' ? 'إلى' : 'Up to'} ${max!.toLocaleString()}`;
  };

  const canApprove = user?.permissions?.includes('jobs:approve');

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
      </div>
    );
  }

  // Determine what details to display based on loaded data
  const title = isOpening ? opening?.title : requisition?.title;
  const companyName = isOpening ? opening?.company.name : requisition?.company.name;
  const department = isOpening ? opening?.requisition.department : requisition?.department;
  const jobLocation = isOpening ? opening?.requisition.location : requisition?.location;
  const type = isOpening ? opening?.requisition.type : requisition?.type;
  const salaryMin = isOpening ? opening?.requisition.salaryMin : requisition?.salaryMin;
  const salaryMax = isOpening ? opening?.requisition.salaryMax : requisition?.salaryMax;
  
  const descEn = isOpening ? opening?.requisition.descriptionEn : requisition?.descriptionEn;
  const descAr = isOpening ? opening?.requisition.descriptionAr : requisition?.descriptionAr;
  const reqEn = isOpening ? opening?.requisition.requirementsEn : requisition?.requirementsEn;
  const reqAr = isOpening ? opening?.requisition.requirementsAr : requisition?.requirementsAr;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push(`/${locale}/jobs`)}
        className="flex items-center gap-2 text-slate-500 hover:text-[#2A2C4E] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{locale === 'ar' ? 'العودة للوظائف' : 'Back to Jobs'}</span>
      </button>

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

      {/* Main Card */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: General Spec details & Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
            <div className="space-y-3">
              <span className="inline-flex rounded-md bg-[#EBF0FA] px-2.5 py-1 text-xs font-semibold text-[#2A2C4E]">
                {department}
              </span>
              <h3 className="text-xl font-bold text-[#1A1C29]">{title}</h3>
              
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span>{companyName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{jobLocation}</span>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Spec details */}
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">{t('jobs.type')}</span>
                <span className="font-semibold text-slate-700">{type ? t(`jobs.${type}`) : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t('jobs.salaryRange')}</span>
                <span className="font-semibold text-slate-700">{formatSalary(salaryMin, salaryMax)}</span>
              </div>
              {!isOpening && requisition && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('jobs.deadline')}</span>
                    <span className="font-semibold text-slate-700">
                      {requisition.deadline ? new Date(requisition.deadline).toLocaleDateString(locale) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('jobs.status')}</span>
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getReqStatusClass(requisition.status)}`}>
                      {requisition.status}
                    </span>
                  </div>
                </>
              )}
              {isOpening && opening && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{locale === 'ar' ? 'تاريخ الفتح' : 'Date Opened'}</span>
                    <span className="font-semibold text-slate-700">
                      {new Date(opening.openedAt).toLocaleDateString(locale)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('jobs.status')}</span>
                    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getOpeStatusClass(opening.status)}`}>
                      {opening.status}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons based on type */}
            {!isOpening && requisition && requisition.status === 'PENDING_APPROVAL' && canApprove && (
              <div className="flex gap-3 border-t border-slate-100 pt-4">
                <button
                  onClick={handleApprove}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[#00B67A]/20 hover:bg-[#009b67] active:scale-[0.98] transition-all"
                >
                  <Check className="h-4 w-4" />
                  <span>{t('jobs.approve')}</span>
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#E54B4B] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-[#E54B4B]/20 hover:bg-red-600 active:scale-[0.98] transition-all"
                >
                  <X className="h-4 w-4" />
                  <span>{t('jobs.reject')}</span>
                </button>
              </div>
            )}

            {isOpening && opening && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  {locale === 'ar' ? 'تحديث حالة الوظيفة الشاغرة' : 'Update Opening Status'}
                </label>
                <select
                  value={opening.status}
                  onChange={(e) => handleUpdateOpeningStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                >
                  <option value="OPEN">{locale === 'ar' ? 'شاغر مفتوح' : 'Open'}</option>
                  <option value="ON_HOLD">{locale === 'ar' ? 'موقوف مؤقتاً' : 'On Hold'}</option>
                  <option value="CLOSED">{locale === 'ar' ? 'مغلق' : 'Closed'}</option>
                  <option value="FILLED">{locale === 'ar' ? 'تم التعيين' : 'Filled'}</option>
                </select>
              </div>
            )}
          </div>

          {/* Requisition Approval Details */}
          {!isOpening && requisition && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-[#2A2C4E]">
                {locale === 'ar' ? 'تفاصيل طلب الاعتماد' : 'Requisition History'}
              </h4>
              <div className="space-y-3 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>{locale === 'ar' ? 'أنشئ بواسطة' : 'Created by'}</span>
                  <span className="font-semibold text-slate-700">
                    {requisition.creator.firstName} {requisition.creator.lastName}
                  </span>
                </div>
                {requisition.approver && (
                  <div className="flex justify-between">
                    <span>{locale === 'ar' ? 'اعتمد بواسطة' : 'Processed by'}</span>
                    <span className="font-semibold text-slate-700">
                      {requisition.approver.firstName} {requisition.approver.lastName}
                    </span>
                  </div>
                )}
                {requisition.status === 'REJECTED' && requisition.rejectionReason && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-lg p-3 space-y-1">
                    <span className="font-bold block">{t('jobs.rejectionReason')}</span>
                    <p className="text-xs leading-relaxed">{requisition.rejectionReason}</p>
                  </div>
                )}
                {requisition.jobOpening && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg p-3 flex justify-between items-center">
                    <span>{locale === 'ar' ? 'الوظيفة الشاغرة المرتبطة' : 'Linked Opening'}</span>
                    <button
                      onClick={() => router.push(`/${locale}/jobs/${requisition.jobOpening?.id}?type=opening`)}
                      className="text-xs font-bold inline-flex items-center gap-1 hover:underline"
                    >
                      <span>{locale === 'ar' ? 'عرض' : 'View'}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Description, Specs, Applicants List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Spec details Description panel */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-[#1A1C29] border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-400" />
                <span>{locale === 'ar' ? 'الوصف الوظيفي والمسؤوليات' : 'Job Description & Duties'}</span>
              </h3>
              
              <div className="mt-4 space-y-6">
                {/* English content */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">English Specs</span>
                  <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {descEn}
                  </div>
                </div>

                {/* Arabic content */}
                {descAr && (
                  <div className="space-y-2 border-t border-slate-100 pt-4 rtl:text-right">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">المواصفات بالعربية</span>
                    <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {descAr}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-[#1A1C29] border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-400" />
                <span>{locale === 'ar' ? 'المؤهلات والمتطلبات الشاغرة' : 'Qualifications & Requirements'}</span>
              </h3>

              <div className="mt-4 space-y-6">
                {/* English content */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">English Requirements</span>
                  <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {reqEn}
                  </div>
                </div>

                {/* Arabic content */}
                {reqAr && (
                  <div className="space-y-2 border-t border-slate-100 pt-4 rtl:text-right">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">المتطلبات بالعربية</span>
                    <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {reqAr}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Applicants & AI Matches Panel (Only for Openings) */}
          {isOpening && opening && (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-4">
                <div className="flex space-x-6 rtl:space-x-reverse">
                  <button
                    onClick={() => setActiveSubTab('applied')}
                    className={`pb-3 text-base font-bold transition-all border-b-2 ${
                      activeSubTab === 'applied'
                        ? 'border-[#00B67A] text-[#1A1C29]'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {locale === 'ar' ? 'المترشحين المتقدمين' : 'Applied Candidates'}
                  </button>
                  <button
                    onClick={() => setActiveSubTab('ai_matches')}
                    className={`pb-3 text-base font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                      activeSubTab === 'ai_matches'
                        ? 'border-indigo-600 text-indigo-700'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{locale === 'ar' ? 'ترشيحات الذكاء الاصطناعي' : 'AI Recommended Matches'}</span>
                  </button>
                </div>
              </div>

              {activeSubTab === 'applied' ? (
                opening.applications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <User className="mb-3 h-10 w-10 text-slate-300" />
                    <p className="text-sm text-slate-400">
                      {locale === 'ar' ? 'لا يوجد مترشحين متقدمين لهذه الوظيفة حالياً.' : 'No candidates have applied to this job yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                          <th className="py-2.5 px-4 rtl:text-right">{t('candidates.firstName')}</th>
                          <th className="py-2.5 px-4 rtl:text-right">{t('candidates.email')}</th>
                          <th className="py-2.5 px-4 rtl:text-right">{locale === 'ar' ? 'تاريخ التقديم' : 'Applied Date'}</th>
                          <th className="py-2.5 px-4 rtl:text-right">{locale === 'ar' ? 'المرحلة الحالية' : 'Stage'}</th>
                          <th className="py-2.5 px-4 text-right rtl:text-left"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {opening.applications.map((app) => (
                          <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-bold text-[#1A1C29] rtl:text-right">
                              {app.candidate.firstName} {app.candidate.lastName}
                            </td>
                            <td className="py-3 px-4 text-slate-500 rtl:text-right">
                              {app.candidate.email}
                            </td>
                            <td className="py-3 px-4 text-slate-400 rtl:text-right">
                              {new Date(app.createdAt).toLocaleDateString(locale)}
                            </td>
                            <td className="py-3 px-4 rtl:text-right">
                              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                {app.stage.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right rtl:text-left">
                              <button
                                onClick={() => router.push(`/${locale}/candidates/${app.candidate.id}`)}
                                className="text-[#00B67A] hover:underline inline-flex items-center gap-1 text-xs font-bold"
                              >
                                <span>{locale === 'ar' ? 'الملف الشخصي' : 'View Profile'}</span>
                                <ExternalLink className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                /* AI Matches Tab */
                loadingMatches ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-indigo-400">
                    <Loader2 className="h-8 w-8 animate-spin mb-3" />
                    <p className="text-sm font-semibold text-indigo-600">
                      {locale === 'ar' ? 'جاري مطابقة المترشحين باستخدام الذكاء الاصطناعي...' : 'AI is scanning the database for matches...'}
                    </p>
                  </div>
                ) : aiMatches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Sparkles className="mb-3 h-10 w-10 text-slate-300" />
                    <p className="text-sm text-slate-400">
                      {locale === 'ar' ? 'لم يتم العثور على ترشيحات مطابقة بقوة.' : 'No highly matching candidates found in the database.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {aiMatches.map((match: any) => (
                      <div key={match.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 hover:bg-indigo-50/80 transition-colors gap-4">
                        <div>
                          <h4 className="font-bold text-[#2A2C4E]">
                            {match.firstName} {match.lastName}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1">{match.email}</p>
                          {match.aiSummary && (
                            <p className="text-xs text-indigo-900 mt-2 line-clamp-2 max-w-xl">
                              {match.aiSummary}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            <Sparkles className="h-3 w-3" />
                            <span>{Math.round(match.match_score * 100)}% Match</span>
                          </div>
                          <button
                            onClick={() => router.push(`/${locale}/candidates/${match.id}`)}
                            className="text-[#00B67A] hover:underline inline-flex items-center gap-1 text-xs font-bold"
                          >
                            <span>{locale === 'ar' ? 'الملف الشخصي' : 'View Profile'}</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal Dialog */}
      {showRejectModal && (
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
                  onClick={() => setShowRejectModal(false)}
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
