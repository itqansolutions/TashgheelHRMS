'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import {   Users, 
  Plus, 
  Search, 
  Loader2, 
  UserPlus, 
  UserCheck, 
  UserX,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  status: 'ACTIVE' | 'DEACTIVATED';
  createdAt: string;
  roles: { id: string; name: string }[];
}

interface Role {
  id: string;
  name: string;
  description: string | null;
}

export default function UsersPage() {
  const t = useTranslations('users');
  const params = useParams();
  const locale = params.locale as string;

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Invite Modal States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  
  // Notification states
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchUsers = () => {
    setIsLoading(true);
    const queryParams = new URLSearchParams();
    if (searchQuery) queryParams.append('search', searchQuery);
    if (statusFilter) queryParams.append('status', statusFilter);

    api.get(`/users?${queryParams.toString()}`)
      .then((res) => {
        if (res.data?.success) {
          setUsers(res.data.data.users);
        }
      })
      .catch((err) => {
        setErrorMsg(err.response?.data?.message || 'Failed to fetch users');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();

    // Fetch roles for invite dropdown
    api.get('/users/roles')
      .then((res) => {
        if (res.data?.success) {
          setRoles(res.data.data);
          if (res.data.data.length > 0) {
            setInviteRoleId(res.data.data[0].id);
          }
        }
      })
      .catch(() => {});
  }, [searchQuery, statusFilter]);

  const handleToggleStatus = async (user: User) => {
    const isActivating = user.status === 'DEACTIVATED';
    const endpoint = `/users/${user.id}/${isActivating ? 'activate' : 'deactivate'}`;
    
    try {
      const response = await api.patch(endpoint);
      if (response.data?.success) {
        setSuccessMsg(response.data.message || 'User status updated successfully');
        fetchUsers();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to update user status');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setErrorMsg(null);

    try {
      const response = await api.post('/users', {
        email: inviteEmail,
        firstName: inviteFirstName,
        lastName: inviteLastName,
        password: invitePassword,
        roleId: inviteRoleId,
      });

      if (response.data?.success) {
        setSuccessMsg(locale === 'ar' ? 'تم إنشاء حساب المستخدم بنجاح!' : 'User created successfully!');
        setIsInviteModalOpen(false);
        // Reset form
        setInviteEmail('');
        setInviteFirstName('');
        setInviteLastName('');
        setInvitePassword('');
        fetchUsers();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to create user');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">{t('title')}</h2>
          <p className="text-sm text-slate-500">
            {locale === 'ar' ? 'إدارة المستخدمين وصلاحياتهم والدور الوظيفي المخصص لهم.' : 'Manage system administrators, recruiters, and managers.'}
          </p>
        </div>
        
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#00B67A] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#00B67A]/20 transition-all hover:bg-[#009b67] active:scale-[0.98]"
        >
          <UserPlus className="h-4.5 w-4.5" />
          <span>{t('invite')}</span>
        </button>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={locale === 'ar' ? 'البحث بالاسم أو البريد الإلكتروني...' : 'Search by name or email...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 py-2 pr-4 pl-10 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-3 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
          >
            <option value="">{locale === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
            <option value="ACTIVE">{locale === 'ar' ? 'نشط' : 'Active'}</option>
            <option value="DEACTIVATED">{locale === 'ar' ? 'غير نشط' : 'Deactivated'}</option>
          </select>
        </div>
      </div>

      {/* Users Data Grid */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400">
            <Users className="h-12 w-12 stroke-[1.5]" />
            <p className="mt-2 text-sm">{locale === 'ar' ? 'لا يوجد مستخدمين مطابقين للبحث.' : 'No users found.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">{t('name')}</th>
                  <th className="px-6 py-4">{locale === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                  <th className="px-6 py-4">{t('role')}</th>
                  <th className="px-6 py-4">{t('status')}</th>
                  <th className="px-6 py-4 text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-[#1A1C29]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2A2C4E]/10 font-bold text-[#2A2C4E]">
                          {u.firstName[0]}
                        </div>
                        <span>{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{u.email}</td>
                    <td className="px-6 py-4">
                      {u.roles.map((r) => (
                        <span key={r.id} className="rounded-full bg-[#2A2C4E]/10 px-2.5 py-1 text-xs font-semibold text-[#2A2C4E]">
                          {r.name}
                        </span>
                      ))}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                        u.status === 'ACTIVE'
                          ? 'bg-green-50 text-[#00B67A]'
                          : 'bg-red-50 text-[#E54B4B]'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-[#00B67A]' : 'bg-[#E54B4B]'}`} />
                        <span>{u.status === 'ACTIVE' ? t('active') : t('deactivated')}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors ${
                          u.status === 'ACTIVE'
                            ? 'border-red-200 text-[#E54B4B] hover:bg-red-50'
                            : 'border-green-200 text-[#00B67A] hover:bg-green-50'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            <span>{t('deactivate')}</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>{t('activate')}</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite/Create User Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setIsInviteModalOpen(false)}
          ></div>

          {/* Modal Card */}
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            {/* Close Button */}
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold text-[#1A1C29]">
              {t('invite')}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {locale === 'ar' ? 'أدخل تفاصيل المستخدم الجديد لإنشاء حسابه.' : 'Provide the new user credentials and role assignment.'}
            </p>

            <form onSubmit={handleInviteUser} className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'الاسم الأول' : 'First Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-3 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {locale === 'ar' ? 'الاسم الأخير' : 'Last Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-3 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {locale === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-3 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {locale === 'ar' ? 'كلمة المرور' : 'Password'}
                </label>
                <input
                  type="password"
                  required
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-3 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t('role')}
                </label>
                <select
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-[#EBF0FA]/30 px-3 py-2 text-sm text-[#1A1C29] outline-none focus:border-[#00B67A] focus:bg-white"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-[#00B67A] px-4 py-2 text-sm font-bold text-white shadow-md shadow-[#00B67A]/20 hover:bg-[#009b67]"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{locale === 'ar' ? 'جاري الإرسال...' : 'Sending...'}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>{locale === 'ar' ? 'إنشاء حساب' : 'Create Account'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
