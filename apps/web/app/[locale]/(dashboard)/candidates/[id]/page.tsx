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

    // Handle localhost URL replacements
    if (apiUrl && (resolvedUrl.startsWith('http://localhost') || resolvedUrl.startsWith('http://127.0.0.1'))) {
      try {
        const urlObj = new URL(resolvedUrl);
        let apiCleanUrl = apiUrl;
        if (!apiCleanUrl.startsWith('http://') && !apiCleanUrl.startsWith('https://')) {
          apiCleanUrl = `https://${apiCleanUrl}`;
        }
        const apiDomain = new URL(apiCleanUrl);
        urlObj.protocol = apiDomain.protocol;
        urlObj.host = apiDomain.host;
        return urlObj.toString();
      } catch (e) {
        let cleanApi = apiUrl;
        if (!cleanApi.startsWith('http://') && !cleanApi.startsWith('https://')) {
          cleanApi = `https://${cleanApi}`;
        }
        return resolvedUrl.replace(/^http:\/\/(localhost|127\.0\.0\.1):\d*/, cleanApi.replace(/\/$/, ''));
      }
    }
    return resolvedUrl;
  };

  const [candidate, setCandidate] = useState<CandidateDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'skills' | 'applications'>('overview');

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

  useEffect(() => {
    if (id) {
      fetchCandidateDetails();
    }
  }, [id]);

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
