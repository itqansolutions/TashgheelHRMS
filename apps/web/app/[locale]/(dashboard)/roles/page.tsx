'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { Shield, ShieldAlert, Loader2, Save, CheckCircle2, AlertCircle } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
}

interface Permission {
  id: string;
  description: string | null;
}

export default function RolesPage() {
  const params = useParams();
  const locale = params.locale as string;

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permissions'),
      ]);

      if (rolesRes.data?.success && permsRes.data?.success) {
        setRoles(rolesRes.data.data);
        setPermissions(permsRes.data.data);
        if (rolesRes.data.data.length > 0) {
          const firstRole = rolesRes.data.data[0];
          setSelectedRole(firstRole);
          setSelectedPermissions(firstRole.permissions);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to fetch roles and permissions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleTogglePermission = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const response = await api.patch(`/roles/${selectedRole.id}/permissions`, {
        permissionIds: selectedPermissions,
      });

      if (response.data?.success) {
        setSuccessMsg(locale === 'ar' ? 'تم تحديث صلاحيات الدور بنجاح!' : 'Role permissions updated successfully!');
        // Update roles list
        setRoles((prev) =>
          prev.map((r) =>
            r.id === selectedRole.id ? { ...r, permissions: selectedPermissions } : r
          )
        );
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  // Group permissions by prefix (e.g., "users:read" -> group "users")
  const groupedPermissions: Record<string, Permission[]> = {};
  permissions.forEach((perm) => {
    const groupName = perm.id.split(':')[0] || 'system';
    if (!groupedPermissions[groupName]) {
      groupedPermissions[groupName] = [];
    }
    groupedPermissions[groupName].push(perm);
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00B67A]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#1A1C29] tracking-tight">
          {locale === 'ar' ? 'الأدوار والصلاحيات (RBAC)' : 'Roles & Permissions (RBAC)'}
        </h2>
        <p className="text-sm text-slate-500">
          {locale === 'ar' ? 'التحكم في مستويات الوصول والأذونات المخصصة لكل وظيفة.' : 'Control access levels and manage functional permissions for system roles.'}
        </p>
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Roles List */}
        <div className="space-y-4 lg:col-span-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            {locale === 'ar' ? 'أدوار النظام' : 'System Roles'}
          </h3>
          <div className="space-y-2">
            {roles.map((role) => {
              const isSelected = selectedRole?.id === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role)}
                  className={`w-full rounded-xl border p-4 text-left transition-all duration-200 ${
                    isSelected
                      ? 'border-[#00B67A] bg-white shadow-md shadow-slate-100'
                      : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${isSelected ? 'bg-[#00B67A]/10 text-[#00B67A]' : 'bg-slate-100 text-slate-500'}`}>
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1A1C29]">{role.name}</h4>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">{role.description || 'No description provided.'}</p>
                      <span className="mt-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                        {role.permissions.length} {locale === 'ar' ? 'صلاحيات' : 'permissions'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Permissions Matrix Editor */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
          {selectedRole ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#1A1C29]">
                    {locale === 'ar' ? `تعديل صلاحيات: ${selectedRole.name}` : `Edit Permissions: ${selectedRole.name}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {locale === 'ar' ? 'حدد الصلاحيات الممنوحة لهذا الدور من المصفوفة أدناه.' : 'Select the granular permissions allowed for this role.'}
                  </p>
                </div>

                <button
                  onClick={handleSavePermissions}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 rounded-lg bg-[#00B67A] px-4 py-2 text-xs font-bold text-white shadow-md shadow-[#00B67A]/25 transition-all hover:bg-[#009b67] disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  <span>{locale === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</span>
                </button>
              </div>

              {/* Permissions List Grouped */}
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([group, perms]) => (
                  <div key={group} className="space-y-3 rounded-xl border border-slate-50 bg-slate-50/50 p-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#2A2C4E]">
                      {group}
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {perms.map((perm) => {
                        const isChecked = selectedPermissions.includes(perm.id);
                        return (
                          <label
                            key={perm.id}
                            className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:bg-slate-50 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(perm.id)}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#00B67A] focus:ring-[#00B67A]"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#1A1C29]">{perm.id}</p>
                              <p className="mt-0.5 text-[10px] text-slate-400 leading-normal">{perm.description || 'No description.'}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-slate-400">
              <ShieldAlert className="h-12 w-12 stroke-[1.5]" />
              <p className="mt-2 text-sm">{locale === 'ar' ? 'الرجاء اختيار دور لتعديل صلاحياته.' : 'Select a role to edit permissions.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
