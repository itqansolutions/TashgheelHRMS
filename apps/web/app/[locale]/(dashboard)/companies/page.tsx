'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  ExternalLink,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
  accountManager: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  _count?: {
    contacts: number;
    contracts: number;
    branches: number;
    jobOpenings: number;
  };
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function CompaniesPage() {
  const t = useTranslations('crm');
  const navT = useTranslations('nav');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [accountManagerId, setAccountManagerId] = useState('');

  // Modals & Forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    website: '',
    accountManagerId: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED',
  });

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchCompanies = () => {
    setIsLoading(true);
    const paramsObj: any = { page, limit };
    if (search) paramsObj.search = search;
    if (status) paramsObj.status = status;
    if (accountManagerId) paramsObj.accountManagerId = accountManagerId;

    api.get('/companies', { params: paramsObj })
      .then((res) => {
        if (res.data?.success) {
          setCompanies(res.data.companies);
          setTotal(res.data.meta.total);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load companies');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const fetchUsers = () => {
    api.get('/users')
      .then((res) => {
        if (res.data?.success) {
          setUsers(res.data.users);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchCompanies();
  }, [page, search, status, accountManagerId]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingCompany(null);
    setFormData({
      name: '',
      industry: '',
      website: '',
      accountManagerId: '',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      industry: company.industry || '',
      website: company.website || '',
      accountManagerId: company.accountManager?.id || '',
      status: company.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Clean inputs
    const payload = {
      ...formData,
      industry: formData.industry || undefined,
      website: formData.website || undefined,
      accountManagerId: formData.accountManagerId || undefined,
    };

    try {
      if (editingCompany) {
        await api.patch(`/companies/${editingCompany.id}`, payload);
        setSuccessMsg(locale === 'ar' ? 'تم تحديث بيانات الشركة بنجاح' : 'Company updated successfully');
      } else {
        await api.post('/companies', payload);
        setSuccessMsg(locale === 'ar' ? 'تمت إضافة الشركة بنجاح' : 'Company created successfully');
      }
      setIsModalOpen(false);
      fetchCompanies();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save company');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف هذه الشركة؟' : 'Are you sure you want to delete this company?')) {
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.delete(`/companies/${id}`);
      setSuccessMsg(locale === 'ar' ? 'تم حذف الشركة بنجاح' : 'Company deleted successfully');
      fetchCompanies();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete company');
    }
  };

  const getStatusBadgeClass = (s: Company['status']) => {
    switch (s) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'INACTIVE':
        return 'bg-slate-50 text-slate-500 border-slate-100';
      case 'BLACKLISTED':
        return 'bg-rose-50 text-rose-600 border-rose-100';
    }
  };

  const getStatusLabel = (s: Company['status']) => {
    switch (s) {
      case 'ACTIVE':
        return t('companies.active');
      case 'INACTIVE':
        return t('companies.inactive');
      case 'BLACKLISTED':
        return t('companies.blacklisted');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">{navT('companies')}</h2>
          <p className="text-sm text-slate-500">
            {locale === 'ar' ? 'إدارة شركات العملاء والشركاء وسجل الأنشطة.' : 'Manage client companies, partners, and log activities.'}
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/25 transition-all hover:bg-[#009b67] hover:shadow-[#00B67A]/35 active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" />
          <span>{t('companies.addCompany')}</span>
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

      {/* Search & Filters */}
      <div className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:left-3 rtl:right-3" />
          <input
            type="text"
            placeholder={locale === 'ar' ? 'بحث باسم الشركة...' : 'Search by name...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-100 bg-slate-50/50 py-2.5 outline-none focus:border-[#00B67A] focus:bg-white text-sm ltr:pl-9 ltr:pr-4 rtl:pr-9 rtl:pl-4 transition-all"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 outline-none focus:border-[#00B67A] focus:bg-white text-sm text-slate-700 transition-all"
          >
            <option value="">{locale === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
            <option value="ACTIVE">{t('companies.active')}</option>
            <option value="INACTIVE">{t('companies.inactive')}</option>
            <option value="BLACKLISTED">{t('companies.blacklisted')}</option>
          </select>
          <Filter className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:right-3 rtl:left-3 pointer-events-none" />
        </div>

        {/* Manager Filter */}
        <div className="relative">
          <select
            value={accountManagerId}
            onChange={(e) => { setPage(1); setAccountManagerId(e.target.value); }}
            className="w-full appearance-none rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 outline-none focus:border-[#00B67A] focus:bg-white text-sm text-slate-700 transition-all"
          >
            <option value="">{locale === 'ar' ? 'كل مدراء الحسابات' : 'All Account Managers'}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
          <Filter className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:right-3 rtl:left-3 pointer-events-none" />
        </div>
      </div>

      {/* Companies List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-50 bg-white/50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
            <p className="text-sm text-slate-500">{locale === 'ar' ? 'جاري تحميل الشركات...' : 'Loading companies...'}</p>
          </div>
        </div>
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Building2 className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="text-base font-bold text-[#1A1C29]">{t('companies.noCompanies')}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {locale === 'ar' ? 'ابدأ بإضافة شركات جديدة لمنظمتك.' : 'Start adding new companies to your organization.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4 rtl:text-right">{t('companies.name')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('companies.industry')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('companies.website')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('companies.manager')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('companies.status')}</th>
                  <th className="px-6 py-4 text-right rtl:text-left">{t('companies.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-bold text-[#1A1C29] rtl:text-right">
                      <button
                        onClick={() => router.push(`/${locale}/companies/${company.id}`)}
                        className="text-left font-bold text-[#2A2C4E] hover:text-[#00B67A] transition-colors rtl:text-right"
                      >
                        {company.name}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                      {company.industry || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                      {company.website ? (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-[#00B67A]"
                        >
                          <span>{company.website.replace(/^https?:\/\/(www\.)?/, '')}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-600 rtl:text-right">
                      {company.accountManager
                        ? `${company.accountManager.firstName} ${company.accountManager.lastName}`
                        : '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 rtl:text-right">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(company.status)}`}>
                        {getStatusLabel(company.status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-slate-500 rtl:text-left">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => router.push(`/${locale}/companies/${company.id}`)}
                          title={locale === 'ar' ? 'عرض التفاصيل' : 'View details'}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#2A2C4E]"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(company)}
                          title={locale === 'ar' ? 'تعديل' : 'Edit'}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#00B67A]"
                        >
                          <Edit2 className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(company.id)}
                          title={locale === 'ar' ? 'حذف' : 'Delete'}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#E54B4B]"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/20 px-6 py-4">
              <span className="text-xs text-slate-400">
                {locale === 'ar' ? `إجمالي الشركات: ${total}` : `Total companies: ${total}`}
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

      {/* Add / Edit Company Drawer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#1A1C29]/40 backdrop-blur-sm transition-all duration-300">
          <div className="flex h-full w-full flex-col bg-white shadow-2xl ltr:rounded-l-2xl sm:max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-[#1A1C29]">
                {editingCompany ? t('companies.editCompany') : t('companies.addCompany')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#1A1C29]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-y-auto p-6 space-y-5">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('companies.name')} <span className="text-[#E54B4B]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              {/* Industry */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('companies.industry')}
                </label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData((prev) => ({ ...prev, industry: e.target.value }))}
                  placeholder={locale === 'ar' ? 'مثال: تقنية المعلومات، العقارات' : 'e.g. IT, Real Estate'}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              {/* Website */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('companies.website')}
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              {/* Account Manager */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('companies.manager')}
                </label>
                <select
                  value={formData.accountManagerId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, accountManagerId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                >
                  <option value="">{locale === 'ar' ? 'اختر مدير الحساب...' : 'Select account manager...'}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('companies.status')}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as any }))}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                >
                  <option value="ACTIVE">{t('companies.active')}</option>
                  <option value="INACTIVE">{t('companies.inactive')}</option>
                  <option value="BLACKLISTED">{t('companies.blacklisted')}</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 border-t border-slate-100 pt-6">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/20 hover:bg-[#009b67] active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <span>{locale === 'ar' ? 'حفظ البيانات' : 'Save Details'}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
