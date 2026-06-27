'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../../lib/api';
import {
  ArrowLeft,
  Mail,
  Phone,
  Link2,
  MapPin,
  Calendar,
  Globe,
  Coins,
  FileText,
  Briefcase,
  GraduationCap,
  Sparkles,
  Download,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  RefreshCw,
} from 'lucide-react';

interface Experience {
  id: string;
  companyName: string;
  title: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
}

interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string | null;
  startDate: string;
  endDate: string | null;
}

interface Skill {
  id: string;
  skillName: string;
  proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
}

interface Document {
  id: string;
  type: 'CV' | 'CERTIFICATE' | 'PORTFOLIO' | 'OTHER';
  fileName: string;
  fileUrl: string;
  createdAt: string;
}

interface Application {
  id: string;
  createdAt: string;
  stage: string;
  jobOpening: {
    id: string;
    title: string;
    company: {
      name: string;
    };
  };
}

interface CandidateDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  nationality: string | null;
  currentLocation: string | null;
  expectedSalary: number | null;
  availability: 'AVAILABLE' | 'NOTICE_PERIOD' | 'EMPLOYED' | 'UNAVAILABLE';
  source: string | null;
  aiSummary: string | null;
  createdAt: string;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  documents: Document[];
  applications: Application[];
}

