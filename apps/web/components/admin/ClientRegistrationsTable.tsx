'use client';

import { useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { RegistrationsTable as RegistrationsTableComponent, ManualAddModal } from '@/components/admin/RegistrationsTable';

interface User {
  id: string;
  discordId: string | null;
  discordUsername: string | null;
  startggId: string | null;
  startggGamerTag: string | null;
}

interface Registration {
  id: string;
  user: User | null;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'DQ';
  source: 'STARTGG' | 'DISCORD' | 'MANUAL';
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ClientRegistrationsTableProps {
  initialData: {
    registrations: Registration[];
    pagination: Pagination;
  };
  tournamentId: string;
}

export function ClientRegistrationsTable({
  initialData,
  tournamentId,
}: ClientRegistrationsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [registrations, setRegistrations] = useState(initialData.registrations);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const refreshData = async () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('refresh', String(Date.now()));
    const response = await fetch(`/api/tournaments/${tournamentId}/admin/registrations?${params.toString()}`, {
      cache: 'no-store',
    });
    if (response.ok) {
      const data = await response.json();
      setRegistrations(data.registrations);
      setPagination(data.pagination);
    }
  };

  const handleApprove = async (id: string) => {
    const response = await fetch(`/api/tournaments/${tournamentId}/admin/registrations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });

    if (response.ok) {
      setRegistrations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'CONFIRMED' as const } : r))
      );
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to approve');
    }
  };

  const handleReject = async (id: string, reason: string) => {
    const response = await fetch(`/api/tournaments/${tournamentId}/admin/registrations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', reason }),
    });

    if (response.ok) {
      setRegistrations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' as const } : r))
      );
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to reject');
    }
  };

  const handleRemove = async (id: string) => {
    const response = await fetch(`/api/tournaments/${tournamentId}/admin/registrations/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setRegistrations((prev) => prev.filter((r) => r.id !== id));
    } else {
      const error = await response.json();
      alert(error.error || 'Failed to remove');
    }
  };

  const handleManualAdd = async (discordUsername: string, displayName: string) => {
    const response = await fetch(`/api/tournaments/${tournamentId}/admin/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordUsername, displayName }),
    });

    if (response.ok) {
      await refreshData();
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add registration');
    }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setAddModalOpen(true)}
          className="px-4 py-2 text-sm font-medium text-zinc-200 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg transition-colors"
        >
          + Add Registration
        </button>
      </div>

      <RegistrationsTableComponent
        registrations={registrations}
        pagination={pagination}
        onApprove={handleApprove}
        onReject={handleReject}
        onRemove={handleRemove}
      />

      <ManualAddModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleManualAdd}
      />
    </>
  );
}
