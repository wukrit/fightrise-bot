'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Types
type TournamentState = 'CREATED' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface Tournament {
  id: string;
  name: string;
  startggSlug: string;
  startAt: string | null;
  endAt: string | null;
  state: TournamentState;
  discordGuildId: string | null;
  discordChannelId: string | null;
  autoCreateThreads: boolean;
  requireCheckIn: boolean;
  checkInWindowMinutes: number;
  allowSelfReporting: boolean;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

// Utility components
function SectionCard({
  title,
  description,
  children,
  icon,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6">
      <div className="flex items-start gap-3 mb-4">
        {icon && <div className="text-zinc-400 mt-0.5">{icon}</div>}
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
          {description && <p className="text-sm text-zinc-500 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function FormField({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-300">{label}</label>
      {description && <p className="text-xs text-zinc-500">{description}</p>}
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          checked ? 'bg-emerald-500' : 'bg-zinc-700 group-hover:bg-zinc-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      {label && <span className="text-sm text-zinc-300">{label}</span>}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all"
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function Input({
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all"
    />
  );
}

function StatusBadge({ state }: { state: TournamentState }) {
  const statusConfig: Record<TournamentState, { label: string; className: string }> = {
    CREATED: { label: 'Draft', className: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
    REGISTRATION_OPEN: { label: 'Registration Open', className: 'bg-emerald-900/50 text-emerald-400 border-emerald-700/50' },
    REGISTRATION_CLOSED: { label: 'Registration Closed', className: 'bg-amber-900/50 text-amber-400 border-amber-700/50' },
    IN_PROGRESS: { label: 'Live', className: 'bg-rose-900/50 text-rose-400 border-rose-700/50 animate-pulse' },
    COMPLETED: { label: 'Completed', className: 'bg-slate-800 text-slate-400 border-slate-700' },
    CANCELLED: { label: 'Cancelled', className: 'bg-red-900/30 text-red-400 border-red-800/50' },
  };

  const config = statusConfig[state];

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${config.className}`}>
      {state === 'IN_PROGRESS' && (
        <span className="w-1.5 h-1.5 bg-rose-400 rounded-full mr-1.5 animate-ping" />
      )}
      {config.label}
    </span>
  );
}

// Icons
const ServerIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const ChannelIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

// Main form component
function TournamentSettingsForm({ tournament }: { tournament: Tournament }) {
  const [formData, setFormData] = useState({
    discordGuildId: tournament.discordGuildId || '',
    discordChannelId: tournament.discordChannelId || '',
    autoCreateThreads: tournament.autoCreateThreads,
    requireCheckIn: tournament.requireCheckIn,
    checkInWindowMinutes: tournament.checkInWindowMinutes,
    allowSelfReporting: tournament.allowSelfReporting,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Mock data - in production this would come from API
  const mockGuilds: DiscordGuild[] = [
    { id: '1', name: 'FightRise Community', icon: null },
    { id: '2', name: 'FGC Tournaments', icon: null },
  ];

  const mockChannels: DiscordChannel[] = [
    { id: '1', name: 'general', type: 0 },
    { id: '2', name: 'tournaments', type: 0 },
    { id: '3', name: 'announcements', type: 0 },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{tournament.name}</h1>
          <p className="text-sm text-zinc-500 mt-1">{tournament.startggSlug}</p>
        </div>
        <StatusBadge state={tournament.state} />
      </div>

      {/* Tournament Info */}
      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Tournament Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-zinc-500">Start Time</p>
            <p className="text-sm text-zinc-200 mt-0.5">{formatDate(tournament.startAt)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">End Time</p>
            <p className="text-sm text-zinc-200 mt-0.5">{formatDate(tournament.endAt)}</p>
          </div>
        </div>
      </div>

      {/* Discord Integration */}
      <SectionCard
        title="Discord Integration"
        description="Configure how FightRise interacts with Discord"
        icon={<ServerIcon />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Discord Server" description="Select the server where this tournament will run">
            <Select
              value={formData.discordGuildId}
              onChange={(v) => setFormData({ ...formData, discordGuildId: v })}
              options={mockGuilds.map((g) => ({ value: g.id, label: g.name }))}
              placeholder="Select a server..."
            />
          </FormField>

          <FormField label="Announcement Channel" description="Channel for match thread announcements">
            <Select
              value={formData.discordChannelId}
              onChange={(v) => setFormData({ ...formData, discordChannelId: v })}
              options={mockChannels.map((c) => ({ value: c.id, label: `#${c.name}` }))}
              placeholder="Select a channel..."
            />
          </FormField>
        </div>

        <div className="pt-4 border-t border-zinc-800/50">
          <Toggle
            checked={formData.autoCreateThreads}
            onChange={(v) => setFormData({ ...formData, autoCreateThreads: v })}
            label="Automatically create Discord threads for matches"
          />
        </div>
      </SectionCard>

      {/* Match Settings */}
      <SectionCard
        title="Match Settings"
        description="Configure check-in and scoring behavior"
        icon={<SettingsIcon />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Check-in Window" description="Minutes allowed for players to check in">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={formData.checkInWindowMinutes}
                onChange={(v) => setFormData({ ...formData, checkInWindowMinutes: parseInt(v) || 10 })}
              />
              <span className="text-sm text-zinc-500">minutes</span>
            </div>
          </FormField>
        </div>

        <div className="pt-4 space-y-4 border-t border-zinc-800/50">
          <Toggle
            checked={formData.requireCheckIn}
            onChange={(v) => setFormData({ ...formData, requireCheckIn: v })}
            label="Require player check-in before matches"
          />
          <Toggle
            checked={formData.allowSelfReporting}
            onChange={(v) => setFormData({ ...formData, allowSelfReporting: v })}
            label="Allow players to report their own scores"
          />
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard
        title="Notifications"
        description="Configure when and how you receive alerts"
        icon={<BellIcon />}
      >
        <div className="space-y-4">
          <Toggle
            checked={true}
            onChange={() => {}}
            label="Notify when matches are ready"
          />
          <Toggle
            checked={true}
            onChange={() => {}}
            label="Notify on player check-in"
          />
          <Toggle
            checked={false}
            onChange={() => {}}
            label="Notify on score disputes"
          />
        </div>
      </SectionCard>

      {/* Admin Management */}
      <SectionCard
        title="Tournament Admins"
        description="Manage who can configure this tournament"
        icon={<UsersIcon />}
      >
        <div className="text-sm text-zinc-400">
          <p>You are currently the only admin of this tournament.</p>
          <button className="mt-2 text-emerald-400 hover:text-emerald-300 transition-colors">
            + Add admin from Discord
          </button>
        </div>
      </SectionCard>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4 pt-4">
        {saveSuccess && (
          <span className="text-sm text-emerald-400 animate-fadeIn">Settings saved successfully!</span>
        )}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-zinc-100 text-zinc-900 font-medium rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// Main page
export default function TournamentSettingsPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  // Mock tournament data - in production fetch from API
  const tournament: Tournament = {
    id: tournamentId,
    name: 'FightRise Weekly #42',
    startggSlug: 'fightrise-weekly-42',
    startAt: '2026-02-20T18:00:00Z',
    endAt: '2026-02-20T23:00:00Z',
    state: 'REGISTRATION_OPEN',
    discordGuildId: '1',
    discordChannelId: '2',
    autoCreateThreads: true,
    requireCheckIn: true,
    checkInWindowMinutes: 10,
    allowSelfReporting: true,
  };

  return (
    <div>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>

      {/* Navigation */}
      <div className="border-b border-zinc-800/50 bg-zinc-900/20">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex items-center gap-2 py-4 text-sm">
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              Dashboard
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-300">{tournament.name}</span>
          </nav>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <TournamentSettingsForm tournament={tournament} />
      </div>
    </div>
  );
}
