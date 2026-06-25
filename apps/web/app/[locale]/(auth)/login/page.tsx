'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '../../../../store/auth';
import { api } from '../../../../lib/api';
import Link from 'next/link';
import { Globe, Shield, Sparkles, LogIn, AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const pathname = usePathname();
  const loginStore = useAuthStore((state) => state.login);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.post('/auth/login', values);
      if (response.data?.success) {
        const { accessToken, user } = response.data.data;
        loginStore(accessToken, user);
        router.replace(`/${locale}/dashboard`);
      } else {
        setErrorMsg(t('invalidCredentials'));
      }
    } catch (err: any) {
      if (err.response) {
        setErrorMsg(err.response?.data?.message || t('invalidCredentials'));
      } else {
        // Network error or other failure
        setErrorMsg(`Network Error: ${err.message} (Tried reaching: ${api.defaults.baseURL})`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = () => {
    const nextLocale = locale === 'en' ? 'ar' : 'en';
    const nextPath = pathname.replace(/^\/(en|ar)/, `/${nextLocale}`);
    router.push(nextPath);
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left side: Premium Branding (Desktop only) */}
      <div className="relative hidden w-full flex-col justify-between bg-[#2A2C4E] p-12 text-white lg:flex lg:w-1/2">
        {/* Decorative background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,182,122,0.15),transparent_45%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(229,75,75,0.1),transparent_40%)]"></div>

        {/* Logo/Title */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#00B67A] font-bold text-white shadow-lg shadow-[#00B67A]/30">
            T
          </div>
          <span className="text-xl font-bold tracking-wider">Tashgheel HRMS</span>
        </div>

        {/* Mid illustration / text */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#00B67A]/15 px-3.5 py-1 text-xs font-semibold text-[#00B67A]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Single-Tenant Enterprise Edition</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight lg:text-5xl">
            {locale === 'ar'
              ? 'نظام متكامل لإدارة التوظيف والتعيينات'
              : 'End-to-End Recruitment & Placement Lifecycle'}
          </h1>
          <p className="text-lg text-slate-300">
            {locale === 'ar'
              ? 'من إدارة علاقات العملاء والباحثين عن عمل إلى الفوترة الذكية والتحليلات المتقدمة المعززة بالذكاء الاصطناعي.'
              : 'From pipeline tracking and candidate sourcing to automated placement management, invoicing, and AI-powered recommendations.'}
          </p>

          <div className="grid grid-cols-2 gap-6 pt-8 text-sm">
            <div className="flex items-start gap-3">
              <div className="rounded bg-white/10 p-2 text-[#00B67A]">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold">Isolated Database</h4>
                <p className="text-xs text-slate-400">Secure single-tenant</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded bg-white/10 p-2 text-[#00B67A]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold">AI Assistant</h4>
                <p className="text-xs text-slate-400">Gemini & GPT-4o Mini</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-400">
          © {new Date().getFullYear()} Tashgheel. All rights reserved.
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex w-full flex-col justify-between bg-white p-8 lg:w-1/2 lg:p-12">
        {/* Language & Info Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00B67A] font-bold text-white">
              T
            </div>
            <span className="font-bold text-[#2A2C4E]">Tashgheel HRMS</span>
          </div>
          <div className="hidden lg:block"></div>

          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Globe className="h-4 w-4" />
            <span>{locale === 'en' ? 'العربية' : 'English'}</span>
          </button>
        </div>

        {/* Login form container */}
        <div className="mx-auto my-auto w-full max-w-md space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-[#1A1C29] tracking-tight">
              {t('welcomeBack')}
            </h2>
            <p className="text-sm text-slate-500">
              {locale === 'ar'
                ? 'الرجاء إدخال بيانات الاعتماد للوصول لحسابك.'
                : 'Please enter your credentials to access your organization dashboard.'}
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-[#E54B4B]">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1C29]" htmlFor="email">
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                {...register('email')}
                className={`w-full rounded-lg border bg-[#EBF0FA]/50 px-4 py-3 text-sm text-[#1A1C29] placeholder-slate-400 outline-none transition-all focus:border-[#00B67A] focus:bg-white focus:ring-2 focus:ring-[#00B67A]/20 ${
                  errors.email ? 'border-[#E54B4B] focus:border-[#E54B4B]' : 'border-slate-200'
                }`}
              />
              {errors.email && (
                <p className="text-xs font-semibold text-[#E54B4B]">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[#1A1C29]" htmlFor="password">
                  {t('password')}
                </label>
                <Link
                  href={`/${locale}/forgot-password`}
                  className="text-xs font-semibold text-[#00B67A] hover:underline"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
              <input
                id="password"
                type="password"
                placeholder={t('passwordPlaceholder')}
                {...register('password')}
                className={`w-full rounded-lg border bg-[#EBF0FA]/50 px-4 py-3 text-sm text-[#1A1C29] placeholder-slate-400 outline-none transition-all focus:border-[#00B67A] focus:bg-white focus:ring-2 focus:ring-[#00B67A]/20 ${
                  errors.password ? 'border-[#E54B4B] focus:border-[#E54B4B]' : 'border-slate-200'
                }`}
              />
              {errors.password && (
                <p className="text-xs font-semibold text-[#E54B4B]">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00B67A] py-3 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/25 transition-all hover:bg-[#009b67] hover:shadow-[#00B67A]/35 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              <span>{isLoading ? t('signingIn') : t('signIn')}</span>
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-slate-500 lg:hidden">
          © {new Date().getFullYear()} Tashgheel. All rights reserved.
        </div>
      </div>
    </div>
  );
}
