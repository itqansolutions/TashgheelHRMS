'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '../../lib/api';
import {
  X,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Briefcase,
} from 'lucide-react';

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

interface JobOpening {
  id: string;
  title: string;
  company: {
    name: string;
  };
}

interface AddToPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locale: string;
  initialJobOpeningId?: string;
}

export default function AddToPipelineModal({
  isOpen,
  onClose,
  onSuccess,
  locale,
  initialJobOpeningId,
}: AddToPipelineModalProps) {
  const t = useTranslations('ats');
  const [openings, setOpenings] = useState<JobOpening[]>([]);
  const [selectedJobId, setSelectedJobId] = useState(initialJobOpeningId || '');

  // Candidate Search
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isSearchingCandidates, setIsSearchingCandidates] = useState(false);

  // Form states
  const [initialStage, setInitialStage] = useState('NEW_APPLICATION');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load active job openings
    api.get('/jobs/openings', { params: { limit: 100, status: 'OPEN' } })
      .then((res) => {
        if (res.data?.success) {
          setOpenings(res.data.openings);
          if (!selectedJobId && res.data.openings.length > 0) {
            setSelectedJobId(res.data.openings[0].id);
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Search Candidates
  useEffect(() => {
    if (candidateSearch.trim().length < 2) {
      setCandidates([]);
      return;
    }
    setIsSearchingCandidates(true);
    api.get('/candidates', { params: { search: candidateSearch, limit: 5 } })
      .then((res) => {
        if (res.data?.success) {
          setCandidates(res.data.candidates);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsSearchingCandidates(false);
      });
  }, [candidateSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate || !selectedJobId) {
      setErrorMsg(locale === 'ar' ? 'يرجى اختيار المترشح والوظيفة الشاغرة' : 'Please select candidate and job opening');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.post('/applications', {
        candidateId: selectedCandidate.id,
        jobOpeningId: selectedJobId,
        stage: initialStage,
      });

      setSuccessMsg(locale === 'ar' ? 'تمت إضافة المترشح للمراحل بنجاح' : 'Candidate added to pipeline successfully');
      setTimeout(() => {
        setSuccessMsg(null);
        onSuccess();
        onClose();
        // Reset states
        setSelectedCandidate(null);
        setCandidateSearch('');
        setInitialStage('NEW_APPLICATION');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1C29]/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-lg font-bold text-[#1A1C29] mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-[#00B67A]" />
          <span>{locale === 'ar' ? 'إضافة مترشح لمراحل التوظيف' : 'Add Candidate to Pipeline'}</span>
        </h3>

        {/* Success/Error Alerts */}
        {successMsg && (
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-600">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-600">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Step 1: Candidate Search Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              {locale === 'ar' ? 'البحث عن مترشح' : 'Search Candidate'} <span className="text-[#E54B4B]">*</span>
            </label>

            {selectedCandidate ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-sm">
                <div className="rtl:text-right">
                  <span className="font-bold text-[#2A2C4E]">
                    {selectedCandidate.firstName} {selectedCandidate.lastName}
                  </span>
                  <span className="text-slate-500 block text-xs">{selectedCandidate.email || '-'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute top-3 h-4 w-4 text-slate-400 ltr:left-3 rtl:right-3" />
                <input
                  type="text"
                  required
                  placeholder={locale === 'ar' ? 'اكتب اسم المترشح أو بريده للبحث...' : 'Type candidate name/email...'}
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/10 py-2.5 outline-none focus:border-[#00B67A] focus:bg-white text-sm ltr:pl-9 ltr:pr-4 rtl:pr-9 rtl:pl-4 transition-all"
                />
                {isSearchingCandidates && (
                  <Loader2 className="absolute top-3.5 h-4 w-4 animate-spin text-[#00B67A] ltr:right-3 rtl:left-3" />
                )}

                {/* Dropdown list results */}
                {candidates.length > 0 && (
                  <div className="border border-slate-100 rounded-xl bg-white shadow-lg overflow-hidden divide-y divide-slate-100 absolute z-10 w-full mt-1 max-h-48 overflow-y-auto">
                    {candidates.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCandidate(c)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 flex-1 rtl:text-right">
                          <span className="font-bold text-[#2A2C4E] block">{c.firstName} {c.lastName}</span>
                          <span className="text-slate-400 block mt-0.5 truncate">{c.email || '-'}</span>
                        </div>
                        <PlusCircle className="h-5 w-5 text-[#00B67A] shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Job Opening Selector */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {locale === 'ar' ? 'الوظيفة الشاغرة المستهدفة' : 'Target Job Opening'} <span className="text-[#E54B4B]">*</span>
            </label>
            <select
              value={selectedJobId}
              required
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#00B67A] focus:bg-white transition-all"
            >
              <option value="" disabled>{locale === 'ar' ? 'اختر وظيفة...' : 'Select job opening...'}</option>
              {openings.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} — {o.company.name}
                </option>
              ))}
            </select>
          </div>

          {/* Step 3: Initial Stage Selection */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {locale === 'ar' ? 'المرحلة المبدئية' : 'Initial Stage'}
            </label>
            <select
              value={initialStage}
              onChange={(e) => setInitialStage(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#00B67A] focus:bg-white transition-all"
            >
              <option value="NEW_APPLICATION">{locale === 'ar' ? 'طلب تقديم جديد' : 'New Application'}</option>
              <option value="SCREENING">{locale === 'ar' ? 'الفرز والتدقيق' : 'Screening'}</option>
              <option value="HR_INTERVIEW">{locale === 'ar' ? 'المقابلة المبدئية' : 'HR Interview'}</option>
              <option value="TECHNICAL_INTERVIEW">{locale === 'ar' ? 'المقابلة الفنية' : 'Technical Interview'}</option>
              <option value="ASSESSMENT">{locale === 'ar' ? 'التقييم' : 'Assessment'}</option>
              <option value="OFFER">{locale === 'ar' ? 'العرض الوظيفي' : 'Offer'}</option>
              <option value="PLACEMENT">{locale === 'ar' ? 'التعيين' : 'Placement'}</option>
            </select>
          </div>

          {/* Submit Actions */}
          <div className="flex gap-3 border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={isSaving || !selectedCandidate || !selectedJobId}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/20 hover:bg-[#009b67] active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</span>
                </>
              ) : (
                <span>{locale === 'ar' ? 'إضافة إلى خط التوظيف' : 'Add to Pipeline'}</span>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 active:scale-[0.98] transition-all"
            >
              {locale === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
