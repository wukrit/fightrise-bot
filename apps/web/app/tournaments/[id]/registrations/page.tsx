'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Types
type RegistrationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'DQ';
type RegistrationSource = 'STARTGG' | 'DISCORD' | 'MANUAL';

interface Registration {
  id: string;
  playerName: string;
  discordUsername: string;
  discordId: string;
  source: RegistrationSource;
  status: RegistrationStatus;
  createdAt: string;
}

// Mock data
const mockRegistrations: Registration[] = [
  { id: '1', playerName: 'FighterPro', discordUsername: 'fighter123', discordId: '123456', source: 'STARTGG', status: 'CONFIRMED', createdAt: '2026-02-10T10:00:00Z' },
  { id: '2', playerName: 'StreetKing', discordUsername: 'streetking', discordId: '234567', source: 'DISCORD', status: 'CONFIRMED', createdAt: '2026-02-10T11:30:00Z' },
  { id: '3', playerName: 'ComboMaster', discordUsername: 'combomaster', discordId: '345678', source: 'MANUAL', status: 'PENDING', createdAt: '2026-02-11T09:15:00Z' },
  { id: '4', playerName: 'PixelNinja', discordUsername: 'pixelninja', discordId: '456789', source: 'STARTGG', status: 'PENDING', createdAt: '2026-02-11T14:22:00Z' },
  { id: '5', playerName: 'RetroGamer', discordUsername: 'retrogamer', discordId: '567890', source: 'DISCORD', status: 'CANCELLED', createdAt: '2026-02-09T16:00:00Z' },
  { id: '6', playerName: 'ArcadeHero', discordUsername: 'arcadehero', discordId: '678901', source: 'STARTGG', status: 'DQ', createdAt: '2026-02-08T12:00:00Z' },
];

// Utility components
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

function Checkbox({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-4 h-4 rounded border transition-colors ${
        checked
          ? 'bg-emerald-500 border-emerald-500'
          : 'bg-transparent border-zinc-600 hover:border-zinc-400'
      }`}
    >
      {checked && (
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent || 'text-zinc-100'}`}>{value}</p>
    </div>
  );
}

// Main component
export default function RegistrationsPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<RegistrationStatus | 'all'>('all');
  const [filterSource, setFilterSource] = useState<RegistrationSource | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter registrations
  const filteredRegistrations = mockRegistrations.filter((reg) => {
    if (filterStatus !== 'all' && reg.status !== filterStatus) return false;
    if (filterSource !== 'all' && reg.source !== filterSource) return false;
    if (searchQuery && !reg.playerName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Stats
  const totalRegistrations = mockRegistrations.length;
  const confirmedCount = mockRegistrations.filter((r) => r.status === 'CONFIRMED').length;
  const pendingCount = mockRegistrations.filter((r) => r.status === 'PENDING').length;
  const dqCount = mockRegistrations.filter((r) => r.status === 'DQ').length;

  // Handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredRegistrations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRegistrations.map((r) => r.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800/50 bg-zinc-900/20">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex items-center gap-2 py-4 text-sm">
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              Dashboard
            </Link>
            <span className="text-zinc-600">/</span>
            <Link href={`/tournaments/${tournamentId}`} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              Tournament
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">Registrations</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total" value={totalRegistrations} />
          <StatCard label="Confirmed" value={confirmedCount} accent="text-emerald-400" />
          <StatCard label="Pending" value={pendingCount} accent="text-amber-400" />
          <StatCard label="DQ'd" value={dqCount} accent="text-red-400" />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700 w-64"
            />

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as RegistrationStatus | 'all')}
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-700"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="DQ">DQ</option>
            </select>

            {/* Source Filter */}
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as RegistrationSource | 'all')}
              className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-700"
            >
              <option value="all">All Sources</option>
              <option value="STARTGG">Start.gg</option>
              <option value="DISCORD">Discord</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <span className="text-sm text-zinc-400">{selectedIds.size} selected</span>
                <button className="px-3 py-2 text-sm font-medium text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/30 rounded-lg transition-colors">
                  Approve Selected
                </button>
                <button className="px-3 py-2 text-sm font-medium text-red-400 bg-red-900/20 hover:bg-red-900/30 rounded-lg transition-colors">
                  Reject Selected
                </button>
              </>
            )}
            <button className="px-4 py-2 text-sm font-medium text-zinc-200 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg transition-colors">
              + Add Registration
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800/50">
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={selectedIds.size === filteredRegistrations.length && filteredRegistrations.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Player</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Discord</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {filteredRegistrations.map((registration) => (
                <tr key={registration.id} className="hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedIds.has(registration.id)}
                      onChange={() => handleSelect(registration.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-zinc-200">{registration.playerName}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-zinc-400">{registration.discordUsername}</span>
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
                          <button className="px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-900/20 rounded transition-colors">
                            Approve
                          </button>
                          <button className="px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-900/20 rounded transition-colors">
                            Reject
                          </button>
                        </>
                      )}
                      {registration.status === 'CONFIRMED' && (
                        <button className="px-2 py-1 text-xs font-medium text-amber-400 hover:bg-amber-900/20 rounded transition-colors">
                          DQ
                        </button>
                      )}
                      <button className="px-2 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors">
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRegistrations.length === 0 && (
            <div className="text-center py-12">
              <p className="text-zinc-500">No registrations found</p>
              <p className="text-xs text-zinc-600 mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
