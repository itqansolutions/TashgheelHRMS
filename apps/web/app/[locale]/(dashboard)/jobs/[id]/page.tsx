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
  Star,
  MessageSquare,
  Filter,
  CheckSquare,
  Square,
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
  const [pools, setPools] = useState<any[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const [matchSearch, setMatchSearch] = useState('');
  const [minMatchScore, setMinMatchScore] = useState<number>(0);

  // Filters for AI matches
  const [minScore, setMinScore] = useState<number>(0); // 0, 70, 80, 90
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [withinSalary, setWithinSalary] = useState<boolean>(false);

  // AI Matching Report Modal
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportSubTab, setReportSubTab] = useState<'overview' | 'questions' | 'recommendation'>('overview');

  const [questionsData, setQuestionsData] = useState<string>('');
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [recommendationData, setRecommendationData] = useState<any | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);

  // AI Shortlist Modal
  const [showShortlistModal, setShowShortlistModal] = useState(false);
  const [shortlistData, setShortlistData] = useState<any[]>([]);
  const [loadingShortlist, setLoadingShortlist] = useState(false);

  // Side-by-side Candidate Comparison
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [comparisonData, setComparisonData] = useState<any | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [isExportingPack, setIsExportingPack] = useState(false);

  // AI Recruiter Assistant
  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<any[]>([
    { sender: 'ai', text: 'Hello! I am your Tashgheel AI Recruiter Assistant. Ask me anything about the candidates or job requirements.' }
  ]);
  const [assistantInput, setAssistantInput] = useState('');
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);

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

    // Load Candidate Pools
    api.get('/candidates/pools')
      .then((res) => {
        if (res.data?.success) {
          setPools(res.data.data);
        }
      })
      .catch(() => {});
  };

  const fetchAiMatches = async (poolId?: string) => {
    if (!opening) return;
    setLoadingMatches(true);
    try {
      let url = `/ai/jobs/${opening.id}/matches`;
      if (poolId || selectedPoolId) {
        url += `?poolId=${poolId ?? selectedPoolId}`;
      }
      const res = await api.get(url);
      if (res.data?.success) {
        setAiMatches(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch AI matches', err);
    } finally {
      setLoadingMatches(false);
    }
  };

  const fetchMatchingReport = async (candidate: any) => {
    if (!opening) return;
    setSelectedCandidate(candidate);
    setShowReportModal(true);
    setLoadingReport(true);
    setReportData(null);
    setReportSubTab('overview');
    setQuestionsData('');
    setRecommendationData(null);
    try {
      const res = await api.get(`/ai/jobs/${opening.id}/candidates/${candidate.id}/report`);
      if (res.data?.success) {
        setReportData(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch AI matching report', err);
    } finally {
      setLoadingReport(false);
    }
  };

  const fetchQuestions = async (candidateId: string) => {
    if (!opening) return;
    setLoadingQuestions(true);
    setQuestionsData('');
    try {
      const res = await api.post('/ai/generate-questions', {
        candidateId,
        jobOpeningId: opening.id,
      });
      if (res.data?.success) {
        setQuestionsData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch interview questions', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const fetchRecommendation = async (candidateId: string) => {
    if (!opening) return;
    setLoadingRecommendation(true);
    setRecommendationData(null);
    try {
      const res = await api.post(`/ai/jobs/${opening.id}/hiring-recommendation`, {
        candidateId,
      });
      if (res.data?.success) {
        setRecommendationData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch hiring recommendation', err);
    } finally {
      setLoadingRecommendation(false);
    }
  };

  useEffect(() => {
    if (!selectedCandidate) return;
    if (reportSubTab === 'questions' && !questionsData) {
      fetchQuestions(selectedCandidate.id);
    } else if (reportSubTab === 'recommendation' && !recommendationData) {
      fetchRecommendation(selectedCandidate.id);
    }
  }, [reportSubTab, selectedCandidate]);

  const handleGenerateShortlist = async () => {
    if (!opening) return;
    setShowShortlistModal(true);
    setLoadingShortlist(true);
    setShortlistData([]);
    try {
      const res = await api.post(`/ai/jobs/${opening.id}/shortlist`);
      if (res.data?.success) {
        setShortlistData(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to generate shortlist', err);
    } finally {
      setLoadingShortlist(false);
    }
  };

  const handleCompare = async () => {
    if (!opening || selectedForCompare.length === 0) return;
    setShowCompareModal(true);
    setLoadingComparison(true);
    setComparisonData(null);
    try {
      const res = await api.post(`/ai/jobs/${opening.id}/compare`, {
        candidateIds: selectedForCompare
      });
      if (res.data?.success) {
        setComparisonData(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to compare candidates', err);
    } finally {
      setLoadingComparison(false);
    }
  };

  const handleExportClientPack = async () => {
    if (!opening || selectedForCompare.length === 0) {
      alert(locale === 'ar' ? 'يرجى اختيار مرشح واحد على الأقل للتصدير' : 'Please select at least one candidate to export');
      return;
    }
    setIsExportingPack(true);
    try {
      const response = await api.post(`/ai/jobs/${opening.id}/client-pack`, {
        candidateIds: selectedForCompare
      }, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Client_Submission_Pack_${opening.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Failed to export client pack', err);
      alert(locale === 'ar' ? 'فشل تصدير ملف العميل' : 'Failed to export client pack PDF');
    } finally {
      setIsExportingPack(false);
    }
  };

  const handleAssistantSend = async () => {
    if (!opening || !assistantInput.trim()) return;
    const userMsg = assistantInput.trim();
    setAssistantMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setAssistantInput('');
    setIsAssistantTyping(true);
    try {
      const res = await api.post(`/ai/jobs/${opening.id}/assistant`, {
        message: userMsg
      });
      if (res.data?.success) {
        setAssistantMessages(prev => [...prev, { sender: 'ai', text: res.data.data }]);
      }
    } catch (err: any) {
      setAssistantMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, I encountered an error trying to process your request.' }]);
    } finally {
      setIsAssistantTyping(false);
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

  const filteredMatches = aiMatches.filter((match: any) => {
    const score = Math.round((match.match_score || 0) * 100);
    if (minScore > 0 && score < minScore) return false;
    if (onlyAvailable && match.availability !== 'AVAILABLE') return false;
    if (withinSalary && (opening?.requisition?.salaryMax || requisition?.salaryMax) && match.expectedSalary) {
      const maxVal = Number(opening?.requisition?.salaryMax || requisition?.salaryMax);
      if (Number(match.expectedSalary) > maxVal) return false;
    }
    return true;
  });

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
                  <div className="space-y-4">
                    {/* Action & Filter Bar */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-4">
                        {/* Pool Filter */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-medium">
                            {locale === 'ar' ? 'مجمع المرشحين:' : 'Pool:'}
                          </span>
                          <select 
                            value={selectedPoolId} 
                            onChange={(e) => {
                              setSelectedPoolId(e.target.value);
                              fetchAiMatches(e.target.value);
                            }}
                            className="bg-white border border-slate-200 rounded px-2.5 py-1 outline-none text-[#2A2C4E] font-semibold max-w-[150px] truncate"
                          >
                            <option value="">{locale === 'ar' ? 'كل المرشحين' : 'All Candidates'}</option>
                            {pools.map(pool => (
                              <option key={pool.id} value={pool.id}>{pool.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Minimum Score */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-medium">
                            {locale === 'ar' ? 'التقييم:' : 'Score:'}
                          </span>
                          <select 
                            value={minScore} 
                            onChange={(e) => setMinScore(Number(e.target.value))}
                            className="bg-white border border-slate-200 rounded px-2.5 py-1 outline-none text-[#2A2C4E] font-semibold"
                          >
                            <option value={0}>{locale === 'ar' ? 'الكل' : 'All Scores'}</option>
                            <option value={90}>90%+</option>
                            <option value={80}>80%+</option>
                            <option value={70}>70%+</option>
                          </select>
                        </div>

                        {/* Availability Checkbox */}
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-500 font-medium select-none">
                          <input 
                            type="checkbox" 
                            checked={onlyAvailable}
                            onChange={(e) => setOnlyAvailable(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{locale === 'ar' ? 'متاح فقط' : 'Only Available'}</span>
                        </label>

                        {/* Within Budget Checkbox */}
                        <label className="flex items-center gap-1.5 cursor-pointer text-slate-500 font-medium select-none">
                          <input 
                            type="checkbox" 
                            checked={withinSalary}
                            onChange={(e) => setWithinSalary(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{locale === 'ar' ? 'ضمن الميزانية' : 'Within Budget'}</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Compare Button */}
                        <button
                          onClick={handleCompare}
                          disabled={selectedForCompare.length < 2}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                            selectedForCompare.length >= 2 
                              ? 'bg-slate-800 text-white hover:bg-slate-750 active:scale-[0.98]'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <span>{locale === 'ar' ? `مقارنة (${selectedForCompare.length})` : `Compare (${selectedForCompare.length})`}</span>
                        </button>

                        {/* Export Client Pack Button */}
                        <button
                          type="button"
                          onClick={handleExportClientPack}
                          disabled={selectedForCompare.length === 0 || isExportingPack}
                          className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                            selectedForCompare.length > 0 && !isExportingPack
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {isExportingPack ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                          <span>{locale === 'ar' ? 'ملف العميل (PDF)' : 'Client PDF Pack'}</span>
                        </button>

                        {/* Shortlist Generator Button */}
                        <button
                           type="button"
                          onClick={handleGenerateShortlist}
                          className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-lg font-bold active:scale-[0.98] transition-all flex items-center gap-1 shadow-sm"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>{locale === 'ar' ? 'القائمة المختصرة' : 'AI Shortlist'}</span>
                        </button>

                        {/* Recruiter Assistant Button */}
                        <button
                           type="button"
                          onClick={() => setShowAssistant(!showAssistant)}
                          className={`px-3 py-1.5 rounded-lg font-bold active:scale-[0.98] transition-all flex items-center gap-1 shadow-sm ${
                            showAssistant 
                              ? 'bg-emerald-700 text-white' 
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>{locale === 'ar' ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}</span>
                        </button>
                      </div>
                    </div>

                    {filteredMatches.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <Filter className="mb-2 h-8 w-8 text-slate-300" />
                        <p className="text-sm text-slate-400">
                          {locale === 'ar' ? 'لا يوجد نتائج تطابق عوامل التصفية الحالية.' : 'No candidates match the current filter criteria.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredMatches.map((match: any) => {
                          const score = Math.round((match.match_score || 0) * 100);
                          const isSelected = selectedForCompare.includes(match.id);
                          const starCount = score >= 90 ? 5 : score >= 80 ? 4 : score >= 70 ? 3 : score >= 60 ? 2 : 1;
                          
                          let cardTheme = 'bg-indigo-50/30 border-indigo-100 hover:bg-indigo-50/80';
                          let categoryText = 'Strong Match';
                          let categoryColor = 'bg-indigo-100 text-indigo-700';

                          if (score >= 90) {
                            cardTheme = 'bg-emerald-50/30 border-emerald-100 hover:bg-emerald-50/80';
                            categoryText = 'Excellent Match';
                            categoryColor = 'bg-emerald-100 text-emerald-700';
                          } else if (score >= 70 && score < 80) {
                            cardTheme = 'bg-amber-50/30 border-amber-100 hover:bg-amber-50/80';
                            categoryText = 'Good Match';
                            categoryColor = 'bg-amber-100 text-amber-700';
                          } else if (score < 70) {
                            cardTheme = 'bg-slate-50/30 border-slate-100 hover:bg-slate-50/80';
                            categoryText = 'Partial Match';
                            categoryColor = 'bg-slate-100 text-slate-700';
                          }

                          const toggleCompare = () => {
                            if (isSelected) {
                              setSelectedForCompare(prev => prev.filter(cid => cid !== match.id));
                            } else {
                              if (selectedForCompare.length >= 3) {
                                alert(locale === 'ar' ? 'يمكنك مقارنة 3 مرشحين كحد أقصى' : 'You can compare a maximum of 3 candidates');
                                return;
                              }
                              setSelectedForCompare(prev => [...prev, match.id]);
                            }
                          };

                          return (
                            <div key={match.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-colors gap-4 ${cardTheme}`}>
                              <div className="flex items-start gap-3">
                                {/* Comparison Checkbox */}
                                <button 
                                  type="button"
                                  onClick={toggleCompare}
                                  className="mt-1 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="h-4 w-4 text-indigo-600 fill-indigo-50" />
                                  ) : (
                                    <Square className="h-4 w-4 text-slate-300" />
                                  )}
                                </button>

                                <div>
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <h4 className="font-bold text-[#2A2C4E]">
                                      {match.firstName} {match.lastName}
                                    </h4>
                                    <div className="flex items-center gap-0.5">
                                      {Array.from({ length: 5 }).map((_, i) => (
                                        <Star 
                                          key={i} 
                                          className={`h-3 w-3 ${i < starCount ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                                        />
                                      ))}
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${categoryColor}`}>
                                      {locale === 'ar' 
                                        ? (categoryText === 'Excellent Match' ? 'ممتاز' : categoryText === 'Strong Match' ? 'قوي' : categoryText === 'Good Match' ? 'جيد' : 'جزئي')
                                        : categoryText
                                      }
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">{match.email}</p>
                                  {match.aiSummary && (
                                    <p className="text-xs text-indigo-900 mt-2 line-clamp-2 max-w-xl">
                                      {match.aiSummary}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100/50 px-2.5 py-1 text-xs font-bold text-indigo-700 border border-indigo-200/50">
                                  <Sparkles className="h-3 w-3" />
                                  <span>{score}% Match</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => fetchMatchingReport(match)}
                                    className="text-indigo-600 hover:underline inline-flex items-center gap-1 text-xs font-bold"
                                  >
                                    <span>{locale === 'ar' ? 'تقرير المطابقة' : 'Match Report'}</span>
                                  </button>
                                  <span className="text-slate-200">|</span>
                                  <button
                                    type="button"
                                    onClick={() => router.push(`/${locale}/candidates/${match.id}`)}
                                    className="text-[#00B67A] hover:underline inline-flex items-center gap-1 text-xs font-bold"
                                  >
                                    <span>{locale === 'ar' ? 'الملف الشخصي' : 'View Profile'}</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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

      {/* AI Recruiter Assistant Chat Sidebar */}
      {showAssistant && (
        <div className="fixed inset-y-0 right-0 z-40 w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col transition-all duration-300">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-[#2A2C4E]">AI Recruiter Assistant</h3>
            </div>
            <button onClick={() => setShowAssistant(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
            {assistantMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-100 text-slate-700 shadow-sm rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isAssistantTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3 text-xs text-slate-400 flex items-center gap-1.5 shadow-sm">
                  <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                  <span>AI is thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100 bg-white">
            <form onSubmit={(e) => { e.preventDefault(); handleAssistantSend(); }} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask assistant..."
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-emerald-500 focus:bg-white transition-all text-[#2A2C4E]"
              />
              <button
                type="submit"
                className="bg-emerald-600 text-white rounded-xl px-3.5 py-2 text-xs font-bold hover:bg-emerald-700 transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI Matching Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1C29]/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">AI Compatibility Analysis</span>
                <h3 className="text-lg font-bold text-[#2A2C4E] mt-0.5">
                  {selectedCandidate ? `${selectedCandidate.firstName} ${selectedCandidate.lastName}` : ''}
                </h3>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
              {/* Sub-tab navigation */}
              <div className="flex border-b border-slate-100 mb-5 text-xs font-bold gap-5">
                <button
                  type="button"
                  onClick={() => setReportSubTab('overview')}
                  className={`pb-2.5 border-b-2 transition-all ${
                    reportSubTab === 'overview' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {locale === 'ar' ? 'نظرة عامة والتوافق' : 'Overview & Compatibility'}
                </button>
                <button
                  type="button"
                  onClick={() => setReportSubTab('questions')}
                  className={`pb-2.5 border-b-2 transition-all ${
                    reportSubTab === 'questions' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {locale === 'ar' ? 'أسئلة المقابلة المقترحة' : 'Interview Prep Questions'}
                </button>
                <button
                  type="button"
                  onClick={() => setReportSubTab('recommendation')}
                  className={`pb-2.5 border-b-2 transition-all ${
                    reportSubTab === 'recommendation' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {locale === 'ar' ? 'قرار التوظيف الذكي' : 'AI Hiring Decision'}
                </button>
              </div>

              {loadingReport ? (
                <div className="flex flex-col items-center justify-center py-12 text-indigo-500">
                  <Loader2 className="h-8 w-8 animate-spin mb-3" />
                  <p className="text-xs font-semibold">Generating deep matching report via Gemini...</p>
                </div>
              ) : !reportData ? (
                <div className="text-center text-slate-400 py-12 font-semibold">Failed to load report. Check if GEMINI_API_KEY is configured.</div>
              ) : (
                <>
                  {/* Sub-tab Content: Overview */}
                  {reportSubTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Overall Score Circle & Star rating */}
                      <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                        <div className="flex items-center justify-center h-20 w-20 rounded-full bg-indigo-100 text-indigo-700 font-bold text-2xl border-4 border-indigo-200">
                          {reportData.overallScore}%
                        </div>
                        <div className="flex-1 space-y-2 text-center md:text-left">
                          <div className="flex items-center justify-center md:justify-start gap-2">
                            <span className="text-base font-bold text-[#2A2C4E]">{reportData.matchCategory}</span>
                            <div className="flex text-amber-400">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`h-4 w-4 ${i < (reportData.rating || 1) ? 'fill-amber-400' : 'text-slate-200'}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            Calculated based on Skills, Experience, Location, Salary expectations, Industry history, and Languages.
                          </p>
                        </div>
                      </div>

                      {/* Breakdown Weights */}
                      <div className="space-y-2.5">
                        <h4 className="font-bold text-[#2A2C4E] text-xs uppercase tracking-wider text-slate-400">Score Breakdown</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
                          {Object.entries(reportData.breakdown || {}).map(([key, val]: [string, any]) => (
                            <div key={key} className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-center space-y-1.5">
                              <span className="text-slate-400 capitalize text-[10px] font-medium block">{key}</span>
                              <span className="font-bold text-[#2A2C4E] text-sm">{val}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* AI Recommendation Paragraph */}
                      <div className="bg-indigo-50/20 border border-indigo-100/50 p-5 rounded-2xl space-y-2">
                        <h4 className="font-bold text-[#2A2C4E] flex items-center gap-1">
                          <Sparkles className="h-4 w-4 text-indigo-500" />
                          <span>AI Recommendation</span>
                        </h4>
                        <p className="text-xs text-indigo-950 leading-relaxed whitespace-pre-wrap">{reportData.recommendationText}</p>
                      </div>

                      {/* Side-by-Side Comparison Tables */}
                      <div className="space-y-4">
                        <h4 className="font-bold text-[#2A2C4E] text-xs uppercase tracking-wider text-slate-400">Attribute Comparison</h4>
                        
                        <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-slate-50 text-slate-400 border-b border-slate-100 font-bold">
                                <th className="p-3">Attribute</th>
                                <th className="p-3">Required</th>
                                <th className="p-3">Candidate</th>
                                <th className="p-3 text-right">Score</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              <tr>
                                <td className="p-3 font-semibold text-[#2A2C4E]">Experience Years</td>
                                <td className="p-3 text-slate-600">{reportData.experienceMatch?.required || 'N/A'}</td>
                                <td className="p-3 text-slate-600">{reportData.experienceMatch?.candidate || 'N/A'}</td>
                                <td className="p-3 text-right font-bold text-slate-700">{reportData.experienceMatch?.score || 0}%</td>
                              </tr>
                              <tr>
                                <td className="p-3 font-semibold text-[#2A2C4E]">Education</td>
                                <td className="p-3 text-slate-600">{reportData.educationMatch?.required || 'N/A'}</td>
                                <td className="p-3 text-slate-600">{reportData.educationMatch?.candidate || 'N/A'}</td>
                                <td className="p-3 text-right font-bold text-slate-700">{reportData.educationMatch?.score || 0}%</td>
                              </tr>
                              <tr>
                                <td className="p-3 font-semibold text-[#2A2C4E]">Location</td>
                                <td className="p-3 text-slate-600">{reportData.locationMatch?.required || 'N/A'}</td>
                                <td className="p-3 text-slate-600">{reportData.locationMatch?.candidate || 'N/A'}</td>
                                <td className="p-3 text-right font-bold text-slate-700">{reportData.locationMatch?.score || 0}%</td>
                              </tr>
                              <tr>
                                <td className="p-3 font-semibold text-[#2A2C4E]">Salary Expectations</td>
                                <td className="p-3 text-slate-600">{reportData.salaryMatch?.required || 'N/A'}</td>
                                <td className="p-3 text-slate-600">{reportData.salaryMatch?.candidate || 'N/A'}</td>
                                <td className="p-3 text-right font-bold text-slate-700">{reportData.salaryMatch?.score || 0}%</td>
                              </tr>
                              <tr>
                                <td className="p-3 font-semibold text-[#2A2C4E]">Industry Match</td>
                                <td className="p-3 text-slate-600">{reportData.industryMatch?.required || 'N/A'}</td>
                                <td className="p-3 text-slate-600">{reportData.industryMatch?.candidate || 'N/A'}</td>
                                <td className="p-3 text-right font-bold text-slate-700">{reportData.industryMatch?.score || 0}%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Strengths, Weaknesses, and Missing Skills */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                        <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-emerald-50/10">
                          <h4 className="font-bold text-emerald-700 flex items-center gap-1 border-b border-emerald-100 pb-2">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Strengths</span>
                          </h4>
                          <ul className="space-y-1.5 pl-4 list-disc text-slate-600">
                            {reportData.strengths?.map((str: string, idx: number) => (
                              <li key={idx}>{str}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-rose-50/10">
                          <h4 className="font-bold text-rose-700 flex items-center gap-1 border-b border-rose-100 pb-2">
                            <AlertCircle className="h-4 w-4" />
                            <span>Weaknesses</span>
                          </h4>
                          <ul className="space-y-1.5 pl-4 list-disc text-slate-600">
                            {reportData.weaknesses?.map((wk: string, idx: number) => (
                              <li key={idx}>{wk}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="border border-slate-100 rounded-2xl p-4 space-y-3 bg-amber-50/10">
                          <h4 className="font-bold text-amber-700 flex items-center gap-1 border-b border-amber-100 pb-2">
                            <X className="h-4 w-4" />
                            <span>Missing Skills</span>
                          </h4>
                          <div className="space-y-3 text-slate-600">
                            <div className="flex flex-wrap gap-1.5">
                              {reportData.missingSkills?.map((sk: string, idx: number) => (
                                <span key={idx} className="bg-amber-100 text-amber-800 rounded px-2 py-0.5 font-semibold text-[10px]">
                                  {sk}
                                </span>
                              ))}
                            </div>
                            {reportData.missingSkillsAnalysis && (
                              <div className="text-[10px] space-y-1 pt-1 border-t border-amber-100">
                                <span className="font-bold text-amber-800 block">Critical:</span>
                                <p className="leading-tight text-slate-500">{(reportData.missingSkillsAnalysis.criticalMissingSkills || []).join(', ') || 'None'}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sub-tab Content: Questions */}
                  {reportSubTab === 'questions' && (
                    <div className="space-y-4">
                      <div className="bg-indigo-50/20 border border-indigo-100 p-4 rounded-xl space-y-1">
                        <h4 className="font-bold text-[#2A2C4E] flex items-center gap-1 text-xs">
                          <Sparkles className="h-4 w-4 text-indigo-500" />
                          <span>Interview Preparation Assistant</span>
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                          Customized HR, technical, and behavioral interview questions generated specifically based on the candidate's CV and missing requirements for this role.
                        </p>
                      </div>
                      
                      {loadingQuestions ? (
                        <div className="flex flex-col items-center justify-center py-12 text-indigo-500">
                          <Loader2 className="h-8 w-8 animate-spin mb-3" />
                          <p className="text-xs font-semibold">Generating customized interview questions...</p>
                        </div>
                      ) : !questionsData ? (
                        <p className="text-slate-400 text-center py-6">Failed to load interview questions.</p>
                      ) : (
                        <div className="bg-white border border-slate-100 rounded-xl p-5 text-xs text-[#2A2C4E] leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto font-medium prose prose-slate">
                          {questionsData}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-tab Content: Hiring Decision */}
                  {reportSubTab === 'recommendation' && (
                    <div className="space-y-4 text-xs">
                      <div className="bg-indigo-50/20 border border-indigo-100 p-4 rounded-xl space-y-1">
                        <h4 className="font-bold text-[#2A2C4E] flex items-center gap-1 text-xs">
                          <Sparkles className="h-4 w-4 text-indigo-500" />
                          <span>AI Hiring Recommendation</span>
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                          Deep candidate suitability evaluation. Evaluates hiring confidence, potential onboarding risks, reasons, and suggests interview panel roles.
                        </p>
                      </div>

                      {loadingRecommendation ? (
                        <div className="flex flex-col items-center justify-center py-12 text-indigo-500">
                          <Loader2 className="h-8 w-8 animate-spin mb-3" />
                          <p className="text-xs font-semibold">Generating hiring confidence assessment...</p>
                        </div>
                      ) : !recommendationData ? (
                        <p className="text-slate-400 text-center py-6">Failed to load hiring recommendation details.</p>
                      ) : (
                        <div className="space-y-5">
                          {/* Confidence Banner */}
                          <div className={`p-4 rounded-xl border flex items-center justify-between ${
                            recommendationData.confidence === 'High' 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                              : recommendationData.confidence === 'Medium'
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-rose-50 border-rose-200 text-rose-800'
                          }`}>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Hiring Confidence</span>
                              <span className="text-lg font-black">{recommendationData.confidence} Confidence</span>
                            </div>
                            <div className="text-2xl">
                              {recommendationData.confidence === 'High' ? '⭐⭐⭐⭐⭐' : recommendationData.confidence === 'Medium' ? '⭐⭐⭐⭐' : '⭐⭐'}
                            </div>
                          </div>

                          {/* Reasons & Risks */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="border border-slate-100 rounded-xl p-4 space-y-2 bg-emerald-50/5">
                              <h5 className="font-bold text-emerald-700 flex items-center gap-1 pb-1.5 border-b border-emerald-100">
                                <Check className="h-4 w-4" />
                                <span>Key Reasons to Hire</span>
                              </h5>
                              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                                {recommendationData.reasons?.map((r: string, idx: number) => <li key={idx}>{r}</li>)}
                              </ul>
                            </div>

                            <div className="border border-slate-100 rounded-xl p-4 space-y-2 bg-rose-50/5">
                              <h5 className="font-bold text-rose-700 flex items-center gap-1 pb-1.5 border-b border-rose-100">
                                <AlertCircle className="h-4 w-4" />
                                <span>Potential Hiring Risks</span>
                              </h5>
                              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                                {recommendationData.risks?.map((r: string, idx: number) => <li key={idx}>{r}</li>)}
                              </ul>
                            </div>
                          </div>

                          {/* Next Step & Panel */}
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
                            <div className="space-y-1">
                              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Recommended Next Step:</span>
                              <p className="font-bold text-[#2A2C4E] text-sm">{recommendationData.nextStep}</p>
                            </div>

                            <div className="space-y-1.5">
                              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Suggested Interview Panel Roles:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {recommendationData.suggestedPanel?.map((p: string, idx: number) => (
                                  <span key={idx} className="bg-slate-200 text-slate-700 rounded px-2.5 py-1 font-bold">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl active:scale-[0.98] transition-all"
              >
                Close
              </button>

              {selectedCandidate && reportData && opening && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await api.post('/applications', {
                          candidateId: selectedCandidate.id,
                          jobOpeningId: opening.id,
                          stage: 'SCREENING'
                        });
                        alert('Candidate successfully shortlisted!');
                        setShowReportModal(false);
                        fetchDetails();
                        fetchAiMatches();
                      } catch (e: any) {
                        alert(e.response?.data?.message || 'Failed to select candidate');
                      }
                    }}
                    className="bg-[#00B67A] text-white hover:bg-emerald-600 px-4 py-2 rounded-xl text-xs font-bold active:scale-[0.98] transition-all"
                  >
                    Select Candidate
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await api.post('/applications', {
                          candidateId: selectedCandidate.id,
                          jobOpeningId: opening.id,
                          stage: 'REJECTED'
                        });
                        alert('Candidate application created as Rejected');
                        setShowReportModal(false);
                        fetchDetails();
                        fetchAiMatches();
                      } catch (e: any) {
                        alert(e.response?.data?.message || 'Failed to reject candidate');
                      }
                    }}
                    className="bg-red-500 text-white hover:bg-red-600 px-4 py-2 rounded-xl text-xs font-bold active:scale-[0.98] transition-all"
                  >
                    Reject Candidate
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Shortlist Modal */}
      {showShortlistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1C29]/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-[#2A2C4E]">AI Generated Shortlist (Top 5 Candidates)</h3>
              </div>
              <button onClick={() => setShowShortlistModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingShortlist ? (
                <div className="flex flex-col items-center justify-center py-12 text-indigo-500">
                  <Loader2 className="h-8 w-8 animate-spin mb-3" />
                  <p className="text-xs font-semibold">Running multi-stage vector and semantic parsing shortlist generator...</p>
                </div>
              ) : shortlistData.length === 0 ? (
                <div className="text-center text-slate-400 py-12">No candidates available to shortlist. Check if candidates exist in the database.</div>
              ) : (
                <div className="space-y-3.5">
                  {shortlistData.map((cand: any, idx: number) => (
                    <div key={cand.candidateId} className="flex gap-4 p-4 rounded-xl border border-indigo-50 bg-indigo-50/20 items-start">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-600 text-white font-bold text-sm shrink-0">
                        {cand.rank}
                      </div>
                      <div className="flex-1 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-[#2A2C4E] text-sm">{cand.firstName} {cand.lastName}</span>
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            {cand.matchScore}% Match
                          </span>
                        </div>
                        <p className="text-slate-500">{cand.email}</p>
                        <p className="text-[#2A2C4E] leading-relaxed bg-white border border-slate-100 rounded-lg p-2.5 mt-1 font-medium italic">
                          "{cand.shortlistReason}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-between bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setShowShortlistModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
              >
                Close
              </button>
              {shortlistData.length > 0 && opening && (
                <button
                  onClick={async () => {
                    try {
                      for (const c of shortlistData) {
                        await api.post('/applications', {
                          candidateId: c.candidateId,
                          jobOpeningId: opening.id,
                          stage: 'SCREENING'
                        });
                      }
                      alert('All 5 candidates successfully added to job opening applications pipeline!');
                      setShowShortlistModal(false);
                      fetchDetails();
                      fetchAiMatches();
                    } catch (e: any) {
                      alert(e.response?.data?.message || 'Failed to auto-apply shortlisted candidates');
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold active:scale-[0.98] transition-all"
                >
                  Accept Shortlist & Auto-Apply Candidates
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Comparison Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1C29]/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-[#2A2C4E]">Side-by-Side Candidate Comparison</h3>
              </div>
              <button onClick={() => { setShowCompareModal(false); setSelectedForCompare([]); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingComparison ? (
                <div className="flex flex-col items-center justify-center py-12 text-indigo-500">
                  <Loader2 className="h-8 w-8 animate-spin mb-3" />
                  <p className="text-xs font-semibold">Running side-by-side Gemini comparison...</p>
                </div>
              ) : !comparisonData ? (
                <div className="text-center text-slate-400 py-12">Failed to load comparison data. Check if GEMINI_API_KEY is configured.</div>
              ) : (
                <div className="space-y-6 text-xs col-span-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {comparisonData.comparison?.map((comp: any) => {
                      const isWinner = comparisonData.highlightedCandidateId === comp.candidateId;
                      return (
                        <div key={comp.candidateId} className={`p-4 border rounded-2xl space-y-4 flex flex-col justify-between ${
                          isWinner 
                            ? 'border-emerald-500 bg-emerald-50/10 shadow-md ring-2 ring-emerald-500/20' 
                            : 'border-slate-100 bg-slate-50/20'
                        }`}>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                              <span className="font-bold text-sm text-[#2A2C4E]">{comp.name}</span>
                              {isWinner && (
                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                  ★ Top Choice
                                </span>
                              )}
                            </div>

                            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600">
                              <span>AI Match Score:</span>
                              <span className="text-indigo-600 text-sm font-bold">{comp.overallScore}%</span>
                            </div>

                            <div className="space-y-1">
                              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Strengths:</span>
                              <ul className="pl-4 list-disc space-y-0.5 text-slate-600 leading-relaxed">
                                {comp.strengths?.map((str: string, idx: number) => <li key={idx}>{str}</li>)}
                              </ul>
                            </div>

                            <div className="space-y-1">
                              <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">Weaknesses:</span>
                              <ul className="pl-4 list-disc space-y-0.5 text-slate-600 leading-relaxed">
                                {comp.weaknesses?.map((wk: string, idx: number) => <li key={idx}>{wk}</li>)}
                              </ul>
                            </div>
                          </div>

                          <div className="mt-3 bg-white p-3 rounded-xl border border-slate-100">
                            <span className="font-bold text-indigo-700 block mb-1">AI Recommendation:</span>
                            <p className="text-slate-600 leading-relaxed italic">"{comp.recommendation}"</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl space-y-2">
                    <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span>AI Verdict & Recommendation Justification</span>
                    </h4>
                    <p className="text-emerald-950 font-medium leading-relaxed">{comparisonData.bestCandidateReason}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => { setShowCompareModal(false); setSelectedForCompare([]); }}
                className="bg-slate-800 text-white hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              >
                Close & Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
