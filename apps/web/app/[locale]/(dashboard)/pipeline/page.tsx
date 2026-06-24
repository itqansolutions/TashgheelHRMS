'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import AddToPipelineModal from '../../../../components/pipeline/add-to-pipeline-modal';
import ApplicationDrawer from '../../../../components/pipeline/application-drawer';
import {
  GitPullRequest,
  Plus,
  Filter,
  Briefcase,
  Building2,
  MapPin,
  Loader2,
  CheckCircle2,
  AlertCircle,
  User,
  PlusCircle,
} from 'lucide-react';

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  currentLocation: string | null;
  availability: string;
}

interface Application {
  id: string;
  stage: 'NEW_APPLICATION' | 'SCREENING' | 'HR_INTERVIEW' | 'TECHNICAL_INTERVIEW' | 'ASSESSMENT' | 'OFFER' | 'PLACEMENT' | 'REJECTED' | 'WITHDRAWN';
  createdAt: string;
  updatedAt: string;
  candidate: Candidate;
  recruiter: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface JobOpening {
  id: string;
  title: string;
  company: {
    name: string;
  };
}

export default function PipelinePage() {
  const t = useTranslations('ats');
  const navT = useTranslations('nav');
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const router = useRouter();

  const initialJobOpeningId = searchParams.get('jobId') || '';

  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
  const [selectedJobId, setSelectedJobId] = useState(initialJobOpeningId);
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);

  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isLoadingPipeline, setIsLoadingPipeline] = useState(false);

  // Drag over columns state
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  // Modals / Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedAppIdForDrawer, setSelectedAppIdForDrawer] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pipelineStages: Array<Application['stage']> = [
    'NEW_APPLICATION',
    'SCREENING',
    'HR_INTERVIEW',
    'TECHNICAL_INTERVIEW',
    'ASSESSMENT',
    'OFFER',
    'PLACEMENT',
    'REJECTED',
  ];

  const fetchJobOpenings = () => {
    setIsLoadingJobs(true);
    api.get('/jobs/openings', { params: { limit: 100 } })
      .then((res) => {
        if (res.data?.success) {
          const openings = res.data.openings;
          setJobOpenings(openings);
          // Auto-select first opening if no jobId query param exists
          if (!selectedJobId && openings.length > 0) {
            setSelectedJobId(openings[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoadingJobs(false);
      });
  };

  const fetchPipelineData = (jobId: string) => {
    setIsLoadingPipeline(true);
    setErrorMsg(null);
    api.get(`/applications/pipeline/${jobId}`)
      .then((res) => {
        if (res.data?.success) {
          setApplications(res.data.data);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load pipeline applications');
      })
      .finally(() => {
        setIsLoadingPipeline(false);
      });
  };

  useEffect(() => {
    fetchJobOpenings();
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      const match = jobOpenings.find((o) => o.id === selectedJobId) || null;
      setSelectedJob(match);
      fetchPipelineData(selectedJobId);
      // Synchronize URL search params
      router.replace(`/${locale}/pipeline?jobId=${selectedJobId}`, { scroll: false });
    } else {
      setSelectedJob(null);
      setApplications([]);
    }
  }, [selectedJobId, jobOpenings]);

  // Native HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, appId: string) => {
    e.dataTransfer.setData('text/plain', appId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (draggedOverColumn !== stage) {
      setDraggedOverColumn(stage);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: Application['stage']) => {
    e.preventDefault();
    setDraggedOverColumn(null);

    const appId = e.dataTransfer.getData('text/plain');
    if (!appId) return;

    // Find the application and see if stage is already the same
    const app = applications.find((a) => a.id === appId);
    if (!app || app.stage === targetStage) return;

    // Perform optimistic UI state update
    const previousApplications = [...applications];
    setApplications(
      applications.map((a) => (a.id === appId ? { ...a, stage: targetStage } : a))
    );

    try {
      await api.patch(`/applications/${appId}/stage`, { stage: targetStage });
      setSuccessMsg(
        locale === 'ar' ? 'تم تحديث مرحلة المترشح بنجاح' : 'Pipeline stage updated successfully'
      );
      setTimeout(() => setSuccessMsg(null), 2000);
      
      // Reload timeline and pipeline details
      if (selectedJobId) {
        fetchPipelineData(selectedJobId);
      }
    } catch (err: any) {
      // Revert optimistic updates
      setApplications(previousApplications);
      setErrorMsg(err.response?.data?.message || 'Failed to update pipeline stage');
    }
  };

  const getStageLabel = (stage: Application['stage']) => {
    switch (stage) {
      case 'NEW_APPLICATION':
        return locale === 'ar' ? 'تقديم جديد' : 'New Application';
      case 'SCREENING':
        return locale === 'ar' ? 'الفرز والتدقيق' : 'Screening';
      case 'HR_INTERVIEW':
        return locale === 'ar' ? 'مقابلة HR' : 'HR Interview';
      case 'TECHNICAL_INTERVIEW':
        return locale === 'ar' ? 'مقابلة فنية' : 'Tech Interview';
      case 'ASSESSMENT':
        return locale === 'ar' ? 'التقييم' : 'Assessment';
      case 'OFFER':
        return locale === 'ar' ? 'العرض الوظيفي' : 'Offer';
      case 'PLACEMENT':
        return locale === 'ar' ? 'التعيين' : 'Placement';
      case 'REJECTED':
        return locale === 'ar' ? 'مرفوض' : 'Rejected';
      default:
        return stage;
    }
  };

  const getAvailabilityBadgeClass = (av: string) => {
    switch (av) {
      case 'AVAILABLE':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'NOTICE_PERIOD':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'EMPLOYED':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'UNAVAILABLE':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden">
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">{navT('pipeline')}</h2>
          <p className="text-sm text-slate-500">
            {locale === 'ar'
              ? 'تتبع عمليات التوظيف ومراحل المترشحين وسجل الملاحظات عبر لوحة Kanban.'
              : 'Track candidate stages, schedule interviews, and log notes via Kanban boards.'}
          </p>
        </div>

        <div className="flex gap-2">
          {/* Create application shortcut button */}
          <button
            disabled={!selectedJobId}
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/25 transition-all hover:bg-[#009b67] hover:shadow-[#00B67A]/35 active:scale-[0.98] disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            <span>{locale === 'ar' ? 'تقديم مترشح لوظيفة' : 'Add to Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {successMsg && (
        <div className="shrink-0 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-600">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="shrink-0 flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-600">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Controls & Filter Panel */}
      <div className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-3 shrink-0">
        {/* Job Opening Dropdown selector */}
        <div className="relative col-span-2">
          <select
            value={selectedJobId}
            disabled={isLoadingJobs}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-[#EBF0FA]/20 px-4 py-2.5 outline-none focus:border-[#00B67A] focus:bg-white text-sm text-slate-700 font-bold transition-all"
          >
            {isLoadingJobs ? (
              <option>{locale === 'ar' ? 'جاري تحميل الوظائف الشاغرة...' : 'Loading Job Openings...'}</option>
            ) : jobOpenings.length === 0 ? (
              <option>{locale === 'ar' ? 'لا يوجد وظائف شاغرة نشطة' : 'No Active Job Openings found'}</option>
            ) : (
              jobOpenings.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} ({job.company.name})
                </option>
              ))
            )}
          </select>
          <Filter className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:right-4 rtl:left-4 pointer-events-none" />
        </div>

        {selectedJob && (
          <div className="flex items-center text-xs text-slate-500 font-medium ltr:pl-2 rtl:pr-2">
            <Building2 className="h-4 w-4 text-slate-400 mr-1.5 shrink-0" />
            <span className="truncate">{selectedJob.company.name}</span>
          </div>
        )}
      </div>

      {/* Kanban Board Container */}
      {isLoadingPipeline ? (
        <div className="flex-1 flex items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-inner">
          <Loader2 className="h-10 w-10 animate-spin text-[#00B67A]" />
        </div>
      ) : !selectedJobId ? (
        <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <GitPullRequest className="mb-4 h-16 w-16 text-slate-300" />
          <h3 className="text-base font-bold text-[#1A1C29]">{locale === 'ar' ? 'يرجى اختيار وظيفة شاغرة' : 'No Active Job Selected'}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {locale === 'ar' ? 'اختر وظيفة شاغرة من القائمة لعرض المترشحين المتقدمين لها.' : 'Select an active job opening from the list above to view candidate pipeline.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 h-full min-w-max pb-2">
            {pipelineStages.map((stage) => {
              const stageApps = applications.filter((app) => app.stage === stage);
              const isOver = draggedOverColumn === stage;

              return (
                <div
                  key={stage}
                  onDragOver={(e) => handleDragOver(e, stage)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage)}
                  className={`w-72 shrink-0 rounded-2xl border transition-all flex flex-col h-full max-h-[600px] overflow-hidden ${
                    isOver
                      ? 'border-[#00B67A] bg-emerald-50/10 shadow-lg shadow-[#00B67A]/5'
                      : 'border-slate-100 bg-slate-50/50'
                  }`}
                >
                  {/* Column Header */}
                  <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 bg-white shrink-0">
                    <span className="text-xs font-bold text-[#2A2C4E]">{getStageLabel(stage)}</span>
                    <span className="inline-flex h-5 items-center justify-center rounded-full bg-[#EBF0FA] px-2 text-[10px] font-extrabold text-[#2A2C4E]">
                      {stageApps.length}
                    </span>
                  </div>

                  {/* Cards List container */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {stageApps.length === 0 ? (
                      <div className="h-28 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl text-[10px] text-slate-400 select-none">
                        {locale === 'ar' ? 'اسحب المترشحين هنا' : 'Drag applicants here'}
                      </div>
                    ) : (
                      stageApps.map((app) => (
                        <div
                          key={app.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, app.id)}
                          onClick={() => setSelectedAppIdForDrawer(app.id)}
                          className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-grab active:cursor-grabbing space-y-3"
                        >
                          <div className="space-y-0.5 rtl:text-right">
                            <span className="text-xs font-bold text-[#2A2C4E] block hover:text-[#00B67A] transition-colors">
                              {app.candidate.firstName} {app.candidate.lastName}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">{app.candidate.email || '-'}</span>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-[9px] text-slate-400">
                            <span className={`px-1.5 py-0.5 rounded border font-semibold ${getAvailabilityBadgeClass(app.candidate.availability)}`}>
                              {t(`candidates.${app.candidate.availability}`)}
                            </span>
                            
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-slate-300" />
                              <span className="truncate max-w-[80px]">{app.recruiter.firstName}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add To Pipeline Modal dialog */}
      <AddToPipelineModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => selectedJobId && fetchPipelineData(selectedJobId)}
        locale={locale}
        initialJobOpeningId={selectedJobId}
      />

      {/* Detailed Side-Drawer panel */}
      <ApplicationDrawer
        applicationId={selectedAppIdForDrawer}
        isOpen={selectedAppIdForDrawer !== null}
        onClose={() => setSelectedAppIdForDrawer(null)}
        onTransitionSuccess={() => selectedJobId && fetchPipelineData(selectedJobId)}
        locale={locale}
      />
    </div>
  );
}
