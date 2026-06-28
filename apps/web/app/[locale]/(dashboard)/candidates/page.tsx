'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  UserCheck,
  Sparkles,
} from 'lucide-react';

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  currentLocation: string | null;
  expectedSalary: number | null;
  availability: 'AVAILABLE' | 'NOTICE_PERIOD' | 'EMPLOYED' | 'UNAVAILABLE';
  skills: Array<{ id: string; skillName: string }>;
  experience: Array<{
    id: string;
    companyName: string;
    title: string;
    isCurrent: boolean;
  }>;
}

interface Pool {
  id: string;
  name: string;
  _count?: {
    members: number;
  };
}

export default function CandidatesPage() {
  const t = useTranslations('ats');
  const navT = useTranslations('nav');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pools, setPools] = useState<Pool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Search & Filters state
  const [search, setSearch] = useState('');
  const [skillsFilter, setSkillsFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [salaryMaxFilter, setSalaryMaxFilter] = useState('');
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJobFilter, setSelectedJobFilter] = useState('');

  // Modals state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quickFormData, setQuickFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentLocation: '',
    nationality: '',
    expectedSalary: '',
    availability: 'AVAILABLE' as Candidate['availability'],
    source: '',
  });

  // Add to Pool State
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [targetPoolId, setTargetPoolId] = useState('');
  const [isAddingToPool, setIsAddingToPool] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Bulk Upload CVs State
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Array<{
    fileName: string;
    status: 'pending' | 'uploading' | 'parsing' | 'success' | 'duplicate' | 'failed';
    error?: string;
    candidateName?: string;
  }>>([]);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
      setUploadProgress(
        filesArray.map((f) => ({
          fileName: f.name,
          status: 'pending',
        }))
      );
    }
  };

  const handleBulkUploadSubmit = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessingBulk(true);

    let successCount = 0;
    let duplicateCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (!file) continue;
      
      setUploadProgress((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: 'uploading' } : item
        )
      );

      const formData = new FormData();
      formData.append('file', file);

      try {
        setUploadProgress((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'parsing' } : item
          )
        );

        const response = await api.post('/candidates/parse-cv', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data?.success) {
          const { created, duplicated, candidate } = response.data;
          const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName}` : '';
          
          if (created) {
            successCount++;
            setUploadProgress((prev) =>
              prev.map((item, idx) =>
                idx === i
                  ? { ...item, status: 'success', candidateName }
                  : item
              )
            );
          } else if (duplicated) {
            duplicateCount++;
            setUploadProgress((prev) =>
              prev.map((item, idx) =>
                idx === i
                  ? { ...item, status: 'duplicate', candidateName }
                  : item
              )
            );
          }
        } else {
          failCount++;
          setUploadProgress((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: 'failed', error: 'Unknown response' } : item
            )
          );
        }
      } catch (err: any) {
        failCount++;
        const errMsg = err.response?.data?.message || err.message || 'Parsing failed';
        setUploadProgress((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'failed', error: errMsg } : item
          )
        );
      }
    }

    setIsProcessingBulk(false);
    fetchCandidates();

    const summaryMsg = locale === 'ar'
      ? `اكتمل الرفع: تم استيراد ${successCount}، وتخطي ${duplicateCount} مكرر، وفشل ${failCount}.`
      : `Upload completed: ${successCount} imported, ${duplicateCount} duplicates skipped, ${failCount} failed.`;
    setSuccessMsg(summaryMsg);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const fetchCandidates = () => {
    setIsLoading(true);
    if (selectedJobFilter) {
      api.get(`/ai/jobs/${selectedJobFilter}/matches`)
        .then((res) => {
          if (res.data?.success) {
            setCandidates(res.data.data);
            setTotal(res.data.data.length);
          }
        })
        .catch((err) => {
          setErrorMsg(err.response?.data?.message || 'Failed to load matching candidates');
        })
        .finally(() => {
          setIsLoading(false);
        });
      return;
    }

    const paramsObj: any = { page, limit };
    if (search) paramsObj.search = search;
    if (skillsFilter) paramsObj.skills = skillsFilter;
    if (locationFilter) paramsObj.location = locationFilter;
    if (availabilityFilter) paramsObj.availability = availabilityFilter;
    if (salaryMaxFilter) paramsObj.expectedSalaryMax = parseFloat(salaryMaxFilter);

    api.get('/candidates', { params: paramsObj })
      .then((res) => {
        if (res.data?.success) {
          setCandidates(res.data.candidates);
          setTotal(res.data.meta.total);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load candidates');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const fetchJobs = () => {
    api.get('/jobs/openings', { params: { limit: 100 } })
      .then((res) => {
        if (res.data?.success) {
          setJobs(res.data.openings || []);
        }
      })
      .catch(() => {});
  };

  const fetchPools = () => {
    api.get('/candidates/pools')
      .then((res) => {
        if (res.data?.success) {
          setPools(res.data.data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchCandidates();
  }, [page, search, skillsFilter, locationFilter, availabilityFilter, salaryMaxFilter, selectedJobFilter]);

  useEffect(() => {
    fetchPools();
    fetchJobs();
  }, []);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      ...quickFormData,
      expectedSalary: quickFormData.expectedSalary ? parseFloat(quickFormData.expectedSalary) : undefined,
      email: quickFormData.email || undefined,
      phone: quickFormData.phone || undefined,
      currentLocation: quickFormData.currentLocation || undefined,
      nationality: quickFormData.nationality || undefined,
      source: quickFormData.source || undefined,
    };

    try {
      const res = await api.post('/candidates', payload);
      setSuccessMsg(locale === 'ar' ? 'تم تسجيل المترشح بنجاح' : 'Candidate registered successfully');
      setIsQuickAddOpen(false);
      fetchCandidates();
      
      // Redirect to detailed view to add experience/skills
      if (res.data?.data?.id) {
        router.push(`/${locale}/candidates/${res.data.data.id}`);
      }
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create candidate');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenPoolModal = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setTargetPoolId(pools[0]?.id || '');
    setIsPoolModalOpen(true);
  };

  const handleAddToPoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidateId || !targetPoolId) return;

    setIsAddingToPool(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.post(`/candidates/pools/${targetPoolId}/members`, {
        candidateId: selectedCandidateId,
      });
      setSuccessMsg(locale === 'ar' ? 'تمت إضافة المترشح إلى القائمة بنجاح' : 'Candidate added to pool successfully');
      setIsPoolModalOpen(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to add to pool');
    } finally {
      setIsAddingToPool(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف هذا المترشح؟' : 'Are you sure you want to delete this candidate?')) {
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.delete(`/candidates/${id}`);
      setSuccessMsg(locale === 'ar' ? 'تم حذف ملف المترشح بنجاح' : 'Candidate deleted successfully');
      fetchCandidates();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete candidate');
    }
  };

  const getAvailabilityClass = (av: Candidate['availability']) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">{t('candidates.title')}</h2>
          <p className="text-sm text-slate-500">
            {locale === 'ar'
              ? 'إدارة قاعدة بيانات المترشحين، الفرز، البحث المتقدم والمواهب.'
              : 'Manage candidates database, advanced lookup, filters, and talent pools.'}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Pools page redirect button */}
          <button
            onClick={() => router.push(`/${locale}/pools`)}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-[#2A2C4E] hover:bg-slate-50 transition-all active:scale-[0.98]"
          >
            <FolderOpen className="h-5 w-5" />
            <span>{t('pools.title')}</span>
          </button>

          {/* Bulk Upload Button */}
          <button
            onClick={() => setIsBulkUploadOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-[#2A2C4E] hover:bg-slate-50 transition-all active:scale-[0.98]"
          >
            <Users className="h-5 w-5 text-slate-500" />
            <span>{locale === 'ar' ? 'رفع جماعي' : 'Bulk Upload CVs'}</span>
          </button>
          
          <button
            onClick={() => router.push(`/${locale}/candidates/new`)}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/25 transition-all hover:bg-[#009b67] hover:shadow-[#00B67A]/35 active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" />
            <span>{t('candidates.addCandidate')}</span>
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

      {/* Main Grid Layout: Filters on left/right, Table on other side */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm h-fit space-y-5">
          {/* Job Recommendation Filter */}
          <div className="space-y-1 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
            <label className="text-[11px] font-extrabold text-indigo-500 uppercase tracking-wider block flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{locale === 'ar' ? 'الترشيحات الذكية للوظائف' : 'AI Job Recommendations'}</span>
            </label>
            <select
              value={selectedJobFilter}
              onChange={(e) => {
                setSelectedJobFilter(e.target.value);
                setPage(1);
                // Clear other filters to avoid confusion
                if (e.target.value) {
                  setSearch('');
                  setSkillsFilter('');
                  setLocationFilter('');
                  setAvailabilityFilter('');
                  setSalaryMaxFilter('');
                }
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-indigo-500 transition-all font-semibold"
            >
              <option value="">{locale === 'ar' ? 'اختر وظيفة لعرض مرشحيها المقترحين' : 'Select a job to find matches'}</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
            {selectedJobFilter && (
              <span className="text-[10px] text-indigo-500 block mt-1 leading-snug">
                {locale === 'ar' ? '💡 يظهر هذا الفلتر أفضل المرشحين تطابقاً مع متطلبات الوظيفة مرتبين تنازلياً.' : '💡 Showing top candidates compatible with this job, sorted by compatibility score.'}
              </span>
            )}
          </div>

          {/* Search Bar inside Filters */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {locale === 'ar' ? 'بحث بالاسم / البريد' : 'Search Name / Email'}
            </label>
            <div className="relative">
              <Search className="absolute top-3 h-4 w-4 text-slate-400 ltr:left-3 rtl:right-3" />
              <input
                type="text"
                placeholder={locale === 'ar' ? 'اكتب للبحث...' : 'Search...'}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 outline-none focus:border-[#00B67A] focus:bg-white text-xs ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3 transition-all"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t('candidates.location')}
            </label>
            <input
              type="text"
              placeholder="e.g. Riyadh"
              value={locationFilter}
              onChange={(e) => { setLocationFilter(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
            />
          </div>

          {/* Availability */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t('candidates.availability')}
            </label>
            <select
              value={availabilityFilter}
              onChange={(e) => { setAvailabilityFilter(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-[#00B67A] focus:bg-white transition-all"
            >
              <option value="">{locale === 'ar' ? 'الكل' : 'All'}</option>
              <option value="AVAILABLE">{t('candidates.AVAILABLE')}</option>
              <option value="NOTICE_PERIOD">{t('candidates.NOTICE_PERIOD')}</option>
              <option value="EMPLOYED">{t('candidates.EMPLOYED')}</option>
              <option value="UNAVAILABLE">{t('candidates.UNAVAILABLE')}</option>
            </select>
          </div>

          {/* Max Salary */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {locale === 'ar' ? 'الحد الأقصى للراتب المتوقع' : 'Max Expected Salary'}
            </label>
            <input
              type="number"
              placeholder="e.g. 15000"
              value={salaryMaxFilter}
              onChange={(e) => { setSalaryMaxFilter(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
            />
          </div>

          {/* Skills (Comma Separated) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t('candidates.skills')}
            </label>
            <input
              type="text"
              placeholder="e.g. React, Node, SQL"
              value={skillsFilter}
              onChange={(e) => { setSkillsFilter(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
            />
            <span className="text-[10px] text-slate-400 block mt-1">
              {locale === 'ar' ? 'افصل بين المهارات بفاصلة (,)' : 'Separate skills with commas (,)'}
            </span>
          </div>

          <button
            onClick={() => {
              setSearch('');
              setSkillsFilter('');
              setLocationFilter('');
              setAvailabilityFilter('');
              setSalaryMaxFilter('');
              setSelectedJobFilter('');
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            {locale === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
          </button>
        </div>

        {/* Candidate List Table */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-50 bg-white/50">
              <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center h-96">
              <Users className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-base font-bold text-[#1A1C29]">{t('candidates.noCandidates')}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {locale === 'ar' ? 'ابدأ بتسجيل مترشحين جدد في قاعدة البيانات.' : 'Start adding new candidates to the database.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-4 rtl:text-right">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                      <th className="px-6 py-4 rtl:text-right">{t('candidates.location')}</th>
                      <th className="px-6 py-4 rtl:text-right">{locale === 'ar' ? 'أحدث وظيفة' : 'Recent Experience'}</th>
                      <th className="px-6 py-4 rtl:text-right">{t('candidates.expectedSalary')}</th>
                      <th className="px-6 py-4 rtl:text-right">{t('candidates.availability')}</th>
                      <th className="px-6 py-4 text-right rtl:text-left">{locale === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {candidates.map((cand) => {
                      const latestExp = cand.experience[0];
                      return (
                        <tr key={cand.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="whitespace-nowrap px-6 py-4 font-bold text-[#1A1C29] rtl:text-right">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => router.push(`/${locale}/candidates/${cand.id}`)}
                                className="text-left font-bold text-[#2A2C4E] hover:text-[#00B67A] transition-colors rtl:text-right"
                              >
                                {cand.firstName} {cand.lastName}
                              </button>
                              {(cand as any).match_score !== undefined && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
                                  <Sparkles className="h-2.5 w-2.5 text-indigo-500" />
                                  <span>{Math.round((cand as any).match_score * 100)}%</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-normal text-slate-400 mt-0.5">
                              {cand.email || '-'}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                            {cand.currentLocation || '-'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-slate-600 rtl:text-right">
                            {latestExp ? (
                              <div>
                                <div className="font-semibold text-slate-700">{latestExp.title}</div>
                                <div className="text-xs text-slate-400">{latestExp.companyName}</div>
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-slate-600 rtl:text-right">
                            {cand.expectedSalary ? `${cand.expectedSalary.toLocaleString()} ${locale === 'ar' ? 'ريال' : 'SAR'}` : '-'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 rtl:text-right">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getAvailabilityClass(cand.availability)}`}>
                              {t(`candidates.${cand.availability}`)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-slate-500 rtl:text-left">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => router.push(`/${locale}/candidates/${cand.id}`)}
                                title={locale === 'ar' ? 'عرض التفاصيل' : 'View details'}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#2A2C4E]"
                              >
                                <Eye className="h-4.5 w-4.5" />
                              </button>
                              <button
                                onClick={() => handleOpenPoolModal(cand.id)}
                                title={t('pools.addToPool')}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#00B67A]"
                              >
                                <FolderOpen className="h-4.5 w-4.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(cand.id)}
                                title={locale === 'ar' ? 'حذف' : 'Delete'}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#E54B4B]"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {total > limit && (
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/20 px-6 py-4">
                  <span className="text-xs text-slate-400">
                    {locale === 'ar' ? `إجمالي المترشحين: ${total}` : `Total candidates: ${total}`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
                    >
                      {locale === 'ar' ? 'السابق' : 'Previous'}
                    </button>
                    <button
                      disabled={page * limit >= total}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
                    >
                      {locale === 'ar' ? 'التالي' : 'Next'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Candidate to Pool Modal */}
      {isPoolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1C29]/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#1A1C29] mb-4">
              {t('pools.addMember')}
            </h3>
            {pools.length === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  {locale === 'ar'
                    ? 'لم يتم إنشاء أي قائمة مترشحين بعد. يمكنك إنشاء واحدة أولاً.'
                    : 'No candidate pools have been created yet. Create one first.'}
                </p>
                <button
                  type="button"
                  onClick={() => router.push(`/${locale}/pools`)}
                  className="w-full rounded-xl bg-[#00B67A] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#009b67] transition-all"
                >
                  {t('pools.addPool')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPoolModalOpen(false)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all mt-2"
                >
                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleAddToPoolSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'اختر قائمة المترشحين' : 'Select Target Pool'}
                  </label>
                  <select
                    value={targetPoolId}
                    onChange={(e) => setTargetPoolId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                  >
                    {pools.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p._count?.members || 0} {locale === 'ar' ? 'مترشح' : 'members'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isAddingToPool}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#009b67] active:scale-[0.98] disabled:opacity-50 transition-all"
                  >
                    {isAddingToPool ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span>{t('pools.addToPool')}</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPoolModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 active:scale-[0.98] transition-all"
                  >
                    {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Bulk Upload CVs Modal */}
      {isBulkUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1C29]/40 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-[#1A1C29]">
                {locale === 'ar' ? 'رفع جماعي للسير الذاتية بالذكاء الاصطناعي' : 'AI Bulk Upload CVs'}
              </h3>
              <button
                disabled={isProcessingBulk}
                onClick={() => {
                  setIsBulkUploadOpen(false);
                  setSelectedFiles([]);
                  setUploadProgress([]);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drag & Drop Area */}
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="relative border-2 border-dashed border-slate-200 hover:border-[#00B67A] rounded-2xl p-6 bg-slate-50/50 hover:bg-slate-50/20 text-center transition-all">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileChange}
                  disabled={isProcessingBulk}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Users className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  {locale === 'ar' ? 'اسحب وأفلت السير الذاتية هنا' : 'Drag & drop CVs here'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {locale === 'ar' ? 'يدعم PDF, DOCX, TXT حتى 5 ميجابايت للملف' : 'Supports PDF, DOCX, TXT up to 5MB per file'}
                </p>
              </div>

              {/* Uploading progress list */}
              {uploadProgress.length > 0 && (
                <div className="space-y-2 border border-slate-100 rounded-2xl p-4 bg-slate-50/30 max-h-60 overflow-y-auto">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {locale === 'ar' ? 'قائمة الملفات والتقدم' : 'Files list & Progress'}
                  </h4>
                  {uploadProgress.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100/50 last:border-0">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-semibold text-slate-700 truncate" title={item.fileName}>
                          {item.fileName}
                        </span>
                        {item.candidateName && (
                          <span className="text-[10px] text-[#00B67A] font-semibold mt-0.5">
                            {locale === 'ar' ? `المترشح: ${item.candidateName}` : `Candidate: ${item.candidateName}`}
                          </span>
                        )}
                        {item.error && (
                          <span className="text-[10px] text-rose-500 font-medium mt-0.5">
                            {item.error}
                          </span>
                        )}
                      </div>

                      <div className="shrink-0 pl-2">
                        {item.status === 'pending' && (
                          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                            {locale === 'ar' ? 'قيد الانتظار' : 'Pending'}
                          </span>
                        )}
                        {item.status === 'uploading' && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>{locale === 'ar' ? 'جاري الرفع...' : 'Uploading...'}</span>
                          </span>
                        )}
                        {item.status === 'parsing' && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>{locale === 'ar' ? 'تحليل الذكاء الاصطناعي...' : 'AI Parsing...'}</span>
                          </span>
                        )}
                        {item.status === 'success' && (
                          <span className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                            {locale === 'ar' ? 'مكتمل' : 'Imported'}
                          </span>
                        )}
                        {item.status === 'duplicate' && (
                          <span className="inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600" title={locale === 'ar' ? 'تم تخطيه لأنه مكرر' : 'Skipped duplicate profile'}>
                            {locale === 'ar' ? 'مكرر (تخطي)' : 'Duplicate'}
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="inline-flex rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                            {locale === 'ar' ? 'فشل' : 'Failed'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t border-slate-100 pt-4 mt-4">
              <button
                type="button"
                onClick={handleBulkUploadSubmit}
                disabled={isProcessingBulk || selectedFiles.length === 0}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#009b67] active:scale-[0.98] disabled:opacity-50 transition-all"
              >
                {isProcessingBulk ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>{locale === 'ar' ? 'بدأ استيراد السير الذاتية' : 'Start CV Import'}</span>
                )}
              </button>
              <button
                type="button"
                disabled={isProcessingBulk}
                onClick={() => {
                  setIsBulkUploadOpen(false);
                  setSelectedFiles([]);
                  setUploadProgress([]);
                }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                {locale === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
