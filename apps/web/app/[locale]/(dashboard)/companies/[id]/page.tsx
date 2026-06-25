'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../../lib/api';
import {
  Building2,
  Users,
  FileText,
  MapPin,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Download,
  Check,
  X,
  Loader2,
  ArrowLeft,
  ArrowRight,
  User,
  Clock,
  CheckSquare,
  AlertCircle,
  MessageSquare,
  Mail,
  Phone,
  Link as LinkIcon,
} from 'lucide-react';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  isPrimary: boolean;
}

interface Contract {
  id: string;
  contractNumber: string;
  fileUrl: string;
  startDate: string;
  endDate: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
}

interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
}

interface CRMActivity {
  id: string;
  type: 'CALL' | 'MEETING' | 'NOTE' | 'TASK' | 'FOLLOW_UP' | 'EMAIL';
  subject: string;
  content: string;
  dueDate: string | null;
  isCompleted: boolean;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
  contact?: {
    firstName: string;
    lastName: string;
  } | null;
}

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
    email: string;
  } | null;
  contacts: Contact[];
  contracts: Contract[];
  branches: Branch[];
  crmActivities: CRMActivity[];
  createdAt: string;
}

export default function CompanyDetailPage() {
  const t = useTranslations('crm');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const companyId = params.id as string;

  const getDocumentUrl = (url: string) => {
    if (!url) return '';
    let resolvedUrl = url;
    
    // Add protocol prefix if missing for absolute URLs
    if (!resolvedUrl.startsWith('http://') && !resolvedUrl.startsWith('https://') && !resolvedUrl.startsWith('/')) {
      resolvedUrl = `https://${resolvedUrl}`;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    // Handle relative path (starts with /)
    if (resolvedUrl.startsWith('/')) {
      let cleanApi = apiUrl || 'http://localhost:4000';
      if (!cleanApi.startsWith('http://') && !cleanApi.startsWith('https://')) {
        cleanApi = `https://${cleanApi}`;
      }
      return `${cleanApi.replace(/\/$/, '')}${resolvedUrl}`;
    }

    // Handle localhost URL replacements
    if (apiUrl && (resolvedUrl.startsWith('http://localhost') || resolvedUrl.startsWith('http://127.0.0.1'))) {
      try {
        const urlObj = new URL(resolvedUrl);
        let apiCleanUrl = apiUrl;
        if (!apiCleanUrl.startsWith('http://') && !apiCleanUrl.startsWith('https://')) {
          apiCleanUrl = `https://${apiCleanUrl}`;
        }
        const apiDomain = new URL(apiCleanUrl);
        urlObj.protocol = apiDomain.protocol;
        urlObj.host = apiDomain.host;
        return urlObj.toString();
      } catch (e) {
        let cleanApi = apiUrl;
        if (!cleanApi.startsWith('http://') && !cleanApi.startsWith('https://')) {
          cleanApi = `https://${cleanApi}`;
        }
        return resolvedUrl.replace(/^http:\/\/(localhost|127\.0\.0\.1):\d*/, cleanApi.replace(/\/$/, ''));
      }
    }
    return resolvedUrl;
  };

  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'contracts' | 'branches' | 'activities'>('overview');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal / Form state variables
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'contact' | 'contract' | 'branch' | 'activity' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Forms data
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    title: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    isPrimary: false,
  });

  const [contractForm, setContractForm] = useState({
    contractNumber: '',
    startDate: '',
    endDate: '',
    status: 'ACTIVE' as 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED',
    file: null as File | null,
  });

  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
  });

  const [activityForm, setActivityForm] = useState({
    type: 'NOTE' as 'CALL' | 'MEETING' | 'NOTE' | 'TASK' | 'FOLLOW_UP' | 'EMAIL',
    subject: '',
    content: '',
    contactId: '',
    dueDate: '',
    isCompleted: false,
  });

  const fetchCompanyDetails = () => {
    setIsLoading(true);
    api.get(`/companies/${companyId}`)
      .then((res) => {
        if (res.data?.success) {
          setCompany(res.data.data);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load company details');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchCompanyDetails();
  }, [companyId]);

  const showToast = (success: boolean, msg: string) => {
    if (success) {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 3500);
    }
  };

  // Contacts Handlers
  const handleOpenContactModal = (contact?: Contact) => {
    setModalType('contact');
    if (contact) {
      setEditingItem(contact);
      setContactForm({
        firstName: contact.firstName,
        lastName: contact.lastName,
        title: contact.title || '',
        email: contact.email || '',
        phone: contact.phone || '',
        linkedinUrl: contact.linkedinUrl || '',
        isPrimary: contact.isPrimary,
      });
    } else {
      setEditingItem(null);
      setContactForm({
        firstName: '',
        lastName: '',
        title: '',
        email: '',
        phone: '',
        linkedinUrl: '',
        isPrimary: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...contactForm,
        companyId,
        title: contactForm.title || undefined,
        email: contactForm.email || undefined,
        phone: contactForm.phone || undefined,
        linkedinUrl: contactForm.linkedinUrl || undefined,
      };

      if (editingItem) {
        await api.patch(`/contacts/${editingItem.id}`, payload);
        showToast(true, locale === 'ar' ? 'تم تحديث جهة الاتصال بنجاح' : 'Contact updated successfully');
      } else {
        await api.post('/contacts', payload);
        showToast(true, locale === 'ar' ? 'تمت إضافة جهة الاتصال بنجاح' : 'Contact created successfully');
      }
      setIsModalOpen(false);
      fetchCompanyDetails();
    } catch (err: any) {
      showToast(false, err.response?.data?.message || 'Failed to save contact');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف جهة الاتصال هذه؟' : 'Are you sure you want to delete this contact?')) return;
    try {
      await api.delete(`/contacts/${id}`);
      showToast(true, locale === 'ar' ? 'تم حذف جهة الاتصال' : 'Contact deleted');
      fetchCompanyDetails();
    } catch (err: any) {
      showToast(false, 'Failed to delete contact');
    }
  };

  // Contracts Handlers
  const handleOpenContractModal = (contract?: Contract) => {
    setModalType('contract');
    if (contract) {
      setEditingItem(contract);
      setContractForm({
        contractNumber: contract.contractNumber,
        startDate: contract.startDate.substring(0, 10),
        endDate: contract.endDate ? contract.endDate.substring(0, 10) : '',
        status: contract.status,
        file: null,
      });
    } else {
      setEditingItem(null);
      setContractForm({
        contractNumber: '',
        startDate: new Date().toISOString().substring(0, 10),
        endDate: '',
        status: 'ACTIVE',
        file: null,
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append('companyId', companyId);
      fd.append('contractNumber', contractForm.contractNumber);
      fd.append('startDate', new Date(contractForm.startDate).toISOString());
      if (contractForm.endDate) {
        fd.append('endDate', new Date(contractForm.endDate).toISOString());
      }
      fd.append('status', contractForm.status);
      if (contractForm.file) {
        fd.append('file', contractForm.file);
      }

      if (editingItem) {
        await api.patch(`/contracts/${editingItem.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast(true, locale === 'ar' ? 'تم تحديث العقد' : 'Contract updated');
      } else {
        if (!contractForm.file) {
          showToast(false, locale === 'ar' ? 'يجب تحميل ملف العقد' : 'Contract file is required');
          setIsSaving(false);
          return;
        }
        await api.post('/contracts', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast(true, locale === 'ar' ? 'تم إنشاء العقد بنجاح' : 'Contract uploaded successfully');
      }
      setIsModalOpen(false);
      fetchCompanyDetails();
    } catch (err: any) {
      showToast(false, err.response?.data?.message || 'Failed to save contract');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف هذا العقد؟' : 'Are you sure you want to delete this contract?')) return;
    try {
      await api.delete(`/contracts/${id}`);
      showToast(true, locale === 'ar' ? 'تم حذف العقد' : 'Contract deleted');
      fetchCompanyDetails();
    } catch (err: any) {
      showToast(false, 'Failed to delete contract');
    }
  };

  // Branches Handlers
  const handleOpenBranchModal = (branch?: Branch) => {
    setModalType('branch');
    if (branch) {
      setEditingItem(branch);
      setBranchForm({
        name: branch.name,
        address: branch.address,
        city: branch.city,
        country: branch.country,
      });
    } else {
      setEditingItem(null);
      setBranchForm({
        name: '',
        address: '',
        city: '',
        country: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...branchForm, companyId };
      if (editingItem) {
        await api.patch(`/branches/${editingItem.id}`, payload);
        showToast(true, locale === 'ar' ? 'تم تعديل الفرع' : 'Branch updated');
      } else {
        await api.post('/branches', payload);
        showToast(true, locale === 'ar' ? 'تمت إضافة الفرع' : 'Branch created');
      }
      setIsModalOpen(false);
      fetchCompanyDetails();
    } catch (err: any) {
      showToast(false, err.response?.data?.message || 'Failed to save branch');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد من حذف هذا الفرع؟' : 'Are you sure you want to delete this branch?')) return;
    try {
      await api.delete(`/branches/${id}`);
      showToast(true, locale === 'ar' ? 'تم حذف الفرع' : 'Branch deleted');
      fetchCompanyDetails();
    } catch (err: any) {
      showToast(false, 'Failed to delete branch');
    }
  };

  // Activities Handlers
  const handleOpenActivityModal = () => {
    setModalType('activity');
    setEditingItem(null);
    setActivityForm({
      type: 'NOTE',
      subject: '',
      content: '',
      contactId: '',
      dueDate: '',
      isCompleted: false,
    });
    setIsModalOpen(true);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...activityForm,
        companyId,
        contactId: activityForm.contactId || undefined,
        dueDate: activityForm.dueDate ? new Date(activityForm.dueDate).toISOString() : undefined,
      };
      await api.post('/activities', payload);
      showToast(true, locale === 'ar' ? 'تم تسجيل النشاط بنجاح' : 'Activity logged successfully');
      setIsModalOpen(false);
      fetchCompanyDetails();
    } catch (err: any) {
      showToast(false, err.response?.data?.message || 'Failed to log activity');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActivityComplete = async (act: CRMActivity) => {
    try {
      await api.patch(`/activities/${act.id}`, { isCompleted: !act.isCompleted });
      showToast(true, locale === 'ar' ? 'تم تحديث حالة المهمة' : 'Task status updated');
      fetchCompanyDetails();
    } catch (err: any) {
      showToast(false, 'Failed to update task status');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F7FB]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-[#00B67A]" />
          <p className="text-sm font-semibold text-slate-500">
            {locale === 'ar' ? 'جاري تحميل تفاصيل الشركة...' : 'Loading company details...'}
          </p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-[#E54B4B]" />
        <h3 className="text-lg font-bold text-[#1A1C29]">{locale === 'ar' ? 'الشركة غير موجودة' : 'Company Not Found'}</h3>
        <button
          onClick={() => router.push(`/${locale}/companies`)}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#00B67A] hover:underline"
        >
          {locale === 'ar' ? 'العودة لقائمة الشركات' : 'Back to Companies'}
        </button>
      </div>
    );
  }

  const getStatusColor = (s: Company['status']) => {
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

  const getContractStatusColor = (s: Contract['status']) => {
    switch (s) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'DRAFT':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'EXPIRED':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'TERMINATED':
        return 'bg-rose-50 text-rose-600 border-rose-100';
    }
  };

  const getActivityIcon = (type: CRMActivity['type']) => {
    switch (type) {
      case 'CALL':
        return <Phone className="h-4 w-4" />;
      case 'MEETING':
        return <Users className="h-4 w-4" />;
      case 'TASK':
        return <CheckSquare className="h-4 w-4" />;
      case 'EMAIL':
        return <Mail className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getActivityColorClass = (type: CRMActivity['type']) => {
    switch (type) {
      case 'CALL':
        return 'bg-indigo-50 text-indigo-600';
      case 'MEETING':
        return 'bg-cyan-50 text-cyan-600';
      case 'TASK':
        return 'bg-amber-50 text-amber-600';
      case 'EMAIL':
        return 'bg-purple-50 text-purple-600';
      default:
        return 'bg-slate-50 text-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Row */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/${locale}/companies`)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 shadow-sm transition-all"
        >
          {locale === 'ar' ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </button>
        <span className="text-sm font-semibold text-slate-500">
          {locale === 'ar' ? 'العودة لشركات العملاء' : 'Back to Companies'}
        </span>
      </div>

      {/* Success/Error Toast */}
      {successMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-600 shadow-xl">
          <Check className="h-5 w-5" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-600 shadow-xl">
          <AlertCircle className="h-5 w-5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Company Header Card */}
      <div className="flex flex-col gap-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2A2C4E]/5 text-[#2A2C4E]">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1A1C29]">{company.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              {company.industry && <span>{company.industry}</span>}
              {company.industry && <span className="h-1.5 w-1.5 rounded-full bg-slate-300"></span>}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#00B67A] hover:underline"
                >
                  <LinkIcon className="h-3 w-3" />
                  <span>{company.website}</span>
                </a>
              )}
            </div>
          </div>
        </div>
        <div>
          <span className={`inline-flex rounded-full border px-3.5 py-1 text-xs font-bold ${getStatusColor(company.status)}`}>
            {getStatusLabel(company.status)}
          </span>
        </div>
      </div>

      {/* Detail Tabs Selection */}
      <div className="flex overflow-x-auto border-b border-slate-200 pb-px gap-6">
        {[
          { id: 'overview', name: t('companies.overview') || 'Overview' },
          { id: 'contacts', name: t('contacts.title') || 'Contacts' },
          { id: 'contracts', name: t('contracts.title') || 'Contracts' },
          { id: 'branches', name: t('branches.title') || 'Branches' },
          { id: 'activities', name: t('activities.title') || 'Activities' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`whitespace-nowrap pb-3.5 text-sm font-bold border-b-2 transition-all ${
                isActive
                  ? 'border-[#00B67A] text-[#00B67A]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="mt-6">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Left: General Info Card */}
            <div className="md:col-span-2 space-y-6">
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-[#1A1C29] border-b border-slate-50 pb-3">
                  {locale === 'ar' ? 'بيانات عامة' : 'Company Details'}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">{locale === 'ar' ? 'الاسم الرسمي' : 'Official Name'}</span>
                    <span className="font-semibold text-slate-700">{company.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">{locale === 'ar' ? 'القطاع' : 'Industry'}</span>
                    <span className="font-semibold text-slate-700">{company.industry || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">{locale === 'ar' ? 'الموقع الإلكتروني' : 'Website'}</span>
                    <span className="font-semibold text-slate-700">{company.website || '-'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block mb-1">{locale === 'ar' ? 'تاريخ التسجيل' : 'Registered On'}</span>
                    <span className="font-semibold text-slate-700">{new Date(company.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Account Manager Card */}
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-[#1A1C29] border-b border-slate-50 pb-3">
                  {t('companies.manager')}
                </h3>
                {company.accountManager ? (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-[#00B67A]">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-700">
                        {company.accountManager.firstName} {company.accountManager.lastName}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">{company.accountManager.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    {locale === 'ar' ? 'لم يتم تعيين مدير حساب لهذه الشركة.' : 'No account manager assigned.'}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Quick Stats Widget */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-[#1A1C29] border-b border-slate-50 pb-3">
                  {locale === 'ar' ? 'إحصائيات الملف' : 'Relations Overview'}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-[#EBF0FA]/30 p-4 text-center">
                    <span className="text-2xl font-bold text-[#2A2C4E] block">{company.contacts.length}</span>
                    <span className="text-xs text-slate-500 mt-1 block">{t('companies.contactsCount')}</span>
                  </div>
                  <div className="rounded-xl bg-[#EBF0FA]/30 p-4 text-center">
                    <span className="text-2xl font-bold text-[#2A2C4E] block">{company.contracts.length}</span>
                    <span className="text-xs text-slate-500 mt-1 block">{t('companies.contractsCount')}</span>
                  </div>
                  <div className="rounded-xl bg-[#EBF0FA]/30 p-4 text-center">
                    <span className="text-2xl font-bold text-[#2A2C4E] block">{company.branches.length}</span>
                    <span className="text-xs text-slate-500 mt-1 block">{t('companies.branchesCount')}</span>
                  </div>
                  <div className="rounded-xl bg-[#EBF0FA]/30 p-4 text-center">
                    <span className="text-2xl font-bold text-[#00B67A] block">{company.crmActivities.length}</span>
                    <span className="text-xs text-slate-500 mt-1 block">{locale === 'ar' ? 'الأنشطة' : 'Activities'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CONTACTS TAB */}
        {activeTab === 'contacts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#1A1C29]">{t('contacts.title')}</h3>
              <button
                onClick={() => handleOpenContactModal()}
                className="flex items-center gap-1.5 rounded-lg bg-[#00B67A] px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-[#009b67]"
              >
                <Plus className="h-4 w-4" />
                <span>{t('contacts.addContact')}</span>
              </button>
            </div>

            {company.contacts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
                {t('contacts.noContacts')}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {company.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3"
                  >
                    {contact.isPrimary && (
                      <span className="absolute top-4 ltr:right-4 rtl:left-4 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-[#00B67A] border border-emerald-100">
                        {t('contacts.primary')}
                      </span>
                    )}

                    <div>
                      <h4 className="font-bold text-[#1A1C29] text-base">
                        {contact.firstName} {contact.lastName}
                      </h4>
                      {contact.title && <p className="text-xs text-slate-400 mt-0.5">{contact.title}</p>}
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500 border-t border-slate-50 pt-3">
                      {contact.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" />
                          <span>{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                      {contact.linkedinUrl && (
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-3.5 w-3.5" />
                          <a
                            href={contact.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#2A2C4E] hover:underline"
                          >
                            LinkedIn
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-50 pt-3">
                      <button
                        onClick={() => handleOpenContactModal(contact)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-[#00B67A] transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-[#E54B4B] transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONTRACTS TAB */}
        {activeTab === 'contracts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#1A1C29]">{t('contracts.title')}</h3>
              <button
                onClick={() => handleOpenContractModal()}
                className="flex items-center gap-1.5 rounded-lg bg-[#00B67A] px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-[#009b67]"
              >
                <Plus className="h-4 w-4" />
                <span>{t('contracts.addContract')}</span>
              </button>
            </div>

            {company.contracts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
                {t('contracts.noContracts')}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase text-slate-500">
                      <th className="px-6 py-4 rtl:text-right">{t('contracts.number')}</th>
                      <th className="px-6 py-4 rtl:text-right">{t('contracts.startDate')}</th>
                      <th className="px-6 py-4 rtl:text-right">{t('contracts.endDate')}</th>
                      <th className="px-6 py-4 rtl:text-right">{t('contracts.status')}</th>
                      <th className="px-6 py-4 text-right rtl:text-left">{t('companies.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {company.contracts.map((contract) => (
                      <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="whitespace-nowrap px-6 py-4 font-bold text-[#1A1C29] rtl:text-right">
                          {contract.contractNumber}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                          {new Date(contract.startDate).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-slate-500 rtl:text-right">
                          {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 rtl:text-right">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getContractStatusColor(contract.status)}`}>
                            {t(`contracts.${contract.status.toLowerCase()}`)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right rtl:text-left">
                          <div className="flex justify-end gap-2">
                            <a
                              href={getDocumentUrl(contract.fileUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={t('contracts.download')}
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#00B67A]"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              onClick={() => handleOpenContractModal(contract)}
                              title={locale === 'ar' ? 'تعديل' : 'Edit'}
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#2A2C4E]"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteContract(contract.id)}
                              title={locale === 'ar' ? 'حذف' : 'Delete'}
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#E54B4B]"
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
        )}

        {/* BRANCHES TAB */}
        {activeTab === 'branches' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#1A1C29]">{t('branches.title')}</h3>
              <button
                onClick={() => handleOpenBranchModal()}
                className="flex items-center gap-1.5 rounded-lg bg-[#00B67A] px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-[#009b67]"
              >
                <Plus className="h-4 w-4" />
                <span>{t('branches.addBranch')}</span>
              </button>
            </div>

            {company.branches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
                {t('branches.noBranches')}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {company.branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1A1C29]">{branch.name}</h4>
                        <p className="text-xs text-slate-400 mt-1">{branch.address}</p>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                          {branch.city}, {branch.country}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-50 pt-3">
                      <button
                        onClick={() => handleOpenBranchModal(branch)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-[#00B67A] transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBranch(branch.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-[#E54B4B] transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVITIES TAB */}
        {activeTab === 'activities' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#1A1C29]">{t('activities.timeline')}</h3>
              <button
                onClick={() => handleOpenActivityModal()}
                className="flex items-center gap-1.5 rounded-lg bg-[#00B67A] px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-[#009b67]"
              >
                <Plus className="h-4 w-4" />
                <span>{t('activities.logActivity')}</span>
              </button>
            </div>

            {company.crmActivities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
                {t('activities.noActivities')}
              </div>
            ) : (
              <div className="relative border-l border-slate-200 ltr:ml-4 rtl:mr-4 rtl:border-r rtl:border-l-0 py-2 space-y-6">
                {company.crmActivities.map((act) => (
                  <div key={act.id} className="relative ltr:pl-8 rtl:pr-8">
                    {/* Circle Dot Marker */}
                    <div className={`absolute top-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-white ring-8 ring-slate-50 ltr:-left-3.5 rtl:-right-3.5 ${getActivityColorClass(act.type)}`}>
                      {getActivityIcon(act.type)}
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-50 pb-2">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase">
                            {t(`activities.${act.type}`)}
                          </span>
                          <h4 className="font-bold text-[#1A1C29] text-sm mt-0.5">{act.subject}</h4>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{new Date(act.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{act.content}</p>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-50 pt-2 text-xs text-slate-400">
                        <div className="flex gap-2">
                          <span>
                            {locale === 'ar' ? 'بواسطة:' : 'By:'} <span className="font-bold text-slate-600">{act.user.firstName} {act.user.lastName}</span>
                          </span>
                          {act.contact && (
                            <>
                              <span>•</span>
                              <span>
                                {locale === 'ar' ? 'جهة الاتصال:' : 'Contact:'} <span className="font-semibold text-slate-500">{act.contact.firstName} {act.contact.lastName}</span>
                              </span>
                            </>
                          )}
                        </div>

                        {act.type === 'TASK' && (
                          <div className="flex items-center gap-3">
                            {act.dueDate && (
                              <span className={`font-semibold ${new Date(act.dueDate) < new Date() && !act.isCompleted ? 'text-[#E54B4B]' : 'text-slate-500'}`}>
                                {locale === 'ar' ? 'تاريخ الاستحقاق:' : 'Due:'} {new Date(act.dueDate).toLocaleDateString()}
                              </span>
                            )}
                            <button
                              onClick={() => handleToggleActivityComplete(act)}
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold border transition-all ${
                                act.isCompleted
                                  ? 'bg-emerald-50 border-emerald-100 text-[#00B67A]'
                                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {act.isCompleted ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  <span>{t('activities.isCompleted')}</span>
                                </>
                              ) : (
                                <span>{locale === 'ar' ? 'تعليم كمكتمل' : 'Mark Complete'}</span>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slide-out Drawer Panel Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-[#1A1C29]/40 backdrop-blur-sm transition-all duration-300">
          <div className="flex h-full w-full flex-col bg-white shadow-2xl ltr:rounded-l-2xl sm:max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-[#1A1C29]">
                {modalType === 'contact' && (editingItem ? t('contacts.editContact') : t('contacts.addContact'))}
                {modalType === 'contract' && (editingItem ? t('contracts.editContract') : t('contracts.addContract'))}
                {modalType === 'branch' && (editingItem ? t('branches.editBranch') : t('branches.addBranch'))}
                {modalType === 'activity' && t('activities.logActivity')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#1A1C29]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Forms body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* CONTACT FORM */}
              {modalType === 'contact' && (
                <form onSubmit={handleSaveContact} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('contacts.firstName')} *</label>
                      <input
                        type="text"
                        required
                        value={contactForm.firstName}
                        onChange={(e) => setContactForm((prev) => ({ ...prev, firstName: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('contacts.lastName')} *</label>
                      <input
                        type="text"
                        required
                        value={contactForm.lastName}
                        onChange={(e) => setContactForm((prev) => ({ ...prev, lastName: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('contacts.jobTitle')}</label>
                    <input
                      type="text"
                      value={contactForm.title}
                      onChange={(e) => setContactForm((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('contacts.email')}</label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('contacts.phone')}</label>
                    <input
                      type="text"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('contacts.linkedin')}</label>
                    <input
                      type="text"
                      value={contactForm.linkedinUrl}
                      onChange={(e) => setContactForm((prev) => ({ ...prev, linkedinUrl: e.target.value }))}
                      placeholder="https://linkedin.com/in/username"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A]"
                    />
                  </div>

                  <div className="flex items-center gap-2 py-2">
                    <input
                      type="checkbox"
                      id="isPrimary"
                      checked={contactForm.isPrimary}
                      onChange={(e) => setContactForm((prev) => ({ ...prev, isPrimary: e.target.checked }))}
                      className="h-4 w-4 rounded border-slate-200 text-[#00B67A] focus:ring-[#00B67A]"
                    />
                    <label htmlFor="isPrimary" className="text-xs font-bold uppercase tracking-wider text-slate-500 cursor-pointer">
                      {t('contacts.primary')}
                    </label>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 rounded-xl bg-[#00B67A] py-2.5 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/25 hover:bg-[#009b67] disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (locale === 'ar' ? 'حفظ' : 'Save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50"
                    >
                      {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </form>
              )}

              {/* CONTRACT FORM */}
              {modalType === 'contract' && (
                <form onSubmit={handleSaveContract} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('contracts.number')} *</label>
                    <input
                      type="text"
                      required
                      value={contractForm.contractNumber}
                      onChange={(e) => setContractForm((prev) => ({ ...prev, contractNumber: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('contracts.startDate')} *</label>
                      <input
                        type="date"
                        required
                        value={contractForm.startDate}
                        onChange={(e) => setContractForm((prev) => ({ ...prev, startDate: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('contracts.endDate')}</label>
                      <input
                        type="date"
                        value={contractForm.endDate}
                        onChange={(e) => setContractForm((prev) => ({ ...prev, endDate: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('contracts.status')}</label>
                    <select
                      value={contractForm.status}
                      onChange={(e) => setContractForm((prev) => ({ ...prev, status: e.target.value as any }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#00B67A]"
                    >
                      <option value="DRAFT">{t('contracts.draft')}</option>
                      <option value="ACTIVE">{t('contracts.active')}</option>
                      <option value="EXPIRED">{t('contracts.expired')}</option>
                      <option value="TERMINATED">{t('contracts.terminated')}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      {t('contracts.file')} {!editingItem && '*'}
                    </label>
                    <input
                      type="file"
                      required={!editingItem}
                      accept=".pdf,.docx,.doc"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setContractForm((prev) => ({ ...prev, file }));
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      {locale === 'ar' ? 'يُقبل فقط ملفات PDF, DOCX, DOC بحد أقصى 10 ميجابايت' : 'Accepts PDF, DOCX, DOC files up to 10MB'}
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 rounded-xl bg-[#00B67A] py-2.5 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/25 hover:bg-[#009b67] disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (locale === 'ar' ? 'حفظ' : 'Save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50"
                    >
                      {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </form>
              )}

              {/* BRANCH FORM */}
              {modalType === 'branch' && (
                <form onSubmit={handleSaveBranch} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('branches.name')} *</label>
                    <input
                      type="text"
                      required
                      value={branchForm.name}
                      onChange={(e) => setBranchForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder={locale === 'ar' ? 'الفرع الرئيسي، فرع الرياض...' : 'Main Branch, Riyadh Branch...'}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('branches.address')} *</label>
                    <input
                      type="text"
                      required
                      value={branchForm.address}
                      onChange={(e) => setBranchForm((prev) => ({ ...prev, address: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('branches.city')} *</label>
                      <input
                        type="text"
                        required
                        value={branchForm.city}
                        onChange={(e) => setBranchForm((prev) => ({ ...prev, city: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('branches.country')} *</label>
                      <input
                        type="text"
                        required
                        value={branchForm.country}
                        onChange={(e) => setBranchForm((prev) => ({ ...prev, country: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 rounded-xl bg-[#00B67A] py-2.5 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/25 hover:bg-[#009b67] disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (locale === 'ar' ? 'حفظ' : 'Save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50"
                    >
                      {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </form>
              )}

              {/* ACTIVITY FORM */}
              {modalType === 'activity' && (
                <form onSubmit={handleSaveActivity} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('activities.type')} *</label>
                    <select
                      value={activityForm.type}
                      onChange={(e) => setActivityForm((prev) => ({ ...prev, type: e.target.value as any }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#00B67A]"
                    >
                      <option value="NOTE">{t('activities.NOTE')}</option>
                      <option value="CALL">{t('activities.CALL')}</option>
                      <option value="MEETING">{t('activities.MEETING')}</option>
                      <option value="TASK">{t('activities.TASK')}</option>
                      <option value="EMAIL">{t('activities.EMAIL')}</option>
                      <option value="FOLLOW_UP">{t('activities.FOLLOW_UP')}</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('activities.subject')} *</label>
                    <input
                      type="text"
                      required
                      value={activityForm.subject}
                      onChange={(e) => setActivityForm((prev) => ({ ...prev, subject: e.target.value }))}
                      placeholder={locale === 'ar' ? 'مثال: مكالمة تعارفية، اجتماع مناقشة العقد' : 'e.g. Introduction call, Contract discussion'}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('activities.content')} *</label>
                    <textarea
                      required
                      rows={4}
                      value={activityForm.content}
                      onChange={(e) => setActivityForm((prev) => ({ ...prev, content: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('contacts.title')}</label>
                    <select
                      value={activityForm.contactId}
                      onChange={(e) => setActivityForm((prev) => ({ ...prev, contactId: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#00B67A]"
                    >
                      <option value="">{locale === 'ar' ? 'غير محدد (ربط الشركة بأكملها)' : 'None (linked to company itself)'}</option>
                      {company.contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.firstName} {c.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {activityForm.type === 'TASK' && (
                    <div className="space-y-1 animate-fadeIn">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('activities.dueDate')}</label>
                      <input
                        type="datetime-local"
                        value={activityForm.dueDate}
                        onChange={(e) => setActivityForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#00B67A]"
                      />
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 rounded-xl bg-[#00B67A] py-2.5 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/25 hover:bg-[#009b67] disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (locale === 'ar' ? 'حفظ' : 'Save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50"
                    >
                      {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
