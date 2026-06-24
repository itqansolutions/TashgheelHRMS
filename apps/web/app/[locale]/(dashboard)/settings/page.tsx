'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { Building, Palette, Mail, Settings, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const params = useParams();
  const locale = params.locale as string;

  const [activeTab, setActiveTab] = useState<'company' | 'branding' | 'email' | 'system'>('company');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Fetch all settings
    api.get('/settings')
      .then((res) => {
        if (res.data?.success) {
          const settingsObj: Record<string, string> = {};
          // Flatten settings data from groups
          Object.values(res.data.data).forEach((group: any) => {
            Object.entries(group).forEach(([key, val]) => {
              settingsObj[key] = val as string;
            });
          });
          setFormData(settingsObj);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to load settings');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await api.patch('/settings', { settings: formData });
      if (response.data?.success) {
        setSuccessMsg(t('success'));
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
          <p className="text-sm text-slate-500">{locale === 'ar' ? 'جاري تحميل الإعدادات...' : 'Loading settings...'}</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'company', name: t('companyInfo') || 'Company Profile', icon: Building },
    { id: 'branding', name: t('branding') || 'Branding & Identity', icon: Palette },
    { id: 'email', name: t('emailConfig') || 'Email Settings', icon: Mail },
    { id: 'system', name: t('systemConfig') || 'System Config', icon: Settings },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">{t('title')}</h2>
          <p className="text-sm text-slate-500">
            {locale === 'ar' ? 'تخصيص الإعدادات الافتراضية لمنظمتك وهويتها البصرية.' : 'Customize organization defaults, identity, and system behavior.'}
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4 text-sm text-[#00B67A]">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 text-sm text-[#E54B4B]">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left Side: Tabs List */}
        <div className="flex shrink-0 gap-2 overflow-x-auto pb-2 lg:w-64 lg:flex-col lg:overflow-visible lg:pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#00B67A]/10 text-[#00B67A]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-[#1A1C29]'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Tab panel form */}
        <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'company' && (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'اسم الشركة' : 'Company Name'}
                  </label>
                  <input
                    type="text"
                    value={formData['company.name'] ?? ''}
                    onChange={(e) => handleChange('company.name', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'شعار الشركة (رابط)' : 'Company Logo URL'}
                  </label>
                  <input
                    type="text"
                    value={formData['company.logo'] ?? ''}
                    onChange={(e) => handleChange('company.logo', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'العنوان' : 'Company Address'}
                  </label>
                  <textarea
                    rows={3}
                    value={formData['company.address'] ?? ''}
                    onChange={(e) => handleChange('company.address', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'المنطقة الزمنية' : 'Timezone'}
                  </label>
                  <select
                    value={formData['company.timezone'] ?? 'UTC'}
                    onChange={(e) => handleChange('company.timezone', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                  >
                    <option value="UTC">UTC</option>
                    <option value="Asia/Riyadh">Asia/Riyadh (+3)</option>
                    <option value="Europe/London">Europe/London</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'العملة الافتراضية' : 'Default Currency'}
                  </label>
                  <input
                    type="text"
                    value={formData['company.currency'] ?? 'SAR'}
                    onChange={(e) => handleChange('company.currency', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                  />
                </div>
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'اللون الأساسي للعلامة التجارية' : 'Primary Brand Color'}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData['branding.primary_color'] ?? '#2A2C4E'}
                      onChange={(e) => handleChange('branding.primary_color', e.target.value)}
                      className="h-10 w-20 cursor-pointer rounded-lg border border-slate-200"
                    />
                    <input
                      type="text"
                      value={formData['branding.primary_color'] ?? '#2A2C4E'}
                      onChange={(e) => handleChange('branding.primary_color', e.target.value)}
                      className="rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'أيقونة الموقع (Favicon URL)' : 'Favicon URL'}
                  </label>
                  <input
                    type="text"
                    value={formData['branding.favicon'] ?? ''}
                    onChange={(e) => handleChange('branding.favicon', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                  />
                </div>
              </div>
            )}

            {activeTab === 'email' && (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'اسم المرسل' : 'Sender Name'}
                  </label>
                  <input
                    type="text"
                    value={formData['email.from_name'] ?? ''}
                    onChange={(e) => handleChange('email.from_name', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'بريد المرسل' : 'Sender Email Address'}
                  </label>
                  <input
                    type="email"
                    value={formData['email.from_address'] ?? ''}
                    onChange={(e) => handleChange('email.from_address', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'رمز واجهة البرمجيات Resend API Key' : 'Resend API Key'}
                  </label>
                  <input
                    type="password"
                    placeholder="re_••••••••••••••••••••••••"
                    value={formData['email.resend_api_key'] ?? ''}
                    onChange={(e) => handleChange('email.resend_api_key', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                  />
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'اللغة الافتراضية للنظام' : 'Default System Language'}
                  </label>
                  <select
                    value={formData['system.default_language'] ?? 'ar'}
                    onChange={(e) => handleChange('system.default_language', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                  >
                    <option value="ar">{locale === 'ar' ? 'العربية' : 'Arabic'}</option>
                    <option value="en">{locale === 'ar' ? 'الإنجليزية' : 'English'}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'تنسيق التاريخ' : 'Date Format'}
                  </label>
                  <select
                    value={formData['system.date_format'] ?? 'YYYY-MM-DD'}
                    onChange={(e) => handleChange('system.date_format', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'حد الصفحات الافتراضي' : 'Default Pagination Limit'}
                  </label>
                  <input
                    type="number"
                    value={formData['system.pagination_limit'] ?? '20'}
                    onChange={(e) => handleChange('system.pagination_limit', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Save Buttons footer */}
            <div className="flex justify-end border-t border-slate-100 pt-6">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-[#00B67A] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/20 transition-all hover:bg-[#009b67] hover:shadow-[#00B67A]/30 active:scale-[0.98] disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('saving') || (locale === 'ar' ? 'جاري الحفظ...' : 'Saving...')}</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{t('save')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
