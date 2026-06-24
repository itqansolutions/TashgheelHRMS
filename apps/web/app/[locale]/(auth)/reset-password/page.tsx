'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import Link from 'next/link';
import { KeyRound, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

const resetSchema = z
  .object({
    password: z
      .string()
      .min(10, { message: 'Password must be at least 10 characters long' })
      .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
        message: 'Must include uppercase, lowercase, number, and special character',
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (values: ResetFormValues) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        password: values.password,
      });
      setSuccessMsg(response.data?.message || 'Password reset successful.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl shadow-slate-100">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2A2C4E] font-bold text-white shadow-lg shadow-[#2A2C4E]/20">
            T
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[#1A1C29] tracking-tight">
            {t('resetPassword')}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            {locale === 'ar'
              ? 'الرجاء إدخال كلمة مرور جديدة وتأكيدها.'
              : 'Please enter a new password and confirm it.'}
          </p>
        </div>

        {successMsg ? (
          <div className="space-y-6">
            <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4 text-sm text-[#00B67A]">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#00B67A]" />
              <span>{successMsg}</span>
            </div>
            <Link
              href={`/${locale}/login`}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00B67A] py-3 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/25 transition-all hover:bg-[#009b67] hover:shadow-[#00B67A]/35"
            >
              <span>{locale === 'ar' ? 'تسجيل الدخول' : 'Login'}</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {errorMsg && (
              <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm text-[#E54B4B]">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!token && (
              <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>
                  {locale === 'ar'
                    ? 'تحذير: لم يتم العثور على رمز إعادة التعيين في الرابط. قد لا تعمل هذه العملية بشكل صحيح.'
                    : 'Warning: No reset token found in the URL. This operation may fail.'}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1C29]" htmlFor="password">
                {locale === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
              </label>
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-[#1A1C29]" htmlFor="confirmPassword">
                {locale === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder={t('passwordPlaceholder')}
                {...register('confirmPassword')}
                className={`w-full rounded-lg border bg-[#EBF0FA]/50 px-4 py-3 text-sm text-[#1A1C29] placeholder-slate-400 outline-none transition-all focus:border-[#00B67A] focus:bg-white focus:ring-2 focus:ring-[#00B67A]/20 ${
                  errors.confirmPassword ? 'border-[#E54B4B] focus:border-[#E54B4B]' : 'border-slate-200'
                }`}
              />
              {errors.confirmPassword && (
                <p className="text-xs font-semibold text-[#E54B4B]">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#00B67A] py-3 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/25 transition-all hover:bg-[#009b67] hover:shadow-[#00B67A]/35 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                <KeyRound className="h-4 w-4" />
                <span>{isLoading ? (locale === 'ar' ? 'جاري التحديث...' : 'Updating...') : (locale === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password')}</span>
              </button>

              <Link
                href={`/${locale}/login`}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className={`h-4 w-4 ${locale === 'ar' ? 'rotate-180' : ''}`} />
                <span>{locale === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to login'}</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
