'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AuditAction } from '@fightrise/database';
import { formatDate } from '@/lib/date-utils';

interface AuditUser {
  id: string;
  discordUsername: string | null;
  startggGamerTag: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  user: AuditUser | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  source: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AuditLogListProps {
  initialLogs: AuditLog[];
  initialPagination: Pagination;
  tournamentId: string;
}

function ActionBadge({ action }: { action: string }) {
  const actionConfig: Record<string, { label: string; className: string }> = {
    REGISTRATION_APPROVED: { label: 'Approved', className: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50' },
    REGISTRATION_REJECTED: { label: 'Rejected', className: 'bg-red-900/50 text-red-400 border-red-700/50' },
    REGISTRATION_MANUAL_ADD: { label: 'Manual Add', className: 'bg-blue-900/50 text-blue-400 border-blue-700/50' },
    REGISTRATION_MANUAL_REMOVE: { label: 'Removed', className: 'bg-amber-900/50 text-amber-400 border-amber-700/50' },
  };

  const config = actionConfig[action] || { label: action, className: 'bg-zinc-800 text-zinc-400' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}

export function AuditLogList({ initialLogs, initialPagination, tournamentId }: AuditLogListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get('action') || 'all';

  const [logs, setLogs] = useState(initialLogs);
  const [pagination, setPagination] = useState(initialPagination);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const params = new URLSearchParams(searchParams.toString());
        params.set('refresh', String(Date.now()));
        const response = await fetch(`/api/tournaments/${tournamentId}/admin/audit?${params.toString()}`, {
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          setLogs(data.auditLogs);
          setPagination(data.pagination);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [searchParams, tournamentId]);

  const handleFilterChange = (action: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (action === 'all') {
      params.delete('action');
    } else {
      params.set('action', action);
    }
    router.push(`?${params.toString()}`);
  };

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'REGISTRATION_APPROVED', label: 'Approved' },
    { value: 'REGISTRATION_REJECTED', label: 'Rejected' },
    { value: 'REGISTRATION_MANUAL_ADD', label: 'Manual Add' },
    { value: 'REGISTRATION_MANUAL_REMOVE', label: 'Removed' },
  ];

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {filters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => handleFilterChange(filter.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              currentFilter === filter.value
                ? 'bg-zinc-100 text-zinc-900'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Admin</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Details</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/30">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-zinc-800/20 transition-colors">
                <td className="px-4 py-3">
                  <ActionBadge action={log.action as AuditAction} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-zinc-300">
                    {log.user?.discordUsername || log.user?.startggGamerTag || 'Unknown'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-zinc-400">
                    {log.reason && <p className="text-red-400">Reason: {log.reason}</p>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-zinc-500">{formatDate(log.createdAt)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {logs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-500">No audit logs found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', String(pagination.page - 1));
              router.push(`?${params.toString()}`);
            }}
            disabled={pagination.page <= 1}
            className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700"
          >
            Previous
          </button>
          <span className="text-sm text-zinc-400">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', String(pagination.page + 1));
              router.push(`?${params.toString()}`);
            }}
            disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
