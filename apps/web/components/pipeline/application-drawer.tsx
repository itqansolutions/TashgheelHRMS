'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Building2,
  MapPin,
  Clock,
  ExternalLink,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Trash2,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';

interface StageLog {
  id: string;
  fromStage: string | null;
  toStage: string;
  note: string | null;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

interface ApplicationDetails {
  id: string;
  stage: string;
  createdAt: string;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    linkedinUrl: string | null;
    availability: string;
  };
  jobOpening: {
    id: string;
    title: string;
    company: {
      name: string;
    };
    requisition: {
      department: string;
      location: string;
      type: string;
    };
  };
  recruiter: {
    firstName: string;
    lastName: string;
  };
  stageLogs: StageLog[];
}

interface ApplicationDrawerProps {
  applicationId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onTransitionSuccess: () => void;
  locale: string;
}

export default function ApplicationDrawer({
  applicationId,
  isOpen,
  onClose,
  onTransitionSuccess,
  locale,
}: ApplicationDrawerProps) {
  const t = useTranslations('ats');
  const router = useRouter();

  const [appDetails, setAppDetails] = useState<ApplicationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Transition form state
  const [targetStage, setTargetStage] = useState('');
  const [transitionNote, setTransitionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchApplicationDetails = () => {
    if (!applicationId) return;
    setIsLoading(true);
    setErrorMsg(null);
    api.get(`/applications/${applicationId}`)
      .then((res) => {
        if (res.data?.success) {
          setAppDetails(res.data.data);
          setTargetStage(res.data.data.stage);
          setTransitionNote('');
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load application details');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen && applicationId) {
      fetchApplicationDetails();
    } else {
      setAppDetails(null);
    }
  }, [applicationId, isOpen]);

  const handleStageTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationId || !targetStage) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.patch(`/applications/${applicationId}/stage`, {
        stage: targetStage,
        note: transitionNote.trim() || undefined,
      });

      // Refresh details and Kanban board
      fetchApplicationDetails();
      onTransitionSuccess();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update pipeline stage');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!applicationId) return;
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف طلب التقديم هذا؟ سيتم حذف جميع سجلات المراحل والمقابلات المرتبطة به.' : 'Are you sure you want to delete this application? All associated transition logs and scheduled interviews will be lost.')) {
      return;
    }

    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await api.delete(`/applications/${applicationId}`);
      onTransitionSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete application');
      setIsDeleting(false);
    }
  };

  const getStageLabel = (stage: string) => {
    // Maps standard stages to localized labels
    switch (stage) {
      case 'NEW_APPLICATION':
        return locale === 'ar' ? 'تقديم جديد' : 'New Application';
      case 'SCREENING':
        return locale === 'ar' ? 'الفرز والتدقيق' : 'Screening';
      case 'HR_INTERVIEW':
        return locale === 'ar' ? 'مقابلة الموارد البشرية' : 'HR Interview';
      case 'TECHNICAL_INTERVIEW':
        return locale === 'ar' ? 'المقابلة الفنية' : 'Technical Interview';
      case 'ASSESSMENT':
        return locale === 'ar' ? 'التقييم' : 'Assessment';
      case 'OFFER':
        return locale === 'ar' ? 'تقديم العرض الوظيفي' : 'Offer';
      case 'PLACEMENT':
        return locale === 'ar' ? 'التعيين' : 'Placement';
      case 'REJECTED':
        return locale === 'ar' ? 'مستبعد / مرفوض' : 'Rejected';
      case 'WITHDRAWN':
        return locale === 'ar' ? 'انسحاب المترشح' : 'Withdrawn';
      default:
        return stage.replace(/_/g, ' ');
    }
  };

  const getStageBadgeClass = (stage: string) => {
    switch (stage) {
      case 'PLACEMENT':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'OFFER':
        return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'REJECTED':
      case 'WITHDRAWN':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'NEW_APPLICATION':
        return 'bg-slate-50 text-slate-500 border-slate-100';
      default:
        return 'bg-amber-50 text-amber-600 border-amber-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#1A1C29]/40 backdrop-blur-sm transition-all duration-300">
      <div className="flex h-full w-full flex-col bg-white shadow-2xl ltr:rounded-l-2xl rtl:rounded-r-2xl sm:max-w-lg overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#1A1C29]">
              {locale === 'ar' ? 'تفاصيل طلب التوظيف' : 'Application Details'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#1A1C29]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-600">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Drawer Content */}
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
          </div>
        ) : appDetails ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Candidate Box */}
            <div className="bg-[#EBF0FA]/20 border border-slate-100 rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00B67A] text-lg font-bold text-white">
                  {appDetails.candidate.firstName[0]}
                </div>
                <div className="min-w-0 flex-1 rtl:text-right">
                  <h4 className="text-base font-bold text-[#2A2C4E]">
                    {appDetails.candidate.firstName} {appDetails.candidate.lastName}
                  </h4>
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold mt-1 ${getStageBadgeClass(appDetails.stage)}`}>
                    {getStageLabel(appDetails.stage)}
                  </span>
                </div>
              </div>

              <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2 pt-2 border-t border-slate-100">
                {appDetails.candidate.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate">{appDetails.candidate.email}</span>
                  </div>
                )}
                {appDetails.candidate.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{appDetails.candidate.phone}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => router.push(`/${locale}/candidates/${appDetails.candidate.id}`)}
                className="w-full text-center text-xs font-bold text-[#00B67A] hover:underline flex items-center justify-center gap-1 border border-dashed border-[#00B67A]/30 rounded-lg py-2 hover:bg-[#00B67A]/5 transition-colors"
              >
                <span>{locale === 'ar' ? 'عرض الملف الكامل للمترشح' : 'View Full Candidate Profile'}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Job Opening info */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {locale === 'ar' ? 'الوظيفة المتقدم لها' : 'Target Job Opening'}
              </h5>
              <div className="border border-slate-100 rounded-2xl p-4 text-sm text-slate-600 space-y-2.5 rtl:text-right">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-[#2A2C4E] block">{appDetails.jobOpening.title}</span>
                    <span className="text-xs text-slate-400 inline-flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3" />
                      <span>{appDetails.jobOpening.company.name}</span>
                    </span>
                  </div>
                  <button
                    onClick={() => router.push(`/${locale}/jobs/${appDetails.jobOpening.id}?type=opening`)}
                    className="text-slate-400 hover:text-[#00B67A]"
                    title="View Job Details"
                  >
                    <ExternalLink className="h-4.5 w-4.5" />
                  </button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                    <span>{appDetails.jobOpening.requisition.department}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{appDetails.jobOpening.requisition.location}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transition Stage Form Widget */}
            <div className="space-y-3 border-t border-slate-100 pt-5">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {locale === 'ar' ? 'تحديث مرحلة التوظيف' : 'Transition Pipeline Stage'}
              </h5>

              <form onSubmit={handleStageTransitionSubmit} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {locale === 'ar' ? 'المرحلة الجديدة' : 'New Stage'}
                    </label>
                    <select
                      value={targetStage}
                      onChange={(e) => setTargetStage(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-3.5 py-2.5 text-xs text-slate-700 outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                    >
                      <option value="NEW_APPLICATION">{locale === 'ar' ? 'تقديم جديد' : 'New Application'}</option>
                      <option value="SCREENING">{locale === 'ar' ? 'الفرز والتدقيق' : 'Screening'}</option>
                      <option value="HR_INTERVIEW">{locale === 'ar' ? 'مقابلة الموارد البشرية' : 'HR Interview'}</option>
                      <option value="TECHNICAL_INTERVIEW">{locale === 'ar' ? 'المقابلة الفنية' : 'Technical Interview'}</option>
                      <option value="ASSESSMENT">{locale === 'ar' ? 'التقييم' : 'Assessment'}</option>
                      <option value="OFFER">{locale === 'ar' ? 'تقديم العرض الوظيفي' : 'Offer'}</option>
                      <option value="PLACEMENT">{locale === 'ar' ? 'التعيين' : 'Placement'}</option>
                      <option value="REJECTED">{locale === 'ar' ? 'مستبعد / مرفوض' : 'Rejected'}</option>
                      <option value="WITHDRAWN">{locale === 'ar' ? 'انسحاب المترشح' : 'Withdrawn'}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {locale === 'ar' ? 'ملاحظة الانتقال' : 'Transition Note'}
                    </label>
                    <input
                      type="text"
                      placeholder={locale === 'ar' ? 'أدخل سبباً للفرز أو ملاحظة...' : 'e.g. Cleared HR round'}
                      value={transitionNote}
                      onChange={(e) => setTransitionNote(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-3.5 py-2.5 text-xs text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || targetStage === appDetails.stage}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#2A2C4E] py-2.5 text-xs font-bold text-white hover:bg-[#3d406b] active:scale-[0.98] disabled:opacity-50 transition-all shadow-md shadow-[#2A2C4E]/10"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>{locale === 'ar' ? 'تحديث المرحلة وحفظ الملاحظة' : 'Update Stage & Log note'}</span>
                  )}
                </button>
              </form>
            </div>

            {/* Stage Logs Timeline history */}
            <div className="space-y-3 border-t border-slate-100 pt-5">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {locale === 'ar' ? 'سجل مراحل التقديم المكتملة' : 'Stage Transition Logs Timeline'}
              </h5>

              {appDetails.stageLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  {locale === 'ar' ? 'لا يوجد سجل للمراحل.' : 'No transition logs found.'}
                </p>
              ) : (
                <div className="relative border-s border-slate-100 space-y-6 ltr:pl-4 rtl:pr-4 ltr:ml-2 rtl:mr-2 pt-2">
                  {appDetails.stageLogs.map((log) => (
                    <div key={log.id} className="relative">
                      <span className="absolute -left-[21px] ltr:-left-[21px] rtl:-right-[21px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-slate-300 ring-4 ring-slate-100"></span>

                      <div className="space-y-1 text-xs rtl:text-right">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {log.fromStage ? (
                            <>
                              <span className="font-semibold text-slate-500">{getStageLabel(log.fromStage)}</span>
                              {locale === 'en' ? <ArrowRight className="h-3 w-3 text-slate-400" /> : <ArrowLeft className="h-3 w-3 text-slate-400" />}
                            </>
                          ) : null}
                          <span className="font-bold text-[#2A2C4E]">{getStageLabel(log.toStage)}</span>
                        </div>

                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(log.createdAt).toLocaleString(locale)} — {log.user.firstName} {log.user.lastName}
                          </span>
                        </div>

                        {log.note && (
                          <p className="bg-slate-50 rounded-lg p-2.5 text-slate-600 italic border border-slate-100/50 mt-1 flex items-start gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span>{log.note}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick action shortcuts */}
            <div className="space-y-3 border-t border-slate-100 pt-5">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {locale === 'ar' ? 'إجراءات سريعة' : 'Downstream Pipeline Actions'}
              </h5>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  onClick={() => router.push(`/${locale}/interviews?appId=${appDetails.id}`)}
                  className="rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#2A2C4E] transition-colors"
                >
                  {locale === 'ar' ? 'جدولة مقابلة' : 'Schedule Interview'}
                </button>
                <button
                  onClick={() => router.push(`/${locale}/offers?appId=${appDetails.id}`)}
                  className="rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#2A2C4E] transition-colors"
                >
                  {locale === 'ar' ? 'تقديم عرض وظيفي' : 'Generate Offer'}
                </button>
              </div>
            </div>

            {/* Delete button */}
            <div className="border-t border-slate-100 pt-5">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50/50 py-3 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>{locale === 'ar' ? 'إزالة طلب التقديم من النظام' : 'Delete Application'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
