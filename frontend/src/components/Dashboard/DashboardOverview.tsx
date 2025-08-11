'use client';
import useSWR from 'swr';
import { api } from '@/lib/api';

export default function DashboardOverview() {
  const { data, error } = useSWR(['dashboard-stats'], api.getDashboardStats as any);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {['totalContacts','activeConversations','messagesToday','avgResponseTime'].map((k) => (
        <div key={k} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-slate-500 text-sm">{k}</div>
          <div className="text-2xl font-semibold text-slate-800 mt-1">{(data as any)?.[k] ?? '—'}</div>
        </div>
      ))}
    </div>
  );
}