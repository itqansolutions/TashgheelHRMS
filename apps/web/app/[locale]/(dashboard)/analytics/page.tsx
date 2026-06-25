'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '../../../../lib/api';
import { Download, TrendingUp, Users, Briefcase, DollarSign } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function AnalyticsDashboard() {
  const t = useTranslations('Reports');
  const [kpis, setKpis] = useState<any>(null);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [finance, setFinance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pipeline');

  useEffect(() => {
    async function loadData() {
      try {
        const [kpiRes, funnelRes, recRes, clientRes, finRes] = await Promise.all([
          api.get('/reports/dashboard'),
          api.get('/reports/pipeline'),
          api.get('/reports/recruiters'),
          api.get('/reports/clients'),
          api.get('/reports/finance'),
        ]);

        setKpis(kpiRes.data);
        setFunnel(funnelRes.data);
        setRecruiters(recRes.data);
        setClients(clientRes.data);
        setFinance(finRes.data);
      } catch (err) {
        console.error('Failed to load reports', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleExport = (report: string, type: string) => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/reports/${report}?export=${type}`;
  };

  const COLORS = ['#2A2C4E', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading analytics...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 bg-gray-50/50 min-h-screen">
      <div className="flex items-center justify-between space-y-2 mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-[#2A2C4E]">Analytics & Reports</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* KPI Cards */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Active Jobs</h3>
            <Briefcase className="h-4 w-4 text-[#2A2C4E]" />
          </div>
          <div className="text-2xl font-bold text-[#2A2C4E]">{kpis?.totalJobs || 0}</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">Candidates in Pipeline</h3>
            <Users className="h-4 w-4 text-[#2A2C4E]" />
          </div>
          <div className="text-2xl font-bold text-[#2A2C4E]">{kpis?.activePipeline || 0}</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Placements</h3>
            <TrendingUp className="h-4 w-4 text-[#2A2C4E]" />
          </div>
          <div className="text-2xl font-bold text-[#2A2C4E]">{kpis?.totalPlacements || 0}</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Revenue (SAR)</h3>
            <DollarSign className="h-4 w-4 text-[#2A2C4E]" />
          </div>
          <div className="text-2xl font-bold text-[#2A2C4E]">{(kpis?.totalRevenue || 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {['pipeline', 'recruiters', 'clients', 'finance'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-[#2A2C4E] text-[#2A2C4E]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'pipeline' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Recruitment Funnel</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleExport('pipeline', 'csv')} className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"><Download className="mr-2 h-4 w-4" /> CSV</button>
                  <button onClick={() => handleExport('pipeline', 'excel')} className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"><Download className="mr-2 h-4 w-4" /> Excel</button>
                  <button onClick={() => handleExport('pipeline', 'pdf')} className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"><Download className="mr-2 h-4 w-4" /> PDF</button>
                </div>
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnel} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#2A2C4E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'recruiters' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Recruiter Performance</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleExport('recruiters', 'csv')} className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"><Download className="mr-2 h-4 w-4" /> CSV</button>
                  <button onClick={() => handleExport('recruiters', 'excel')} className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"><Download className="mr-2 h-4 w-4" /> Excel</button>
                  <button onClick={() => handleExport('recruiters', 'pdf')} className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"><Download className="mr-2 h-4 w-4" /> PDF</button>
                </div>
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recruiters} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="jobsCreated" name="Jobs Assigned" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="interviewsScheduled" name="Interviews" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="placementsMade" name="Placements" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Top Clients</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleExport('clients', 'csv')} className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"><Download className="mr-2 h-4 w-4" /> CSV</button>
                  <button onClick={() => handleExport('clients', 'excel')} className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"><Download className="mr-2 h-4 w-4" /> Excel</button>
                  <button onClick={() => handleExport('clients', 'pdf')} className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"><Download className="mr-2 h-4 w-4" /> PDF</button>
                </div>
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clients} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="activeJobs" name="Active Jobs" fill="#2A2C4E" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="totalPlacements" name="Placements" fill="#10B981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Invoicing Summary</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleExport('finance', 'csv')} className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"><Download className="mr-2 h-4 w-4" /> CSV</button>
                  <button onClick={() => handleExport('finance', 'excel')} className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"><Download className="mr-2 h-4 w-4" /> Excel</button>
                  <button onClick={() => handleExport('finance', 'pdf')} className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50"><Download className="mr-2 h-4 w-4" /> PDF</button>
                </div>
              </div>
              <div className="h-[400px] flex justify-center items-center">
                {finance && finance.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={finance}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="amount"
                        nameKey="status"
                      >
                        {finance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `SAR ${Number(value).toLocaleString()}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-gray-500">No financial data available yet.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
