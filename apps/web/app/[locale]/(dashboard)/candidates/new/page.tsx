'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../../lib/api';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
} from 'lucide-react';

interface Experience {
  companyName: string;
  title: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
}

interface Education {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
}

interface Skill {
  skillName: string;
  proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
}

export default function NewCandidatePage() {
  const t = useTranslations('ats');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    nationality: '',
    currentLocation: '',
    expectedSalary: '',
    availability: 'AVAILABLE' as 'AVAILABLE' | 'NOTICE_PERIOD' | 'EMPLOYED' | 'UNAVAILABLE',
    source: '',
  });

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [cvFile, setCvFile] = useState<File | null>(null);

  // Helpers for nested arrays
  const addExperience = () => {
    setExperiences([
      ...experiences,
      { companyName: '', title: '', startDate: '', endDate: '', isCurrent: false, description: '' },
    ]);
  };

  const removeExperience = (idx: number) => {
    setExperiences(experiences.filter((_, i) => i !== idx));
  };

  const updateExperience = (idx: number, field: keyof Experience, val: any) => {
    const nextExp = [...experiences];
    nextExp[idx] = { ...nextExp[idx], [field]: val } as Experience;
    if (field === 'isCurrent' && val === true) {
      nextExp[idx].endDate = '';
    }
    setExperiences(nextExp);
  };

  const addEducation = () => {
    setEducations([
      ...educations,
      { institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '' },
    ]);
  };

  const removeEducation = (idx: number) => {
    setEducations(educations.filter((_, i) => i !== idx));
  };

  const updateEducation = (idx: number, field: keyof Education, val: any) => {
    const nextEdu = [...educations];
    nextEdu[idx] = { ...nextEdu[idx], [field]: val } as Education;
    setEducations(nextEdu);
  };

  const handleParseResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    setIsParsing(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/ai/parse-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success) {
        const parsed = res.data.data;
        setPersonalInfo(prev => ({
          ...prev,
          firstName: parsed.firstName || prev.firstName,
          lastName: parsed.lastName || prev.lastName,
          email: parsed.email || prev.email,
          phone: parsed.phone || prev.phone,
        }));
        if (parsed.skills && Array.isArray(parsed.skills)) {
          setSkills(parsed.skills.map((s: string) => ({ skillName: s, proficiency: 'INTERMEDIATE' })));
        }
        // AI parse successful, jump to step 1
        setStep(1);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to parse resume via AI');
    } finally {
      setIsParsing(false);
    }
  };

  const addSkill = () => {
    setSkills([...skills, { skillName: '', proficiency: 'INTERMEDIATE' }]);
  };

  const removeSkill = (idx: number) => {
    setSkills(skills.filter((_, i) => i !== idx));
  };

  const updateSkill = (idx: number, field: keyof Skill, val: any) => {
    const nextSkills = [...skills];
    nextSkills[idx] = { ...nextSkills[idx], [field]: val } as Skill;
    setSkills(nextSkills);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setErrorMsg(null);

    // Prepare payload
    const payload: any = {
      firstName: personalInfo.firstName,
      lastName: personalInfo.lastName,
      availability: personalInfo.availability,
    };

    if (personalInfo.email) payload.email = personalInfo.email;
    if (personalInfo.phone) payload.phone = personalInfo.phone;
    if (personalInfo.linkedinUrl) payload.linkedinUrl = personalInfo.linkedinUrl;
    if (personalInfo.nationality) payload.nationality = personalInfo.nationality;
    if (personalInfo.currentLocation) payload.currentLocation = personalInfo.currentLocation;
    if (personalInfo.source) payload.source = personalInfo.source;
    if (personalInfo.expectedSalary) payload.expectedSalary = parseFloat(personalInfo.expectedSalary);

    // Format experiences (only if fields are populated)
    const validExp = experiences
      .filter((e) => e.companyName && e.title && e.startDate)
      .map((e) => ({
        companyName: e.companyName,
        title: e.title,
        startDate: new Date(e.startDate).toISOString(),
        endDate: e.endDate ? new Date(e.endDate).toISOString() : undefined,
        isCurrent: e.isCurrent,
        description: e.description || undefined,
      }));
    if (validExp.length > 0) payload.experience = validExp;

    // Format educations
    const validEdu = educations
      .filter((edu) => edu.institution && edu.degree && edu.startDate)
      .map((edu) => ({
        institution: edu.institution,
        degree: edu.degree,
        fieldOfStudy: edu.fieldOfStudy || undefined,
        startDate: new Date(edu.startDate).toISOString(),
        endDate: edu.endDate ? new Date(edu.endDate).toISOString() : undefined,
      }));
    if (validEdu.length > 0) payload.education = validEdu;

    // Format skills
    const validSkills = skills.filter((s) => s.skillName.trim() !== '');
    if (validSkills.length > 0) payload.skills = validSkills;

    try {
      // 1. Create candidate
      const res = await api.post('/candidates', payload);
      const newCandidateId = res.data?.data?.id;

      // 2. Upload CV file if attached
      if (newCandidateId && cvFile) {
        const formData = new FormData();
        formData.append('file', cvFile);
        formData.append('type', 'CV');
        await api.post(`/candidates/${newCandidateId}/documents`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      router.push(`/${locale}/candidates/${newCandidateId}`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save candidate');
      setIsSaving(false);
    }
  };

  const nextStep = () => {
    // Basic validation
    if (step === 1) {
      if (!personalInfo.firstName.trim() || !personalInfo.lastName.trim()) {
        setErrorMsg(locale === 'ar' ? 'الاسم الأول والاسم الأخير مطلوبان' : 'First Name and Last Name are required');
        return;
      }
    }
    setErrorMsg(null);
    setStep((s) => s + 1);
  };

  const prevStep = () => {
    setErrorMsg(null);
    setStep((s) => Math.max(1, s - 1));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header & Back Link */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push(`/${locale}/candidates`)}
          className="flex items-center gap-2 text-slate-500 hover:text-[#2A2C4E] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{locale === 'ar' ? 'العودة للمترشحين' : 'Back to Candidates'}</span>
        </button>

        <h2 className="text-xl font-bold text-[#1A1C29]">{t('candidates.newCandidate')}</h2>
      </div>

      {/* Progress Wizard Header */}
      <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-4">
        {[
          { num: 1, label: locale === 'ar' ? 'المعلومات الشخصية' : 'Personal Info' },
          { num: 2, label: locale === 'ar' ? 'الخبرة والتعليم' : 'Career & Education' },
          { num: 3, label: locale === 'ar' ? 'المهارات والمرفقات' : 'Skills & Documents' },
        ].map((s) => (
          <div
            key={s.num}
            className={`flex flex-col md:flex-row items-center gap-2 py-2 border-b-2 text-center md:text-left transition-colors ${
              step === s.num
                ? 'border-[#00B67A] text-[#2A2C4E]'
                : 'border-transparent text-slate-400'
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                step === s.num
                  ? 'bg-[#00B67A] text-white'
                  : step > s.num
                  ? 'bg-emerald-100 text-[#00B67A]'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {s.num}
            </span>
            <span className="text-xs font-bold">{s.label}</span>
          </div>
        ))}
      </div>

      {/* AI Resume Upload Tool */}
      {step === 1 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="flex items-start gap-4">
            <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#2A2C4E]">
                {locale === 'ar' ? 'السيرة الذاتية الذكية' : 'Smart Resume Parse'}
              </h3>
              <p className="text-sm text-slate-500">
                {locale === 'ar' 
                  ? 'قم برفع السيرة الذاتية وسيقوم الذكاء الاصطناعي بتعبئة البيانات تلقائياً.' 
                  : 'Upload a resume and our AI will automatically fill out the form.'}
              </p>
            </div>
          </div>
          <div className="relative">
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleParseResume}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isParsing}
            />
            <button disabled={isParsing} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2 pointer-events-none">
              {isParsing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              <span>{locale === 'ar' ? 'رفع السيرة الذاتية' : 'Upload Resume'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Alert Error */}
      {errorMsg && (
        <div className="flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-600">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: Personal Info Form */}
      {step === 1 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('candidates.firstName')} <span className="text-[#E54B4B]">*</span>
              </label>
              <input
                type="text"
                required
                value={personalInfo.firstName}
                onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('candidates.lastName')} <span className="text-[#E54B4B]">*</span>
              </label>
              <input
                type="text"
                required
                value={personalInfo.lastName}
                onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('candidates.email')}
              </label>
              <input
                type="email"
                value={personalInfo.email}
                onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                placeholder="candidate@example.com"
                className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('candidates.phone')}
              </label>
              <input
                type="tel"
                value={personalInfo.phone}
                onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                placeholder="+966 50 000 0000"
                className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                LinkedIn URL
              </label>
              <input
                type="url"
                value={personalInfo.linkedinUrl}
                onChange={(e) => setPersonalInfo({ ...personalInfo, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/username"
                className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('candidates.nationality')}
              </label>
              <input
                type="text"
                value={personalInfo.nationality}
                onChange={(e) => setPersonalInfo({ ...personalInfo, nationality: e.target.value })}
                placeholder="e.g. Saudi"
                className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('candidates.location')}
              </label>
              <input
                type="text"
                value={personalInfo.currentLocation}
                onChange={(e) => setPersonalInfo({ ...personalInfo, currentLocation: e.target.value })}
                placeholder="e.g. Riyadh, Saudi Arabia"
                className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {locale === 'ar' ? 'الراتب المتوقع (شهرياً)' : 'Expected Salary (Monthly)'}
              </label>
              <input
                type="number"
                value={personalInfo.expectedSalary}
                onChange={(e) => setPersonalInfo({ ...personalInfo, expectedSalary: e.target.value })}
                placeholder="e.g. 15000"
                className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('candidates.availability')}
              </label>
              <select
                value={personalInfo.availability}
                onChange={(e) => setPersonalInfo({ ...personalInfo, availability: e.target.value as any })}
                className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-[#00B67A] focus:bg-white transition-all"
              >
                <option value="AVAILABLE">{t('candidates.AVAILABLE')}</option>
                <option value="NOTICE_PERIOD">{t('candidates.NOTICE_PERIOD')}</option>
                <option value="EMPLOYED">{t('candidates.EMPLOYED')}</option>
                <option value="UNAVAILABLE">{t('candidates.UNAVAILABLE')}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('candidates.source')}
              </label>
              <input
                type="text"
                value={personalInfo.source}
                onChange={(e) => setPersonalInfo({ ...personalInfo, source: e.target.value })}
                placeholder="e.g. LinkedIn, Referral"
                className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-4 py-2.5 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Experience & Education */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Work Experience */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#2A2C4E]">{t('candidates.experience')}</h3>
              <button
                type="button"
                onClick={addExperience}
                className="flex items-center gap-1 text-xs font-bold text-[#00B67A] hover:text-[#009b67] transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>{t('candidates.addExperience')}</span>
              </button>
            </div>

            {experiences.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                {locale === 'ar' ? 'لا يوجد خبرات مسجلة بعد.' : 'No experiences added yet.'}
              </p>
            ) : (
              <div className="space-y-4 divide-y divide-slate-100">
                {experiences.map((exp, idx) => (
                  <div key={idx} className={`pt-4 first:pt-0 space-y-4`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeExperience(idx)}
                        className="text-slate-400 hover:text-[#E54B4B] transition-colors"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {locale === 'ar' ? 'اسم الشركة' : 'Company Name'}
                        </label>
                        <input
                          type="text"
                          required
                          value={exp.companyName}
                          onChange={(e) => updateExperience(idx, 'companyName', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-3 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {locale === 'ar' ? 'المسمى الوظيفي' : 'Job Title'}
                        </label>
                        <input
                          type="text"
                          required
                          value={exp.title}
                          onChange={(e) => updateExperience(idx, 'title', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-3 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3 items-end">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {locale === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                        </label>
                        <input
                          type="date"
                          required
                          value={exp.startDate}
                          onChange={(e) => updateExperience(idx, 'startDate', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-3 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {locale === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}
                        </label>
                        <input
                          type="date"
                          disabled={exp.isCurrent}
                          value={exp.endDate}
                          onChange={(e) => updateExperience(idx, 'endDate', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-3 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all disabled:opacity-50"
                        />
                      </div>

                      <div className="flex items-center gap-2 pb-2.5">
                        <input
                          type="checkbox"
                          id={`current-job-${idx}`}
                          checked={exp.isCurrent}
                          onChange={(e) => updateExperience(idx, 'isCurrent', e.target.checked)}
                          className="rounded text-[#00B67A] focus:ring-[#00B67A] h-4 w-4"
                        />
                        <label htmlFor={`current-job-${idx}`} className="text-xs font-bold text-slate-600 cursor-pointer">
                          {locale === 'ar' ? 'على رأس العمل حالياً' : 'Current Job'}
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {locale === 'ar' ? 'الوصف المهام' : 'Job Duties Description'}
                      </label>
                      <textarea
                        rows={2}
                        value={exp.description}
                        onChange={(e) => updateExperience(idx, 'description', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-3 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Education */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#2A2C4E]">{t('candidates.education')}</h3>
              <button
                type="button"
                onClick={addEducation}
                className="flex items-center gap-1 text-xs font-bold text-[#00B67A] hover:text-[#009b67] transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>{t('candidates.addEducation')}</span>
              </button>
            </div>

            {educations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                {locale === 'ar' ? 'لم يتم إضافة سجلات تعليمية.' : 'No education records added.'}
              </p>
            ) : (
              <div className="space-y-4 divide-y divide-slate-100">
                {educations.map((edu, idx) => (
                  <div key={idx} className={`pt-4 first:pt-0 space-y-4`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeEducation(idx)}
                        className="text-slate-400 hover:text-[#E54B4B] transition-colors"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {locale === 'ar' ? 'المؤسسة التعليمية / الجامعة' : 'Institution / University'}
                        </label>
                        <input
                          type="text"
                          required
                          value={edu.institution}
                          onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-3 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {locale === 'ar' ? 'الدرجة العلمية' : 'Degree'}
                        </label>
                        <input
                          type="text"
                          required
                          value={edu.degree}
                          onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                          placeholder="e.g. Bachelor, Master"
                          className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-3 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {locale === 'ar' ? 'التخصص' : 'Field of Study'}
                        </label>
                        <input
                          type="text"
                          value={edu.fieldOfStudy}
                          onChange={(e) => updateEducation(idx, 'fieldOfStudy', e.target.value)}
                          placeholder="e.g. Computer Science"
                          className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-3 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {locale === 'ar' ? 'تاريخ البدء' : 'Start Date'}
                        </label>
                        <input
                          type="date"
                          required
                          value={edu.startDate}
                          onChange={(e) => updateEducation(idx, 'startDate', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-3 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {locale === 'ar' ? 'تاريخ التخرج / الانتهاء' : 'End Date / Graduation'}
                        </label>
                        <input
                          type="date"
                          value={edu.endDate}
                          onChange={(e) => updateEducation(idx, 'endDate', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-[#EBF0FA]/30 px-3 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Skills & Attachments */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Skills Panel */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#2A2C4E]">{t('candidates.skills')}</h3>
              <button
                type="button"
                onClick={addSkill}
                className="flex items-center gap-1 text-xs font-bold text-[#00B67A] hover:text-[#009b67] transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>{t('candidates.addSkill')}</span>
              </button>
            </div>

            {skills.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                {locale === 'ar' ? 'لم يتم إضافة مهارات.' : 'No skills added.'}
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {skills.map((s, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        placeholder="e.g. JavaScript"
                        required
                        value={s.skillName}
                        onChange={(e) => updateSkill(idx, 'skillName', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] transition-all"
                      />
                    </div>
                    <div className="w-1/3">
                      <select
                        value={s.proficiency}
                        onChange={(e) => updateSkill(idx, 'proficiency', e.target.value as any)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-[#00B67A] transition-all"
                      >
                        <option value="BEGINNER">{t('candidates.BEGINNER')}</option>
                        <option value="INTERMEDIATE">{t('candidates.INTERMEDIATE')}</option>
                        <option value="ADVANCED">{t('candidates.ADVANCED')}</option>
                        <option value="EXPERT">{t('candidates.EXPERT')}</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSkill(idx)}
                      className="text-slate-400 hover:text-[#E54B4B] transition-colors"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CV Upload Panel */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-[#2A2C4E] border-b border-slate-100 pb-3">
              {t('candidates.resume')}
            </h3>

            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 hover:bg-slate-50 transition-colors">
              <Upload className="h-8 w-8 text-slate-400 mb-2" />
              
              <input
                type="file"
                id="resume-file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />

              <label
                htmlFor="resume-file"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-[#2A2C4E] hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
              >
                {cvFile ? cvFile.name : t('candidates.uploadCV')}
              </label>

              <span className="text-[10px] text-slate-400 mt-2 block">
                {locale === 'ar' ? 'صيغ الملفات المقبولة: PDF, DOC, DOCX بحجم أقصى 5MB' : 'Supported formats: PDF, DOC, DOCX up to 5MB'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
        {step > 1 ? (
          <button
            type="button"
            onClick={prevStep}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{locale === 'ar' ? 'السابق' : 'Previous'}</span>
          </button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <button
            type="button"
            onClick={nextStep}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#2A2C4E] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#2A2C4E]/25 transition-all hover:bg-[#3d406b] active:scale-[0.98]"
          >
            <span>{locale === 'ar' ? 'التالي' : 'Next'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#00B67A] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/25 transition-all hover:bg-[#009b67] active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{locale === 'ar' ? 'حفظ ملف المترشح' : 'Register Candidate'}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
