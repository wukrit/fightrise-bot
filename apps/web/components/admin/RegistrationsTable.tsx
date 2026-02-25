'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';

type RegistrationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'DQ';
type RegistrationSource = 'STARTGG' | 'DISCORD' | 'MANUAL';

interface RegistrationData {
  id: string;
  user: {
    id: string;
    discordId: string | null;
    discordUsername: string | null;
    startggId: string | null;
    startggGamerTag: string | null;
  } | null;
  status: RegistrationStatus;
  source: RegistrationSource;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface RegistrationsTableProps {
  registrations: RegistrationData[];
  pagination: Pagination;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  loading?: boolean;
}

function StatusBadge({ status }: { status: RegistrationStatus }) {
  const statusConfig: Record<RegistrationStatus, { label: string; className: string }> = {
    PENDING: { label: 'Pending', className: 'bg-amber-900/50 text-amber-400 border-amber-700/50' },
    CONFIRMED: { label: 'Confirmed', className: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50' },
    CANCELLED: { label: 'Cancelled', className: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
    DQ: { label: 'DQ', className: 'bg-red-900/50 text-red-400 border-red-700/50' },
  };

  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}

function SourceBadge({ source }: { source: RegistrationSource }) {
  const sourceConfig: Record<RegistrationSource, { label: string; className: string }> = {
    STARTGG: { label: 'Start.gg', className: 'text-blue-400 bg-blue-900/20' },
    DISCORD: { label: 'Discord', className: 'text-indigo-400 bg-indigo-900/20' },
    MANUAL: { label: 'Manual', className: 'text-zinc-400 bg-zinc-800' },
  };

  const config = sourceConfig[source];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Modal component using Radix directly
function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title?: string; children: React.ReactNode }) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md z-50 animate-slide-up">
          {title && (
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-zinc-100">{title}</Dialog.Title>
              <Dialog.Close asChild>
                <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200" aria-label="Close">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </Dialog.Close>
            </div>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-2 mt-6">{children}</div>;
}

export function RegistrationsTable({
  registrations,
  pagination,
  onApprove,
  onReject,
  onRemove,
  loading = false,
}: RegistrationsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentFilter = searchParams.get('status') || 'all';

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleFilterChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'all') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    router.push(`?${params.toString()}`);
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await onApprove(id);
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (id: string) => {
    setSelectedId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!selectedId || !rejectReason.trim()) return;
    setActionLoading(selectedId);
    try {
      await onReject(selectedId, rejectReason);
      setRejectModalOpen(false);
    } finally {
      setActionLoading(null);
    }
  };

  const openRemoveModal = (id: string) => {
    setSelectedId(id);
    setRemoveModalOpen(true);
  };

  const handleRemove = async () => {
    if (!selectedId) return;
    setActionLoading(selectedId);
    try {
      await onRemove(selectedId);
      setRemoveModalOpen(false);
    } finally {
      setActionLoading(null);
    }
  };

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'CANCELLED', label: 'Cancelled' },
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
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Player</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Discord</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Source</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/30">
            {registrations.map((registration) => (
              <tr key={registration.id} className="hover:bg-zinc-800/20 transition-colors">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-zinc-200">
                    {registration.user?.startggGamerTag || registration.user?.discordUsername || 'Unknown'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-zinc-400">{registration.user?.discordUsername || '-'}</span>
                </td>
                <td className="px-4 py-3">
                  <SourceBadge source={registration.source} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={registration.status} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-zinc-500">{formatDate(registration.createdAt)}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {registration.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(registration.id)}
                          disabled={actionLoading === registration.id}
                          className="px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-900/20 rounded transition-colors disabled:opacity-50"
                        >
                          {actionLoading === registration.id ? '...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => openRejectModal(registration.id)}
                          disabled={actionLoading === registration.id}
                          className="px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => openRemoveModal(registration.id)}
                      disabled={actionLoading === registration.id}
                      className="px-2 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {registrations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-500">No registrations found</p>
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

      {/* Reject Modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Registration">
        <p className="text-sm text-zinc-400 mb-4">
          Please provide a reason for rejecting this registration.
        </p>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Reason for rejection..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 resize-none"
          rows={4}
        />
        <ModalFooter>
          <button
            onClick={() => setRejectModalOpen(false)}
            className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={!rejectReason.trim() || actionLoading !== null}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Reject
          </button>
        </ModalFooter>
      </Modal>

      {/* Remove Modal */}
      <Modal isOpen={removeModalOpen} onClose={() => setRemoveModalOpen(false)} title="Remove Registration">
        <p className="text-sm text-zinc-400">
          Are you sure you want to remove this registration? This action cannot be undone.
        </p>
        <ModalFooter>
          <button
            onClick={() => setRemoveModalOpen(false)}
            className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRemove}
            disabled={actionLoading !== null}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Remove
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

interface ManualAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (discordUsername: string, displayName: string) => Promise<void>;
}

export function ManualAddModal({ isOpen, onClose, onSubmit }: ManualAddModalProps) {
  const [discordUsername, setDiscordUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!discordUsername.trim()) {
      setError('Discord username is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit(discordUsername, displayName);
      setDiscordUsername('');
      setDisplayName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add registration');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDiscordUsername('');
    setDisplayName('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Manual Registration">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Discord Username *
          </label>
          <input
            type="text"
            value={discordUsername}
            onChange={(e) => setDiscordUsername(e.target.value)}
            placeholder="username"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Display Name (optional)
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="In-game name"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
      <ModalFooter>
        <button
          onClick={handleClose}
          className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Registration'}
        </button>
      </ModalFooter>
    </Modal>
  );
}
