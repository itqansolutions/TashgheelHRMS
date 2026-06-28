'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useAuthStore } from '../../../../store/auth';
import { api } from '../../../../lib/api';
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Video,
  MapPin,
  Clock,
  User,
  MessageSquare,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react';

interface Interview {
  id: string;
  type: string;
  scheduledAt: string;
  location: string | null;
  videoLink: string | null;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  application: {
    id: string;
    candidate: { id: string; firstName: string; lastName: string };
    jobOpening: { id: string; title: string; company: { name: string } };
  };
  interviewers: { user: { id: string; firstName: string; lastName: string; avatarUrl: string | null } }[];
  feedbacks: any[];
}

export default function InterviewsPage() {
  const t = useTranslations('ats.interviews');
  const params = useParams();
  const locale = params.locale as string;
  const { user } = useAuthStore();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // AI Questions Modal state
  const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsText, setQuestionsText] = useState('');
  const [questionsMeta, setQuestionsMeta] = useState({ candidateName: '', jobTitle: '' });

  const handleGenerateAiQuestions = async (
    candidateId: string,
    jobOpeningId: string,
    candidateName: string,
    jobTitle: string,
  ) => {
    setQuestionsMeta({ candidateName, jobTitle });
    setQuestionsText('');
    setQuestionsLoading(true);
    setIsQuestionsModalOpen(true);

    try {
      const response = await api.post('/ai/generate-questions', { candidateId, jobOpeningId });
      if (response.data?.success) {
        setQuestionsText(response.data.data);
      } else {
        setQuestionsText('Failed to generate questions. Please try again.');
      }
    } catch (err: any) {
      setQuestionsText(err.response?.data?.message || 'Error occurred while contacting AI generator.');
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleCopyQuestions = () => {
    navigator.clipboard.writeText(questionsText);
    setSuccessMsg(locale === 'ar' ? 'تم نسخ الأسئلة إلى الحافظة' : 'Questions copied to clipboard');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const limit = 20;

  const fetchInterviews = () => {
    setLoading(true);
    const paramsObj: any = { page, limit };
    if (status) paramsObj.status = status;

    api.get('/interviews', { params: paramsObj })
      .then((res) => {
        if (res.data?.success) {
          // Client-side search filter since API search might not be deep enough depending on implementation
          let data = res.data.interviews;
          if (search) {
            data = data.filter((i: Interview) => 
              i.application.candidate.firstName.toLowerCase().includes(search.toLowerCase()) ||
              i.application.candidate.lastName.toLowerCase().includes(search.toLowerCase()) ||
              i.application.jobOpening.title.toLowerCase().includes(search.toLowerCase())
            );
          }
          setInterviews(data);
          setTotal(res.data.meta.total);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load interviews');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInterviews();
  }, [page, status, search]);

  const getStatusClass = (status: Interview['status']) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'CANCELLED': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'RESCHEDULED': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  // UI Modal logic would go here. For brevity, focusing on the grid display.
  // In a full implementation, we would add the Scheduling Wizard and Feedback Modal here.

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">{t('title')}</h2>
        </div>
        <button
          onClick={() => { /* open create modal */ }}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#2A2C4E] px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-[#1f213b]"
        >
          <Plus className="h-5 w-5" />
          <span>{t('schedule')}</span>
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
            className="w-full rounded-xl border border-slate-100 bg-slate-50/50 py-2.5 outline-none focus:border-[#2A2C4E] focus:bg-white text-sm ltr:pl-9 ltr:pr-4 rtl:pr-9 rtl:pl-4 transition-all"
          />
        </div>
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 outline-none focus:border-[#2A2C4E] focus:bg-white text-sm text-slate-700 transition-all"
          >
            <option value="">{locale === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
            <option value="SCHEDULED">{locale === 'ar' ? 'مجدول' : 'Scheduled'}</option>
            <option value="COMPLETED">{locale === 'ar' ? 'مكتمل' : 'Completed'}</option>
            <option value="CANCELLED">{locale === 'ar' ? 'ملغى' : 'Cancelled'}</option>
            <option value="RESCHEDULED">{locale === 'ar' ? 'مُعاد جدولته' : 'Rescheduled'}</option>
          </select>
          <Filter className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:right-3 rtl:left-3 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-50 bg-white/50">
          <Loader2 className="h-8 w-8 animate-spin text-[#2A2C4E]" />
        </div>
      ) : interviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <CalendarDays className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="text-base font-bold text-[#1A1C29]">{t('noInterviews')}</h3>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {interviews.map((int) => (
            <div key={int.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="border-b border-slate-50 p-5">
                <div className="flex items-start justify-between mb-4">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusClass(int.status)}`}>
                    {int.status}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-md">
                    {t(int.type)}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-[#1A1C29] mb-1">
                  {int.application.candidate.firstName} {int.application.candidate.lastName}
                </h4>
                <p className="text-sm font-medium text-[#00B67A]">
                  {int.application.jobOpening.title}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {int.application.jobOpening.company.name}
                </p>
              </div>
              <div className="flex-1 bg-slate-50/50 p-5 space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>{new Date(int.scheduledAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                {int.videoLink ? (
                  <div className="flex items-center gap-3 text-sm text-[#2A2C4E] font-medium">
                    <Video className="h-4 w-4 text-[#2A2C4E]" />
                    <a href={int.videoLink} target="_blank" rel="noreferrer" className="hover:underline line-clamp-1">{int.videoLink}</a>
                  </div>
                ) : int.location ? (
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span className="line-clamp-1">{int.location}</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex -space-x-2 rtl:space-x-reverse">
                    {int.interviewers.map((iv, idx) => (
                      <div key={idx} className="h-8 w-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700" title={`${iv.user.firstName} ${iv.user.lastName}`}>
                        {iv.user.firstName[0]}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-slate-500">{t('interviewers')}</span>
                </div>
              </div>
              <div className="border-t border-slate-100 p-4 bg-white flex justify-end gap-2">
                 <button
                   onClick={() => handleGenerateAiQuestions(int.application.candidate.id, int.application.jobOpening.id, `${int.application.candidate.firstName} ${int.application.candidate.lastName}`, int.application.jobOpening.title)}
                   className="text-xs font-bold text-white bg-[#00B67A] hover:bg-[#009b67] px-3 py-2 rounded-lg transition-colors flex items-center gap-1 active:scale-[0.98]"
                 >
                   <Sparkles className="h-3.5 w-3.5" />
                   <span>{locale === 'ar' ? 'أسئلة الذكاء الاصطناعي' : 'AI Questions'}</span>
                 </button>
                 <button className="text-xs font-bold text-[#2A2C4E] bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors">
                   {t('logFeedback')}
                 </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Questions Modal */}
      {isQuestionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1C29]/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#1A1C29] flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#00B67A]" />
                  <span>{locale === 'ar' ? 'أسئلة المقابلة المقترحة بالذكاء الاصطناعي' : 'AI Suggested Interview Questions'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {locale === 'ar'
                    ? `مخصصة للمترشح: ${questionsMeta.candidateName} لوظيفة ${questionsMeta.jobTitle}`
                    : `Tailored for ${questionsMeta.candidateName} applying to ${questionsMeta.jobTitle}`}
                </p>
              </div>
              <button
                onClick={() => setIsQuestionsModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {questionsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
                  <p className="text-xs text-slate-500 font-medium">
                    {locale === 'ar' ? 'جاري تحليل الخلفية المهنية وتوليد الأسئلة...' : 'Analyzing professional background and generating questions...'}
                  </p>
                </div>
              ) : (
                <div className="prose prose-slate max-w-none text-sm text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50/50 p-5 rounded-2xl border border-slate-100/50">
                  {questionsText}
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-100 pt-4 mt-4">
              <button
                type="button"
                onClick={handleCopyQuestions}
                disabled={questionsLoading || !questionsText}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#009b67] active:scale-[0.98] disabled:opacity-50 transition-all"
              >
                {locale === 'ar' ? 'نسخ الأسئلة' : 'Copy to Clipboard'}
              </button>
              <button
                type="button"
                onClick={() => setIsQuestionsModalOpen(false)}
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
