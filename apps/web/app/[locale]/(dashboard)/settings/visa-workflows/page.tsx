'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '../../../../../lib/api';
import { Plus, Globe, Settings2, Trash2, Check, AlertCircle, Loader2 } from 'lucide-react';

interface Stage {
  name: string;
  order: number;
}

interface Workflow {
  id?: string;
  country: string;
  description: string;
  stages: Stage[];
}

export default function VisaWorkflowsSettingsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New workflow form state
  const [isCreating, setIsCreating] = useState(false);
  const [newCountry, setNewCountry] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStages, setNewStages] = useState<Stage[]>([{ name: '', order: 1 }]);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const res = await api.get('/visa-workflows');
      if (res.data?.success) {
        setWorkflows(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStage = () => {
    setNewStages([...newStages, { name: '', order: newStages.length + 1 }]);
  };

  const handleStageNameChange = (index: number, name: string) => {
    const updated = [...newStages];
    if (updated[index]) {
      updated[index].name = name;
      setNewStages(updated);
    }
  };

  const handleSaveNewWorkflow = async () => {
    if (!newCountry || newStages.some(s => !s.name)) return;
    setSaving(true);
    try {
      await api.post('/visa-workflows', {
        country: newCountry,
        description: newDesc,
        stages: newStages.map((s, i) => ({ name: s.name, order: i + 1 })),
      });
      setIsCreating(false);
      setNewCountry('');
      setNewDesc('');
      setNewStages([{ name: '', order: 1 }]);
      fetchWorkflows();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      await api.delete(`/visa-workflows/${id}`);
      fetchWorkflows();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29]">Visa Processing Workflows</h2>
          <p className="text-sm text-slate-500 mt-1">Configure dynamic post-placement mobilization stages per country.</p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 rounded-xl bg-[#2A2C4E] px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-[#1f213b]"
          >
            <Plus className="h-4 w-4" />
            Create Workflow
          </button>
        )}
      </div>

      {isCreating && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-[#00B67A]" />
            <h3 className="text-lg font-bold text-[#1A1C29]">New Country Workflow</h3>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 mb-6">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Country Name</label>
              <input
                type="text"
                placeholder="e.g. Saudi Arabia"
                value={newCountry}
                onChange={e => setNewCountry(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-[#00B67A] focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Description (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Standard KSA Visa Process"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-[#00B67A] focus:bg-white"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-500">Stages (in order)</label>
            {newStages.map((stage, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 shrink-0">
                  {i + 1}
                </span>
                <input
                  type="text"
                  placeholder="e.g. Medical Examination"
                  value={stage.name}
                  onChange={e => handleStageNameChange(i, e.target.value)}
                  className="w-full sm:w-96 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-[#00B67A] focus:bg-white"
                />
              </div>
            ))}
            <button
              onClick={handleAddStage}
              className="mt-2 flex items-center gap-1 text-sm font-bold text-[#00B67A] hover:underline"
            >
              <Plus className="h-4 w-4" /> Add Stage
            </button>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={handleSaveNewWorkflow}
              disabled={saving}
              className="rounded-xl bg-[#00B67A] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#009b67] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Workflow'}
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="rounded-xl px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {workflows.map(wf => (
          <div key={wf.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1A1C29]">{wf.country}</h3>
                  <p className="text-xs text-slate-500">{wf.description || 'No description provided.'}</p>
                </div>
              </div>
              <button
                onClick={() => wf.id && handleDelete(wf.id)}
                className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {wf.stages.map((st, idx) => (
                <React.Fragment key={st.name}>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5">
                    <span className="text-[10px] font-bold text-slate-400">{st.order}</span>
                    <span className="text-sm font-medium text-slate-700">{st.name}</span>
                  </div>
                  {idx < wf.stages.length - 1 && (
                    <div className="flex items-center text-slate-300">→</div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}

        {workflows.length === 0 && !isCreating && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <Globe className="mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-base font-bold text-[#1A1C29]">No Workflows Defined</h3>
            <p className="mt-1 text-sm text-slate-400">Create your first visa processing workflow to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
