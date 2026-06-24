'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import {
  FolderOpen,
  Plus,
  Search,
  User,
  Trash2,
  Eye,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';

interface Pool {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count?: {
    members: number;
  };
}

interface PoolDetails extends Pool {
  members: Array<{
    candidate: {
      id: string;
      firstName: string;
      lastName: string;
      email: string | null;
      availability: 'AVAILABLE' | 'NOTICE_PERIOD' | 'EMPLOYED' | 'UNAVAILABLE';
      currentLocation: string | null;
    };
  }>;
}

interface CandidateSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

export default function PoolsPage() {
  const t = useTranslations('ats');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<PoolDetails | null>(null);
  const [isLoadingPools, setIsLoadingPools] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Create Pool Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSavingPool, setIsSavingPool] = useState(false);
  const [poolFormData, setPoolFormData] = useState({ name: '', description: '' });

  // Add Candidate to Pool Search State
  const [candSearchQuery, setCandSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CandidateSearchResult[]>([]);
  const [isSearchingCandidates, setIsSearchingCandidates] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPools = (autoSelectFirst = false) => {
    setIsLoadingPools(true);
    api.get('/candidates/pools')
      .then((res) => {
        if (res.data?.success) {
          const list = res.data.data;
          setPools(list);
          if (autoSelectFirst && list.length > 0) {
            setSelectedPoolId(list[0].id);
          }
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load pools');
      })
      .finally(() => {
        setIsLoadingPools(false);
      });
  };

  const fetchPoolDetails = (poolId: string) => {
    setIsLoadingDetails(true);
    api.get(`/candidates/pools/${poolId}`)
      .then((res) => {
        if (res.data?.success) {
          setSelectedPool(res.data.data);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load pool details');
      })
      .finally(() => {
        setIsLoadingDetails(false);
      });
  };

  useEffect(() => {
    fetchPools(true);
  }, []);

  useEffect(() => {
    if (selectedPoolId) {
      fetchPoolDetails(selectedPoolId);
    } else {
      setSelectedPool(null);
    }
  }, [selectedPoolId]);

  // Search Candidates to Add
  useEffect(() => {
    if (candSearchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearchingCandidates(true);
    api.get('/candidates', { params: { search: candSearchQuery, limit: 5 } })
      .then((res) => {
        if (res.data?.success) {
          // Filter out candidates who are already in the pool
          const existingIds = new Set(selectedPool?.members.map((m) => m.candidate.id) || []);
          const filtered = res.data.candidates.filter((c: any) => !existingIds.has(c.id));
          setSearchResults(filtered);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsSearchingCandidates(false);
      });
  }, [candSearchQuery, selectedPool]);

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poolFormData.name.trim()) return;

    setIsSavingPool(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.post('/candidates/pools', poolFormData);
      setSuccessMsg(locale === 'ar' ? 'تم إنشاء قائمة المترشحين بنجاح' : 'Candidate pool created successfully');
      setIsCreateOpen(false);
      setPoolFormData({ name: '', description: '' });
      
      // Reload and select the newly created pool
      if (res.data?.data?.id) {
        setSelectedPoolId(res.data.data.id);
        fetchPools(false);
      } else {
        fetchPools(true);
      }
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create pool');
    } finally {
      setIsSavingPool(false);
    }
  };

  const handleAddMember = async (candidateId: string) => {
    if (!selectedPoolId) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.post(`/candidates/pools/${selectedPoolId}/members`, { candidateId });
      setSuccessMsg(locale === 'ar' ? 'تمت إضافة المترشح بنجاح' : 'Candidate added successfully');
      setCandSearchQuery('');
      setSearchResults([]);
      // Refresh pool members and counts
      fetchPoolDetails(selectedPoolId);
      fetchPools(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to add candidate to pool');
    }
  };

  const handleRemoveMember = async (candidateId: string) => {
    if (!selectedPoolId) return;
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من إزالة هذا المترشح من هذه القائمة؟' : 'Are you sure you want to remove this candidate from this pool?')) {
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.delete(`/candidates/pools/${selectedPoolId}/members/${candidateId}`);
      setSuccessMsg(locale === 'ar' ? 'تمت إزالة المترشح بنجاح' : 'Candidate removed successfully');
      fetchPoolDetails(selectedPoolId);
      fetchPools(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to remove candidate');
    }
  };

  const getAvailabilityClass = (av: string) => {
    switch (av) {
      case 'AVAILABLE':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'NOTICE_PERIOD':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'EMPLOYED':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'UNAVAILABLE':
        return 'bg-rose-50 text-rose-600 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">{t('pools.title')}</h2>
          <p className="text-sm text-slate-500">
            {locale === 'ar'
              ? 'إنشاء مجموعات وقوائم مخصصة لفرز واستهداف المترشحين للمشاريع القادمة.'
              : 'Create custom candidate clusters and watchlists for incoming placement projects.'}
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/25 transition-all hover:bg-[#009b67] hover:shadow-[#00B67A]/35 active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" />
          <span>{t('pools.addPool')}</span>
        </button>
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

      {/* Master-Detail Layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Pools Directory List */}
        <div className="md:col-span-1 space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-[#2A2C4E] uppercase tracking-wider pb-2 border-b border-slate-100">
              {locale === 'ar' ? 'جميع القوائم' : 'All Pools'}
            </h3>

            {isLoadingPools ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#00B67A]" />
              </div>
            ) : pools.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                <FolderOpen className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-xs">{t('pools.noPools')}</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                {pools.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPoolId(p.id)}
                    className={`w-full text-left rounded-xl p-3.5 border transition-all flex items-center justify-between gap-3 ${
                      selectedPoolId === p.id
                        ? 'border-[#00B67A] bg-emerald-50/20 shadow-sm'
                        : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1 rtl:text-right">
                      <span className="text-sm font-bold text-[#2A2C4E] block truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                        {locale === 'ar' ? 'أنشئ بواسطة' : 'By'}: {p.creator.firstName} {p.creator.lastName}
                      </span>
                    </div>
                    <span className="shrink-0 inline-flex items-center justify-center rounded-full bg-[#EBF0FA] text-[#2A2C4E] text-xs font-extrabold px-2.5 py-1">
                      {p._count?.members || 0}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pool Members Detailed View */}
        <div className="md:col-span-2">
          {isLoadingDetails ? (
            <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
              <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
            </div>
          ) : selectedPool ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-6">
              {/* Pool Header Info */}
              <div className="border-b border-slate-100 pb-4 space-y-1.5 rtl:text-right">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#1A1C29]">{selectedPool.name}</h3>
                  <span className="text-xs text-slate-400">
                    {locale === 'ar' ? 'تاريخ الإنشاء' : 'Created'}: {new Date(selectedPool.createdAt).toLocaleDateString(locale)}
                  </span>
                </div>
                {selectedPool.description && (
                  <p className="text-xs text-slate-500 leading-relaxed">{selectedPool.description}</p>
                )}
                <div className="text-[10px] text-slate-400 pt-1">
                  {locale === 'ar' ? 'المالِك' : 'Owner'}: {selectedPool.creator.firstName} {selectedPool.creator.lastName}
                </div>
              </div>

              {/* Add Candidate Search Widget */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  {t('pools.addMember')}
                </label>
                <div className="relative">
                  <Search className="absolute top-3 h-4 w-4 text-slate-400 ltr:left-3 rtl:right-3" />
                  <input
                    type="text"
                    placeholder={locale === 'ar' ? 'ابحث باسم المترشح لإضافته للقائمة...' : 'Search candidate name to add...'}
                    value={candSearchQuery}
                    onChange={(e) => setCandSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/10 py-2.5 outline-none focus:border-[#00B67A] focus:bg-white text-sm ltr:pl-9 ltr:pr-4 rtl:pr-9 rtl:pl-4 transition-all"
                  />
                  {isSearchingCandidates && (
                    <Loader2 className="absolute top-3.5 h-4 w-4 animate-spin text-[#00B67A] ltr:right-3 rtl:left-3" />
                  )}
                </div>

                {/* Candidate Search Dropdown Results */}
                {searchResults.length > 0 && (
                  <div className="border border-slate-100 rounded-xl bg-white shadow-lg overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto absolute z-10 w-full max-w-[500px]">
                    {searchResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleAddMember(c.id)}
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

              {/* Members Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {locale === 'ar' ? 'أعضاء القائمة' : 'Pool Members'}
                </h4>

                {selectedPool.members.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-150">
                    <User className="mb-3 h-10 w-10 text-slate-300" />
                    <p className="text-xs text-slate-400">
                      {locale === 'ar' ? 'لا يوجد مترشحين في هذه القائمة حالياً. ابحث بالأعلى لإضافتهم.' : 'No candidates in this pool. Search above to add them.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/30 text-xs font-bold uppercase tracking-wider text-slate-400">
                          <th className="py-2.5 px-4 rtl:text-right">{t('candidates.firstName')}</th>
                          <th className="py-2.5 px-4 rtl:text-right">{t('candidates.email')}</th>
                          <th className="py-2.5 px-4 rtl:text-right">{t('candidates.location')}</th>
                          <th className="py-2.5 px-4 rtl:text-right">{t('candidates.availability')}</th>
                          <th className="py-2.5 px-4 text-right rtl:text-left"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {selectedPool.members.map(({ candidate: c }) => (
                          <tr key={c.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-3 px-4 font-bold text-[#1A1C29] rtl:text-right">
                              {c.firstName} {c.lastName}
                            </td>
                            <td className="py-3 px-4 text-slate-500 rtl:text-right">
                              {c.email || '-'}
                            </td>
                            <td className="py-3 px-4 text-slate-500 rtl:text-right">
                              {c.currentLocation || '-'}
                            </td>
                            <td className="py-3 px-4 rtl:text-right">
                              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getAvailabilityClass(c.availability)}`}>
                                {t(`candidates.${c.availability}`)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right rtl:text-left">
                              <div className="flex justify-end items-center gap-2">
                                <button
                                  onClick={() => router.push(`/${locale}/candidates/${c.id}`)}
                                  title={locale === 'ar' ? 'الملف الشخصي' : 'View Profile'}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#00B67A]"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleRemoveMember(c.id)}
                                  title={locale === 'ar' ? 'إزالة من القائمة' : 'Remove from Pool'}
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#E54B4B]"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center h-96">
              <FolderOpen className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="text-base font-bold text-[#1A1C29]">{locale === 'ar' ? 'لا يوجد قائمة مختارة' : 'No Pool Selected'}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {locale === 'ar' ? 'اختر قائمة من القائمة الجانبية لعرض وتعديل المترشحين.' : 'Select a candidate pool from the sidebar to view members.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Pool Dialog Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1C29]/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#1A1C29] mb-4">
              {t('pools.addPool')}
            </h3>
            <form onSubmit={handleCreatePool} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('pools.name')} <span className="text-[#E54B4B]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={poolFormData.name}
                  onChange={(e) => setPoolFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={locale === 'ar' ? 'مثال: مهندسي React في الرياض' : 'e.g. Riyadh React Engineers'}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('pools.description')}
                </label>
                <textarea
                  rows={3}
                  value={poolFormData.description}
                  onChange={(e) => setPoolFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder={locale === 'ar' ? 'تفاصيل حول المستهدفين من هذه القائمة...' : 'Details about candidates matching this pool...'}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingPool}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#009b67] active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                  {isSavingPool ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>{t('pools.addPool')}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 active:scale-[0.98] transition-all"
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
