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
  Edit2,
  Trash2,
  Mail,
  Phone,
  Link as LinkIcon,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  isPrimary: boolean;
  company: {
    id: string;
    name: string;
  };
}

export default function ContactsPage() {
  const t = useTranslations('crm');
  const navT = useTranslations('nav');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Filters
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('');

  // Modals & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    companyId: '',
    firstName: '',
    lastName: '',
    title: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    isPrimary: false,
  });

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchContacts = () => {
    setIsLoading(true);
    const paramsObj: any = { page, limit };
    if (search) paramsObj.search = search;
    if (companyId) paramsObj.companyId = companyId;

    api.get('/contacts', { params: paramsObj })
      .then((res) => {
        if (res.data?.success) {
          setContacts(res.data.contacts);
          setTotal(res.data.meta.total);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load contacts');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const fetchCompanies = () => {
    api.get('/companies', { params: { limit: 100 } })
      .then((res) => {
        if (res.data?.success) {
          setCompanies(res.data.companies);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchContacts();
  }, [page, search, companyId]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingContact(null);
    setFormData({
      companyId: '',
      firstName: '',
      lastName: '',
      title: '',
      email: '',
      phone: '',
      linkedinUrl: '',
      isPrimary: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      companyId: contact.companyId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title || '',
      email: contact.email || '',
      phone: contact.phone || '',
      linkedinUrl: contact.linkedinUrl || '',
      isPrimary: contact.isPrimary,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      ...formData,
      title: formData.title || undefined,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      linkedinUrl: formData.linkedinUrl || undefined,
    };

    try {
      if (editingContact) {
        await api.patch(`/contacts/${editingContact.id}`, payload);
        setSuccessMsg(locale === 'ar' ? 'تم تحديث بيانات جهة الاتصال' : 'Contact updated successfully');
      } else {
        await api.post('/contacts', payload);
        setSuccessMsg(locale === 'ar' ? 'تمت إضافة جهة الاتصال بنجاح' : 'Contact created successfully');
      }
      setIsModalOpen(false);
      fetchContacts();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save contact');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف جهة الاتصال هذه؟' : 'Are you sure you want to delete this contact?')) {
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.delete(`/contacts/${id}`);
      setSuccessMsg(locale === 'ar' ? 'تم حذف جهة الاتصال بنجاح' : 'Contact deleted successfully');
      fetchContacts();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete contact');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">{navT('contacts')}</h2>
          <p className="text-sm text-slate-500">
            {locale === 'ar' ? 'إدارة جميع جهات الاتصال الخاصة بشركات العملاء.' : 'Manage all client contact persons in the system.'}
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/25 transition-all hover:bg-[#009b67] hover:shadow-[#00B67A]/35 active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" />
          <span>{t('contacts.addContact')}</span>
        </button>
      </div>

      {/* Alerts */}
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

      {/* Filters */}
      <div className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:grid-cols-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:left-3 rtl:right-3" />
          <input
            type="text"
            placeholder={locale === 'ar' ? 'بحث بالاسم أو البريد...' : 'Search by name or email...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-100 bg-slate-50/50 py-2.5 outline-none focus:border-[#00B67A] focus:bg-white text-sm ltr:pl-9 ltr:pr-4 rtl:pr-9 rtl:pl-4 transition-all"
          />
        </div>

        {/* Company Filter */}
        <div className="relative">
          <select
            value={companyId}
            onChange={(e) => { setPage(1); setCompanyId(e.target.value); }}
            className="w-full appearance-none rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 outline-none focus:border-[#00B67A] focus:bg-white text-sm text-slate-700 transition-all"
          >
            <option value="">{locale === 'ar' ? 'كل الشركات' : 'All Companies'}</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Filter className="absolute top-3.5 h-4 w-4 text-slate-400 ltr:right-3 rtl:left-3 pointer-events-none" />
        </div>
      </div>

      {/* Table List */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-50 bg-white/50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
            <p className="text-sm text-slate-500">{locale === 'ar' ? 'جاري تحميل جهات الاتصال...' : 'Loading contacts...'}</p>
          </div>
        </div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Users className="mb-4 h-12 w-12 text-slate-300" />
          <h3 className="text-base font-bold text-[#1A1C29]">{t('contacts.noContacts')}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {locale === 'ar' ? 'ابدأ بإضافة جهات اتصال جديدة للشركات.' : 'Start adding new contacts to companies.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4 rtl:text-right">{locale === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('contacts.jobTitle')}</th>
                  <th className="px-6 py-4 rtl:text-right">{locale === 'ar' ? 'الشركة' : 'Company'}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('contacts.email')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('contacts.phone')}</th>
                  <th className="px-6 py-4 rtl:text-right">{t('contacts.primary')}</th>
                  <th className="px-6 py-4 text-right rtl:text-left">{t('companies.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-bold text-[#1A1C29] rtl:text-right">
                      {contact.firstName} {contact.lastName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                      {contact.title || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-700 font-semibold rtl:text-right">
                      <button
                        onClick={() => router.push(`/${locale}/companies/${contact.company.id}`)}
                        className="text-left font-semibold text-[#2A2C4E] hover:text-[#00B67A] transition-colors rtl:text-right"
                      >
                        {contact.company.name}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                      {contact.email || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                      {contact.phone || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 rtl:text-right">
                      {contact.isPrimary ? (
                        <span className="rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                          {t('contacts.yes')}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-slate-500 rtl:text-left">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(contact)}
                          title={locale === 'ar' ? 'تعديل' : 'Edit'}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#00B67A]"
                        >
                          <Edit2 className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
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
                {locale === 'ar' ? `إجمالي جهات الاتصال: ${total}` : `Total contacts: ${total}`}
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

      {/* Add / Edit Contact Drawer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#1A1C29]/40 backdrop-blur-sm transition-all duration-300">
          <div className="flex h-full w-full flex-col bg-white shadow-2xl ltr:rounded-l-2xl sm:max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-[#1A1C29]">
                {editingContact ? t('contacts.editContact') : t('contacts.addContact')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#1A1C29]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-y-auto p-6 space-y-4">
              {/* Company Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {locale === 'ar' ? 'الشركة' : 'Company'} <span className="text-[#E54B4B]">*</span>
                </label>
                <select
                  required
                  value={formData.companyId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, companyId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                >
                  <option value="">{locale === 'ar' ? 'اختر الشركة...' : 'Select company...'}</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Names */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t('contacts.firstName')} <span className="text-[#E54B4B]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {t('contacts.lastName')} <span className="text-[#E54B4B]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Job Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('contacts.jobTitle')}
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('contacts.email')}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('contacts.phone')}
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              {/* LinkedIn URL */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('contacts.linkedin')}
                </label>
                <input
                  type="text"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, linkedinUrl: e.target.value }))}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                />
              </div>

              {/* Primary Contact Toggle */}
              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="globalIsPrimary"
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isPrimary: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-200 text-[#00B67A] focus:ring-[#00B67A]"
                />
                <label htmlFor="globalIsPrimary" className="text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer select-none">
                  {t('contacts.primary')}
                </label>
              </div>

              {/* Submit Footer */}
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