export default function CandidateDetailPage() {
  const t = useTranslations('ats');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const id = params.id as string;

  const getDocumentUrl = (url: string) => {
    if (!url) return '';
    let resolvedUrl = url;
    
    // Add protocol prefix if missing for absolute URLs
    if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://') && !resolvedUrl.startsWith('/')) {
      resolvedUrl = `https://${resolvedUrl}`;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    // Handle relative path (starts with /)
    if (resolvedUrl.startsWith('/')) {
      let cleanApi = apiUrl || 'http://localhost:4000';
      if (!cleanApi.startsWith('http://') && !cleanApi.startsWith('https://')) {
        cleanApi = `https://${cleanApi}`;
      }
      return `${cleanApi.replace(/\/$/, '')}${resolvedUrl}`;
    }

    // Rewrite Cloudflare R2 URLs to proxy via backend API
    if (resolvedUrl.includes('r2.cloudflarestorage.com')) {
      try {
        const urlObj = new URL(resolvedUrl);
        const parts = urlObj.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) {
          const folder = parts[parts.length - 2];
          const filename = parts[parts.length - 1];
          const relativePath = `/api/storage/file/${folder}/${filename}`;
          
          let cleanApi = apiUrl || 'http://localhost:4000';
          if (!cleanApi.startsWith('http://') && !cleanApi.startsWith('https://')) {
            cleanApi = `https://${cleanApi}`;
          }
          return `${cleanApi.replace(/\/$/, '')}${relativePath}`;
        }
      } catch (e) {
        // Ignore and fallback
      }
    }

    // Handle localhost URL replacements
    if (resolvedUrl.startsWith('http://localhost') || resolvedUrl.startsWith('http://127.0.0.1')) {
      try {
        const urlObj = new URL(resolvedUrl);
        const pathAndQuery = urlObj.pathname + urlObj.search;
        let cleanApi = apiUrl || 'http://localhost:4000';
        if (!cleanApi.startsWith('http://') && !cleanApi.startsWith('https://')) {
          cleanApi = `https://${cleanApi}`;
        }
        return `${cleanApi.replace(/\/$/, '')}${pathAndQuery}`;
      } catch (e) {
        // Ignore and fallback
      }
    }

    return resolvedUrl;
  };

  const [candidate, setCandidate] = useState<CandidateDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'skills' | 'applications' | 'recommended_jobs'>('overview');

  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const [cvScore, setCvScore] = useState<{
    score: number;
    missingInfo: string[];
    weaknesses: string[];
    recommendations: string[];
  } | null>(null);
  const [loadingCvScore, setLoadingCvScore] = useState(false);
  const [isReparsing, setIsReparsing] = useState(false);

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    nationality: '',
    currentLocation: '',
    expectedSalary: '',
    availability: 'AVAILABLE' as CandidateDetails['availability'],
    source: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Document Upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<Document['type']>('CV');
  const [isUploading, setIsUploading] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchCandidateDetails = () => {
    setIsLoading(true);
    api.get(`/candidates/${id}`)
      .then((res) => {
        if (res.data?.success) {
          setCandidate(res.data.data);
          // Set edit form defaults
          const details = res.data.data;
          setEditFormData({
            firstName: details.firstName,
            lastName: details.lastName,
            email: details.email || '',
            phone: details.phone || '',
            linkedinUrl: details.linkedinUrl || '',
            nationality: details.nationality || '',
            currentLocation: details.currentLocation || '',
            expectedSalary: details.expectedSalary ? details.expectedSalary.toString() : '',
            availability: details.availability,
            source: details.source || '',
          });
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load details');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const fetchRecommendedJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await api.get(`/ai/candidates/${id}/jobs`);
      if (res.data?.success) {
        setRecommendedJobs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch recommended jobs', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchCvScore = async () => {
    setLoadingCvScore(true);
    try {
      const res = await api.get(`/ai/candidates/${id}/cv-score`);
      if (res.data?.success) {
        setCvScore(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch CV score', err);
    } finally {
      setLoadingCvScore(false);
    }
  };

  const handleReparseCv = async () => {
    setIsReparsing(true);
    try {
      const res = await api.post(`/candidates/${id}/reparse`);
      if (res.data?.success) {
        alert(locale === 'ar' ? 'تم إعادة تحليل السيرة الذاتية وتحديث الملف بنجاح!' : 'CV reparsed and candidate profile updated successfully!');
        fetchCandidateDetails();
        fetchCvScore();
      }
    } catch (err: any) {
      console.error('Failed to reparse CV', err);
      alert(err.response?.data?.message || 'Failed to reparse CV');
    } finally {
      setIsReparsing(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCandidateDetails();
      fetchCvScore();
    }
  }, [id]);

  useEffect(() => {
    if (activeTab === 'recommended_jobs' && recommendedJobs.length === 0) {
      fetchRecommendedJobs();
    }
  }, [activeTab]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      ...editFormData,
      expectedSalary: editFormData.expectedSalary ? parseFloat(editFormData.expectedSalary) : undefined,
      email: editFormData.email || undefined,
      phone: editFormData.phone || undefined,
      linkedinUrl: editFormData.linkedinUrl || undefined,
      nationality: editFormData.nationality || undefined,
      currentLocation: editFormData.currentLocation || undefined,
      source: editFormData.source || undefined,
    };

    try {
      await api.patch(`/candidates/${id}`, payload);
      setSuccessMsg(locale === 'ar' ? 'تم تحديث بيانات المترشح بنجاح' : 'Candidate details updated successfully');
      setIsEditOpen(false);
      fetchCandidateDetails();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update candidate');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('type', uploadType);

    try {
      await api.post(`/candidates/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccessMsg(locale === 'ar' ? 'تم رفع الملف بنجاح' : 'File uploaded successfully');
      setUploadFile(null);
      fetchCandidateDetails();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف هذا المستند؟' : 'Are you sure you want to delete this document?')) {
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.delete(`/candidates/documents/${docId}`);
      setSuccessMsg(locale === 'ar' ? 'تم حذف المستند بنجاح' : 'Document deleted successfully');
      fetchCandidateDetails();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleDeleteCandidate = async () => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف ملف هذا المترشح نهائياً؟' : 'Are you sure you want to permanently delete this candidate profile?')) {
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.delete(`/candidates/${id}`);
      router.push(`/${locale}/candidates`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete candidate');
    }
  };

  const getAvailabilityClass = (av: CandidateDetails['availability']) => {
    switch (av) {
      case 'AVAILABLE':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'NOTICE_PERIOD':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'EMPLOYED':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'UNAVAILABLE':
        return 'bg-rose-50 text-rose-600 border-rose-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-10 w-10 text-rose-500 mb-2" />
        <p className="text-sm font-semibold text-slate-500">
          {locale === 'ar' ? 'المترشح غير موجود' : 'Candidate not found'}
        </p>
      </div>
    );
  }

  const cvDoc = candidate.documents.find((d) => d.type === 'CV');

  return (
    <div className="space-y-6">
      {/* Back Link & Edit / Delete Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/${locale}/candidates`)}
          className="flex items-center gap-2 text-slate-500 hover:text-[#2A2C4E] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{locale === 'ar' ? 'العودة للمترشحين' : 'Back to Candidates'}</span>
        </button>

        <div className="flex gap-2">
          {cvDoc && (
            <button
              onClick={handleReparseCv}
              disabled={isReparsing}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-650 hover:bg-indigo-100 active:scale-[0.98] transition-all"
            >
              {isReparsing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span>{locale === 'ar' ? 'إعادة تحليل السيرة' : 'Reparse CV'}</span>
            </button>
          )}
          <button
            onClick={() => setIsEditOpen(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-[#2A2C4E] hover:bg-slate-50 active:scale-[0.98] transition-all"
          >
            <Edit2 className="h-4 w-4" />
            <span>{locale === 'ar' ? 'تعديل البيانات' : 'Edit Profile'}</span>
          </button>
          <button
            onClick={handleDeleteCandidate}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 active:scale-[0.98] transition-all"
          >
            <Trash2 className="h-4 w-4" />
            <span>{locale === 'ar' ? 'حذف الملف' : 'Delete Candidate'}</span>
          </button>
        </div>
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

      {/* Profile Header Block */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00B67A] text-2xl font-bold text-white shadow-lg shadow-[#00B67A]/25">
            {candidate.firstName[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#1A1C29]">
              {candidate.firstName} {candidate.lastName}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getAvailabilityClass(candidate.availability)}`}>
                {t(`candidates.${candidate.availability}`)}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Quick Details */}
        <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-3 md:flex md:items-center gap-x-6">
          {candidate.email && (
            <a href={`mailto:${candidate.email}`} className="flex items-center gap-2 hover:text-[#00B67A]">
              <Mail className="h-4.5 w-4.5 text-slate-400" />
              <span>{candidate.email}</span>
            </a>
          )}
          {candidate.phone && (
            <a href={`tel:${candidate.phone}`} className="flex items-center gap-2 hover:text-[#00B67A]">
              <Phone className="h-4.5 w-4.5 text-slate-400" />
              <span>{candidate.phone}</span>
            </a>
          )}
          {candidate.linkedinUrl && (
            <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-[#00B67A]">
              <Link2 className="h-4.5 w-4.5 text-slate-400" />
              <span>LinkedIn</span>
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left column: Candidate specs */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4 text-sm">
            <h3 className="text-xs font-bold text-[#2A2C4E] uppercase tracking-wider pb-2 border-b border-slate-100">
              {locale === 'ar' ? 'بيانات المترشح' : 'Candidate Details'}
            </h3>

            <div className="space-y-3.5">
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">{t('candidates.nationality')}</span>
                <span className="font-semibold text-slate-700">{candidate.nationality || '-'}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">{t('candidates.location')}</span>
                <span className="font-semibold text-slate-700">{candidate.currentLocation || '-'}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">{t('candidates.expectedSalary')}</span>
                <span className="font-semibold text-slate-700">
                  {candidate.expectedSalary ? `${candidate.expectedSalary.toLocaleString()} ${locale === 'ar' ? 'ريال' : 'SAR'}` : '-'}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">{t('candidates.source')}</span>
                <span className="font-semibold text-slate-700">{candidate.source || '-'}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">{locale === 'ar' ? 'تاريخ التسجيل' : 'Registered Date'}</span>
                <span className="font-semibold text-slate-700">
                  {new Date(candidate.createdAt).toLocaleDateString(locale)}
                </span>
              </div>
            </div>
          </div>

          {/* AI CV Quality Score Widget */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-[#2A2C4E] uppercase tracking-wider">
                {locale === 'ar' ? 'جودة السيرة الذاتية (AI)' : 'AI Resume Score'}
              </h3>
              <Sparkles className="h-4 w-4 text-indigo-500" />
            </div>

            {loadingCvScore ? (
              <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin mb-1.5 text-indigo-500" />
                <span className="text-[10px]">{locale === 'ar' ? 'جاري التحليل...' : 'Analyzing CV quality...'}</span>
              </div>
            ) : cvScore ? (
              <div className="space-y-4 text-xs">
                <div className="flex flex-col items-center justify-center py-2">
                  <div className="relative flex items-center justify-center h-20 w-20 rounded-full border-4 border-slate-100 bg-slate-50/50">
                    <span className="text-xl font-extrabold text-[#2A2C4E]">{cvScore.score}</span>
                    <span className="text-[9px] text-slate-400 absolute bottom-1.5">/100</span>
                  </div>
                  <span className={`text-xs font-bold mt-2 ${
                    cvScore.score >= 80 ? 'text-emerald-500' : cvScore.score >= 60 ? 'text-amber-500' : 'text-rose-500'
                  }`}>
                    {cvScore.score >= 80 
                      ? (locale === 'ar' ? 'سيرة ممتازة' : 'Excellent Resume') 
                      : cvScore.score >= 60 
                        ? (locale === 'ar' ? 'سيرة جيدة' : 'Good Resume') 
                        : (locale === 'ar' ? 'تحتاج تحسين' : 'Needs Improvement')}
                  </span>
                </div>

                {cvScore.missingInfo && cvScore.missingInfo.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {locale === 'ar' ? 'بيانات مفقودة' : 'Missing Info'}
                    </span>
                    <ul className="text-[11px] text-rose-500 list-disc list-inside space-y-0.5 font-medium">
                      {cvScore.missingInfo.map((info, idx) => (
                        <li key={idx} className="truncate">{info}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {cvScore.weaknesses && cvScore.weaknesses.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {locale === 'ar' ? 'نقاط الضعف' : 'Weaknesses'}
                    </span>
                    <ul className="text-[11px] text-amber-600 list-disc list-inside space-y-0.5 font-medium">
                      {cvScore.weaknesses.map((w, idx) => (
                        <li key={idx} className="truncate">{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {cvScore.recommendations && cvScore.recommendations.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {locale === 'ar' ? 'توصيات التحسين' : 'Recommendations'}
                    </span>
                    <ul className="text-[11px] text-slate-600 list-disc list-inside space-y-1">
                      {cvScore.recommendations.map((rec, idx) => (
                        <li key={idx} className="leading-snug">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {cvDoc && (
                  <button
                    onClick={handleReparseCv}
                    disabled={isReparsing}
                    className="w-full flex items-center justify-center gap-1.5 mt-4 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50 active:scale-[0.98] transition-all"
                  >
                    {isReparsing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
                    )}
                    <span>{locale === 'ar' ? 'إعادة تحليل السيرة الذاتية' : 'Reparse CV'}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <button
                  onClick={fetchCvScore}
                  className="w-full rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-all active:scale-[0.98]"
                >
                  {locale === 'ar' ? 'تحليل جودة السيرة' : 'Analyze Resume'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Tab sheets */}
        <div className="lg:col-span-3 space-y-6">
          {/* Tab Switcher */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-[#00B67A] text-[#2A2C4E]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {locale === 'ar' ? 'الملخص والسيرة الذاتية' : 'Overview & CV'}
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'timeline'
                  ? 'border-[#00B67A] text-[#2A2C4E]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {locale === 'ar' ? 'الخبرة والتعليم' : 'Timeline'}
            </button>
            <button
              onClick={() => setActiveTab('skills')}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'skills'
                  ? 'border-[#00B67A] text-[#2A2C4E]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {t('candidates.skills')} & {t('candidates.documents')}
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'applications'
                  ? 'border-[#00B67A] text-[#2A2C4E]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {locale === 'ar' ? 'طلبات التقديم' : 'Applications'}
            </button>
            <button
              onClick={() => setActiveTab('recommended_jobs')}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'recommended_jobs'
                  ? 'border-[#00B67A] text-[#2A2C4E]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <span>{locale === 'ar' ? 'الوظائف المقترحة' : 'Recommended Jobs'}</span>
              </span>
            </button>
          </div>

          {/* TAB CONTENT: Overview & CV */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* AI Summary */}
              {candidate.aiSummary && (
                <div className="rounded-2xl border border-indigo-100 bg-[#EBF0FA]/30 p-5 shadow-sm space-y-2">
                  <h4 className="text-sm font-bold text-[#2A2C4E] flex items-center gap-1.5">
                    <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
                    <span>{locale === 'ar' ? 'الملخص الذكي (AI)' : 'AI Smart Summary'}</span>
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 whitespace-pre-wrap">{candidate.aiSummary}</p>
                </div>
              )}

              {/* CV Preview */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-[#2A2C4E] border-b border-slate-100 pb-2 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <span>{t('candidates.resume')}</span>
                </h4>

                {cvDoc ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-xs font-bold text-[#2A2C4E] truncate max-w-xs sm:max-w-md">{cvDoc.fileName}</span>
                      <a
                        href={getDocumentUrl(cvDoc.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#00B67A] hover:underline"
                      >
                        <Download className="h-4 w-4" />
                        <span>{locale === 'ar' ? 'تحميل' : 'Download'}</span>
                      </a>
                    </div>
                    
                    {/* Render iframe preview if PDF */}
                    {cvDoc.fileUrl.toLowerCase().endsWith('.pdf') && (
                      <div className="aspect-[4/5] w-full border border-slate-200 rounded-xl overflow-hidden shadow-inner">
                        <iframe src={getDocumentUrl(cvDoc.fileUrl)} className="h-full w-full" title="CV Resume Preview" />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">
                    {locale === 'ar'
                      ? 'لم يتم رفع ملف سيرة ذاتية بعد. انتقل إلى علامة تبويب المستندات للرفع.'
                      : 'No CV resume file uploaded yet. Go to the Skills & Attachments tab to upload.'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB CONTENT: Career & Education Timeline */}
          {activeTab === 'timeline' && (
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Experience Timeline */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-5">
                <h4 className="text-sm font-bold text-[#2A2C4E] border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-slate-400" />
                  <span>{t('candidates.experience')}</span>
                </h4>

                {candidate.experience.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    {locale === 'ar' ? 'لا يوجد خبرات مسجلة.' : 'No experiences recorded.'}
                  </p>
                ) : (
                  <div className="relative border-s border-slate-100 space-y-6 ltr:pl-4 rtl:pr-4 ltr:ml-2 rtl:mr-2">
                    {candidate.experience.map((exp) => (
                      <div key={exp.id} className="relative">
                        <span className="absolute -left-[21px] ltr:-left-[21px] rtl:-right-[21px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#00B67A] ring-4 ring-emerald-50"></span>
                        
                        <div className="space-y-1">
                          <h5 className="text-sm font-bold text-slate-700">{exp.title}</h5>
                          <p className="text-xs text-[#00B67A] font-semibold">{exp.companyName}</p>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(exp.startDate).toLocaleDateString(locale)} —{' '}
                              {exp.isCurrent
                                ? locale === 'ar'
                                  ? 'حتى الآن'
                                  : 'Present'
                                : exp.endDate
                                ? new Date(exp.endDate).toLocaleDateString(locale)
                                : ''}
                            </span>
                          </div>
                          {exp.description && (
                            <p className="text-xs text-slate-500 leading-relaxed pt-1.5">{exp.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Education Timeline */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-5">
                <h4 className="text-sm font-bold text-[#2A2C4E] border-b border-slate-100 pb-2 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-slate-400" />
                  <span>{t('candidates.education')}</span>
                </h4>

                {candidate.education.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    {locale === 'ar' ? 'لا يوجد سجلات تعليمية.' : 'No education records recorded.'}
                  </p>
                ) : (
                  <div className="relative border-s border-slate-100 space-y-6 ltr:pl-4 rtl:pr-4 ltr:ml-2 rtl:mr-2">
                    {candidate.education.map((edu) => (
                      <div key={edu.id} className="relative">
                        <span className="absolute -left-[21px] ltr:-left-[21px] rtl:-right-[21px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-500 ring-4 ring-blue-50"></span>
                        
                        <div className="space-y-1">
                          <h5 className="text-sm font-bold text-slate-700">{edu.degree}</h5>
                          <p className="text-xs text-blue-500 font-semibold">
                            {edu.institution}
                            {edu.fieldOfStudy ? ` — ${edu.fieldOfStudy}` : ''}
                          </p>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(edu.startDate).toLocaleDateString(locale)} —{' '}
                              {edu.endDate ? new Date(edu.endDate).toLocaleDateString(locale) : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB CONTENT: Skills Matrix & Files */}
          {activeTab === 'skills' && (
            <div className="space-y-6">
              {/* Skills Matrix */}
              <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-[#2A2C4E] border-b border-slate-100 pb-2">
                  {t('candidates.skills')}
                </h4>

                {candidate.skills.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    {locale === 'ar' ? 'لم يتم إضافة مهارات.' : 'No skills recorded.'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {candidate.skills.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-100 bg-[#EBF0FA]/30 px-3.5 py-1.5 text-xs text-slate-700 font-semibold"
                      >
                        <span>{s.skillName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-500 uppercase tracking-wider font-extrabold">
                          {t(`candidates.${s.proficiency}`)}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Attachments & Files manager */}
              <div className="grid gap-6 sm:grid-cols-3">
                {/* Upload Form */}
                <div className="sm:col-span-1 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm h-fit space-y-4">
                  <h4 className="text-xs font-bold text-[#2A2C4E] uppercase tracking-wider border-b border-slate-100 pb-2">
                    {locale === 'ar' ? 'رفع مستند جديد' : 'Upload Attachment'}
                  </h4>

                  <form onSubmit={handleFileUpload} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        {locale === 'ar' ? 'نوع المستند' : 'Document Type'}
                      </label>
                      <select
                        value={uploadType}
                        onChange={(e) => setUploadType(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#00B67A] transition-all"
                      >
                        <option value="CV">{t('candidates.resume')}</option>
                        <option value="CERTIFICATE">{locale === 'ar' ? 'شهادة علمية/مهنية' : 'Certificate'}</option>
                        <option value="PORTFOLIO">{locale === 'ar' ? 'معرض أعمال' : 'Portfolio'}</option>
                        <option value="OTHER">{locale === 'ar' ? 'أخرى' : 'Other'}</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        {locale === 'ar' ? 'الملف' : 'File'}
                      </label>
                      <input
                        type="file"
                        required
                        accept=".pdf,.doc,.docx,.jpg,.png"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#EBF0FA] file:text-[#2A2C4E] hover:file:bg-indigo-100"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isUploading || !uploadFile}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#00B67A] py-2.5 text-xs font-bold text-white hover:bg-[#009b67] disabled:opacity-50 active:scale-[0.98] transition-all shadow-sm shadow-[#00B67A]/10"
                    >
                      {isUploading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          <span>{locale === 'ar' ? 'تحميل الملف' : 'Upload'}</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Attachments List */}
                <div className="sm:col-span-2 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-[#2A2C4E] uppercase tracking-wider border-b border-slate-100 pb-2">
                    {locale === 'ar' ? 'الملفات المرفقة' : 'Current Attachments'}
                  </h4>

                  {candidate.documents.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">
                      {locale === 'ar' ? 'لا يوجد ملفات مرفوعة.' : 'No files uploaded.'}
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {candidate.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-xl hover:bg-slate-100/50 transition-colors">
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-700 block truncate max-w-xs md:max-w-md" title={doc.fileName}>
                              {doc.fileName}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5 inline-block bg-slate-200/50 px-1.5 py-0.5 rounded">
                              {doc.type}
                            </span>
                          </div>

                          <div className="flex gap-2 shrink-0 ltr:ml-2 rtl:mr-2">
                            <a
                              href={getDocumentUrl(doc.fileUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-[#00B67A] transition-all border border-transparent hover:border-slate-150"
                              title={locale === 'ar' ? 'تحميل' : 'Download'}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-[#E54B4B] transition-all border border-transparent hover:border-slate-150"
                              title={locale === 'ar' ? 'حذف' : 'Delete'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: Applications History */}
          {activeTab === 'applications' && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-[#2A2C4E] border-b border-slate-100 pb-2">
                {locale === 'ar' ? 'سجل طلبات التقديم للوظائف' : 'Applications History'}
              </h4>

              {candidate.applications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  {locale === 'ar' ? 'لم يتقدم هذا المترشح لأي وظائف بعد.' : 'This candidate has not applied to any job openings yet.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 px-4 rtl:text-right">{t('jobs.jobTitle')}</th>
                        <th className="py-2.5 px-4 rtl:text-right">{locale === 'ar' ? 'العميل' : 'Client'}</th>
                        <th className="py-2.5 px-4 rtl:text-right">{locale === 'ar' ? 'تاريخ التقديم' : 'Applied Date'}</th>
                        <th className="py-2.5 px-4 rtl:text-right">{locale === 'ar' ? 'المرحلة الحالية' : 'Stage'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {candidate.applications.map((app) => (
                        <tr key={app.id}>
                          <td className="py-3 px-4 font-bold text-[#1A1C29] rtl:text-right">
                            <button
                              onClick={() => router.push(`/${locale}/jobs/${app.jobOpening.id}?type=opening`)}
                              className="text-[#2A2C4E] hover:text-[#00B67A] transition-colors hover:underline"
                            >
                              {app.jobOpening.title}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-slate-500 rtl:text-right">
                            {app.jobOpening.company.name}
                          </td>
                          <td className="py-3 px-4 text-slate-400 rtl:text-right">
                            {new Date(app.createdAt).toLocaleDateString(locale)}
                          </td>
                          <td className="py-3 px-4 rtl:text-right">
                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                              {app.stage.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: Recommended Jobs */}
          {activeTab === 'recommended_jobs' && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h4 className="text-sm font-bold text-[#2A2C4E]">
                  {locale === 'ar' ? 'الوظائف المقترحة بالذكاء الاصطناعي' : 'AI Recommended Jobs'}
                </h4>
                <span className="text-xs text-slate-400 font-medium">Sorted by semantic compatibility score</span>
              </div>

              {loadingJobs ? (
                <div className="flex flex-col items-center justify-center py-12 text-indigo-500">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  <p className="text-xs font-semibold">Running matching algorithms...</p>
                </div>
              ) : recommendedJobs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  {locale === 'ar' ? 'لا يوجد وظائف مقترحة لهذا المترشح حالياً.' : 'No recommended jobs matching this candidate profile found.'}
                </p>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 font-bold uppercase text-slate-400">
                        <th className="py-2.5 px-4 rtl:text-right">{t('jobs.jobTitle')}</th>
                        <th className="py-2.5 px-4 rtl:text-right">{locale === 'ar' ? 'القسم' : 'Department'}</th>
                        <th className="py-2.5 px-4 rtl:text-right">{locale === 'ar' ? 'الموقع' : 'Location'}</th>
                        <th className="py-2.5 px-4 rtl:text-right">{locale === 'ar' ? 'الميزانية' : 'Salary Budget'}</th>
                        <th className="py-2.5 px-4 rtl:text-right">{locale === 'ar' ? 'نسبة التطابق' : 'Match Score'}</th>
                        <th className="py-2.5 px-4 text-right rtl:text-left"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {recommendedJobs.map((job: any) => {
                        const score = Math.round((job.match_score || 0) * 100);
                        const salaryText = job.salaryMin || job.salaryMax 
                          ? `${job.salaryMin ? Number(job.salaryMin).toLocaleString() : ''} - ${job.salaryMax ? Number(job.salaryMax).toLocaleString() : ''} SAR` 
                          : 'Not specified';

                        const handleQuickApply = async () => {
                          try {
                            await api.post('/applications', {
                              candidateId: id,
                              jobOpeningId: job.id,
                              stage: 'SCREENING'
                            });
                            alert(locale === 'ar' ? 'تم التقديم على الوظيفة بنجاح!' : 'Successfully applied to job opening!');
                            fetchRecommendedJobs();
                          } catch (e: any) {
                            alert(e.response?.data?.message || 'Failed to apply candidate');
                          }
                        };

                        return (
                          <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-bold text-[#1A1C29] rtl:text-right">
                              <button
                                onClick={() => router.push(`/${locale}/jobs/${job.id}?type=opening`)}
                                className="text-[#2A2C4E] hover:text-[#00B67A] transition-colors hover:underline text-left font-bold"
                              >
                                {job.title}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-slate-500 rtl:text-right">{job.department}</td>
                            <td className="py-3 px-4 text-slate-500 rtl:text-right">{job.location}</td>
                            <td className="py-3 px-4 text-slate-500 rtl:text-right">{salaryText}</td>
                            <td className="py-3 px-4 rtl:text-right font-bold text-indigo-600">
                              <div className="flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-indigo-500" />
                                <span>{score}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right rtl:text-left">
                              <button
                                onClick={handleQuickApply}
                                className="bg-[#00B67A] text-white hover:bg-emerald-600 px-3 py-1 rounded-lg font-bold transition-all active:scale-[0.98]"
                              >
                                {locale === 'ar' ? 'تقديم سريع' : 'Quick Apply'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Candidate Profile Drawer Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#1A1C29]/40 backdrop-blur-sm transition-all duration-300">
          <div className="flex h-full w-full flex-col bg-white shadow-2xl ltr:rounded-l-2xl sm:max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-[#1A1C29]">
                {locale === 'ar' ? 'تعديل بيانات المترشح' : 'Edit Candidate Profile'}
              </h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#1A1C29]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="flex flex-1 flex-col overflow-y-auto p-6 space-y-5">
              {/* First Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('candidates.firstName')} <span className="text-[#E54B4B]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              {/* Last Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('candidates.lastName')} <span className="text-[#E54B4B]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('candidates.email')}
                </label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('candidates.phone')}
                </label>
                <input
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              {/* LinkedIn URL */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={editFormData.linkedinUrl}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, linkedinUrl: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              {/* Nationality */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('candidates.nationality')}
                </label>
                <input
                  type="text"
                  value={editFormData.nationality}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, nationality: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              {/* Location */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('candidates.location')}
                </label>
                <input
                  type="text"
                  value={editFormData.currentLocation}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, currentLocation: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              {/* Expected Salary */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('candidates.expectedSalary')}
                </label>
                <input
                  type="number"
                  value={editFormData.expectedSalary}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, expectedSalary: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              {/* Availability */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('candidates.availability')}
                </label>
                <select
                  value={editFormData.availability}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, availability: e.target.value as any }))}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                >
                  <option value="AVAILABLE">{t('candidates.AVAILABLE')}</option>
                  <option value="NOTICE_PERIOD">{t('candidates.NOTICE_PERIOD')}</option>
                  <option value="EMPLOYED">{t('candidates.EMPLOYED')}</option>
                  <option value="UNAVAILABLE">{t('candidates.UNAVAILABLE')}</option>
                </select>
              </div>

              {/* Source */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('candidates.source')}
                </label>
                <input
                  type="text"
                  value={editFormData.source}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, source: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 border-t border-slate-100 pt-6">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/20 hover:bg-[#009b67] active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <span>{locale === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 active:scale-[0.98] transition-all"
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
