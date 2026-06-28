'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import {
  Globe,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Plane,
} from 'lucide-react';

interface VisaWorkflowStage {
  id: string;
  name: string;
  order: number;
}

interface VisaWorkflow {
  id: string;
  country: string;
  stages: VisaWorkflowStage[];
}

interface VisaCase {
  id: string;
  currentStageId: string | null;
  status: string;
  country: string | null;
  candidate: { firstName: string; lastName: string; availability: string; email: string };
  jobOpening: { title: string; company: { name: string } };
  coordinator: { firstName: string; lastName: string } | null;
}

export default function VisaProcessingPage() {
  const t = useTranslations('ats');
  const params = useParams();
  const locale = params.locale as string;

  const [workflows, setWorkflows] = useState<VisaWorkflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<VisaWorkflow | null>(null);

  const [visaCases, setVisaCases] = useState<VisaCase[]>([]);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(true);
  const [isLoadingCases, setIsLoadingCases] = useState(false);

  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  useEffect(() => {
    if (selectedWorkflowId) {
      const match = workflows.find(w => w.id === selectedWorkflowId) || null;
      setSelectedWorkflow(match);
      fetchVisaCases(selectedWorkflowId);
    } else {
      setSelectedWorkflow(null);
      setVisaCases([]);
    }
  }, [selectedWorkflowId, workflows]);

  const fetchWorkflows = async () => {
    setIsLoadingWorkflows(true);
    try {
      const res = await api.get('/visa-workflows');
      if (res.data?.success) {
        setWorkflows(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedWorkflowId(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingWorkflows(false);
    }
  };

  const fetchVisaCases = async (workflowId: string) => {
    setIsLoadingCases(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/visa-cases/kanban', { params: { workflowId } });
      if (res.data?.success) {
        setVisaCases(res.data.data);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load visa cases');
    } finally {
      setIsLoadingCases(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, caseId: string) => {
    e.dataTransfer.setData('text/plain', caseId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggedOverColumn !== stageId) {
      setDraggedOverColumn(stageId);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDraggedOverColumn(null);

    const caseId = e.dataTransfer.getData('text/plain');
    if (!caseId) return;

    const vc = visaCases.find(v => v.id === caseId);
    if (!vc || vc.currentStageId === targetStageId) return;

    const previousCases = [...visaCases];
    setVisaCases(visaCases.map(v => v.id === caseId ? { ...v, currentStageId: targetStageId } : v));

    try {
      await api.patch(`/visa-cases/${caseId}/stage`, { stageId: targetStageId });
      setSuccessMsg('Stage updated successfully');
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err: any) {
      setVisaCases(previousCases);
      setErrorMsg(err.response?.data?.message || 'Failed to update stage');
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">Visa Processing</h2>
          <p className="text-sm text-slate-500">
            Manage dynamic post-placement visa and mobilization workflows.
          </p>
        </div>
      </div>

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

      <div className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-3 shrink-0">
        <div className="relative col-span-2">
          <select
            value={selectedWorkflowId}
            disabled={isLoadingWorkflows}
            onChange={(e) => setSelectedWorkflowId(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-[#EBF0FA]/20 px-4 py-2.5 outline-none focus:border-[#2A2C4E] focus:bg-white text-sm text-slate-700 font-bold transition-all"
          >
            {isLoadingWorkflows ? (
              <option>Loading Workflows...</option>
            ) : workflows.length === 0 ? (
              <option>No Workflows configured</option>
            ) : (
              workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  Workflow: {w.country}
                </option>
              ))
            )}
          </select>
          <Globe className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:right-4 rtl:left-4 pointer-events-none" />
        </div>
      </div>

      {isLoadingCases ? (
        <div className="flex-1 flex items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-inner">
          <Loader2 className="h-10 w-10 animate-spin text-[#2A2C4E]" />
        </div>
      ) : !selectedWorkflow ? (
        <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Plane className="mb-4 h-16 w-16 text-slate-300" />
          <h3 className="text-base font-bold text-[#1A1C29]">No Workflow Selected</h3>
          <p className="mt-1 text-sm text-slate-400">Select a country workflow to view active visa cases.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 h-full min-w-max pb-2">
            {selectedWorkflow.stages.map((stage) => {
              const stageCases = visaCases.filter(vc => vc.currentStageId === stage.id);
              const isOver = draggedOverColumn === stage.id;

              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => handleDragOver(e, stage.id)}
                  onDragLeave={() => setDraggedOverColumn(null)}
                  onDrop={(e) => handleDrop(e, stage.id)}
                  className={`w-72 shrink-0 rounded-2xl border transition-all flex flex-col h-full max-h-[600px] overflow-hidden ${
                    isOver
                      ? 'border-[#2A2C4E] bg-indigo-50/20 shadow-lg'
                      : 'border-slate-100 bg-slate-50/50'
                  }`}
                >
                  <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 bg-white shrink-0">
                    <span className="text-xs font-bold text-[#2A2C4E]">{stage.name}</span>
                    <span className="inline-flex h-5 items-center justify-center rounded-full bg-[#EBF0FA] px-2 text-[10px] font-extrabold text-[#2A2C4E]">
                      {stageCases.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {stageCases.length === 0 ? (
                      <div className="h-28 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl text-[10px] text-slate-400 select-none">
                        Drag cases here
                      </div>
                    ) : (
                      stageCases.map((vc) => (
                        <div
                          key={vc.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, vc.id)}
                          className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-grab active:cursor-grabbing space-y-3"
                        >
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-[#2A2C4E] block">
                              {vc.candidate.firstName} {vc.candidate.lastName}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {vc.jobOpening.title} - {vc.jobOpening.company.name}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-[9px] text-slate-400">
                            <span className="px-1.5 py-0.5 rounded border font-semibold bg-slate-100 text-slate-700">
                              {vc.status}
                            </span>
                            
                            {vc.coordinator && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-slate-300" />
                                <span className="truncate max-w-[80px]">{vc.coordinator.firstName}</span>
                              </div>
                            )}
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
    </div>
  );
}
