'use client';

import { useState } from 'react';

// Types
interface UserProfile {
  id: string;
  discordUsername: string;
  discordAvatar: string | null;
  startggId: string | null;
  startggGamerTag: string | null;
  startggSlug: string | null;
}

interface TournamentHistory {
  id: string;
  name: string;
  date: string;
  placement: number | null;
  status: string;
}

interface MatchHistory {
  id: string;
  opponent: string;
  result: 'win' | 'loss' | 'pending';
  score: string;
  date: string;
  tournament: string;
}

// Initial mock data for SSR
const initialUser: UserProfile = {
  id: '',
  discordUsername: 'Loading...',
  discordAvatar: null,
  startggId: null,
  startggGamerTag: null,
  startggSlug: null,
};

// Utility components
function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-zinc-100 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
  accent,
}: {
  label: string;
  value: string | number;
  trend?: string;
  accent?: string;
}) {
  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent || 'text-zinc-100'}`}>{value}</p>
      {trend && <p className="text-xs text-zinc-500 mt-1">{trend}</p>}
    </div>
  );
}

function LinkedAccount({
  provider,
  connected,
  username,
  avatar,
  action,
  actionLabel,
}: {
  provider: string;
  connected: boolean;
  username?: string;
  avatar?: string | null;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
          {provider === 'Discord' ? (
            <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-zinc-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12 12-5.373 12-12S18.628 0 12 0zm0 21.6c-5.302 0-9.6-4.298-9.6-9.6S6.698 2.4 12 2.4s9.6 4.298 9.6 9.6-4.298 9.6-9.6 9.6z" />
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-200">{provider}</p>
          <p className="text-xs text-zinc-500">{connected ? username : 'Not connected'}</p>
        </div>
      </div>
      {connected ? (
        <span className="text-xs text-emerald-400 font-medium">Connected</span>
      ) : action && actionLabel ? (
        <button
          onClick={action}
          className="px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function MatchRow({ match }: { match: MatchHistory }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800/30 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            match.result === 'win'
              ? 'bg-emerald-900/50 text-emerald-400'
              : match.result === 'loss'
              ? 'bg-red-900/50 text-red-400'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {match.result === 'win' ? 'W' : match.result === 'loss' ? 'L' : '-'}
        </div>
        <div>
          <p className="text-sm text-zinc-200">vs {match.opponent}</p>
          <p className="text-xs text-zinc-500">{match.tournament}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-zinc-300">{match.score}</p>
        <p className="text-xs text-zinc-500">{match.date}</p>
      </div>
    </div>
  );
}

function TournamentRow({ tournament }: { tournament: TournamentHistory }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800/30 last:border-0">
      <div>
        <p className="text-sm text-zinc-200">{tournament.name}</p>
        <p className="text-xs text-zinc-500">{tournament.date}</p>
      </div>
      <div className="text-right">
        {tournament.status === 'completed' && tournament.placement ? (
          <span className="text-sm font-medium text-zinc-200">#{tournament.placement}</span>
        ) : tournament.status === 'dq' ? (
          <span className="text-xs text-red-400">DQ</span>
        ) : (
          <span className="text-xs text-zinc-500">-</span>
        )}
      </div>
    </div>
  );
}

// Notification preferences type
interface NotificationPreferences {
  matchReadyDm: boolean;
  matchReadyMention: boolean;
  checkInReminder: boolean;
  checkInReminderMinutes: number;
  tournamentAnnouncements: boolean;
  tournamentResults: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
}

// Toggle component
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{label}</span>
      <button
        type="button"
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
    </label>
  );
}

// Time select component
function TimeSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const times = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      times.push(`${hour}:${minute}`);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-zinc-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-600"
      >
        {times.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
    </div>
  );
}

// Reminder minutes select
function ReminderSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-600 ml-auto"
    >
      <option value={5}>5 minutes</option>
      <option value={10}>10 minutes</option>
      <option value={15}>15 minutes</option>
      <option value={30}>30 minutes</option>
    </select>
  );
}

// Notification section component
function NotificationSection({
  preferences,
  onChange,
}: {
  preferences: NotificationPreferences;
  onChange: (prefs: NotificationPreferences) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Match Notifications */}
      <div>
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Match Notifications</h4>
        <div className="space-y-3">
          <Toggle
            checked={preferences.matchReadyDm}
            onChange={(v) => onChange({ ...preferences, matchReadyDm: v })}
            label="Match ready alerts (Discord DM)"
          />
          <Toggle
            checked={preferences.matchReadyMention}
            onChange={(v) => onChange({ ...preferences, matchReadyMention: v })}
            label="Match ready alerts (Thread mention)"
          />
          <div className="flex items-center justify-between py-2">
            <Toggle
              checked={preferences.checkInReminder}
              onChange={(v) => onChange({ ...preferences, checkInReminder: v })}
              label="Check-in reminders"
            />
            {preferences.checkInReminder && (
              <ReminderSelect
                value={preferences.checkInReminderMinutes}
                onChange={(v) => onChange({ ...preferences, checkInReminderMinutes: v })}
              />
            )}
          </div>
        </div>
      </div>

      {/* Tournament Notifications */}
      <div className="pt-4 border-t border-zinc-800/50">
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Tournament Notifications</h4>
        <div className="space-y-3">
          <Toggle
            checked={preferences.tournamentAnnouncements}
            onChange={(v) => onChange({ ...preferences, tournamentAnnouncements: v })}
            label="Tournament announcements"
          />
          <Toggle
            checked={preferences.tournamentResults}
            onChange={(v) => onChange({ ...preferences, tournamentResults: v })}
            label="Results from tournaments I'm watching"
          />
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="pt-4 border-t border-zinc-800/50">
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Quiet Hours</h4>
        <div className="space-y-3">
          <Toggle
            checked={preferences.quietHoursEnabled}
            onChange={(v) => onChange({ ...preferences, quietHoursEnabled: v })}
            label="Enable quiet hours"
          />
          {preferences.quietHoursEnabled && (
            <div className="pl-4 space-y-3 border-l-2 border-zinc-800">
              <div className="flex items-center gap-4">
                <TimeSelect
                  value={preferences.quietHoursStart}
                  onChange={(v) => onChange({ ...preferences, quietHoursStart: v })}
                  label="From"
                />
                <TimeSelect
                  value={preferences.quietHoursEnd}
                  onChange={(v) => onChange({ ...preferences, quietHoursEnd: v })}
                  label="To"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-400">Timezone:</label>
                <select
                  value={preferences.timezone}
                  onChange={(e) => onChange({ ...preferences, timezone: e.target.value })}
                  className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-600"
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Props from server component
interface AccountContentProps {
  user: UserProfile;
  tournaments: TournamentHistory[];
  matches: MatchHistory[];
}

export function AccountContent({ user: initialUser, tournaments: initialTournaments, matches: initialMatches }: AccountContentProps) {
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [tournaments, setTournaments] = useState<TournamentHistory[]>(initialTournaments);
  const [matches, setMatches] = useState<MatchHistory[]>(initialMatches);

  const [notifications, setNotifications] = useState<NotificationPreferences>({
    matchReadyDm: true,
    matchReadyMention: false,
    checkInReminder: true,
    checkInReminderMinutes: 5,
    tournamentAnnouncements: true,
    tournamentResults: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    timezone: 'America/New_York',
  });

  // Calculate stats
  const totalTournaments = tournaments.length;
  const completedTournaments = tournaments.filter((t) => t.status === 'completed').length;
  const wins = matches.filter((m) => m.result === 'win').length;
  const losses = matches.filter((m) => m.result === 'loss').length;
  const winRate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="relative overflow-hidden bg-zinc-900/30 border-b border-zinc-800/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-800/20 via-zinc-950/0 to-zinc-950/0" />
        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-full flex items-center justify-center text-2xl font-bold text-zinc-300">
              {user.discordUsername.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-zinc-100">{user.discordUsername}</h1>
              <p className="text-zinc-400 mt-1">Fighting game competitor</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 -mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Tournaments" value={totalTournaments} accent="text-zinc-100" />
          <StatCard label="Wins" value={wins} accent="text-emerald-400" />
          <StatCard label="Losses" value={losses} accent="text-red-400" />
          <StatCard label="Win Rate" value={`${winRate}%`} accent="text-amber-400" />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Match History */}
            <SectionCard title="Recent Matches">
              {matches.length > 0 ? (
                <div className="divide-y divide-zinc-800/30">
                  {matches.map((match) => (
                    <MatchRow key={match.id} match={match} />
                  ))}
                </div>
              ) : (
                <div className="text-zinc-500 py-4">No matches yet</div>
              )}
            </SectionCard>

            {/* Tournament History */}
            <SectionCard title="Tournament History">
              {tournaments.length > 0 ? (
                <div className="divide-y divide-zinc-800/30">
                  {tournaments.map((tournament) => (
                    <TournamentRow key={tournament.id} tournament={tournament} />
                  ))}
                </div>
              ) : (
                <div className="text-zinc-500 py-4">No tournaments yet</div>
              )}
            </SectionCard>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Linked Accounts */}
            <SectionCard title="Linked Accounts">
              <div className="space-y-1">
                <LinkedAccount
                  provider="Discord"
                  connected={true}
                  username={user.discordUsername}
                  avatar={user.discordAvatar}
                />
                <LinkedAccount
                  provider="Start.gg"
                  connected={!!user.startggId}
                  username={user.startggGamerTag || undefined}
                  actionLabel="Connect"
                  action={() => console.log('Link Start.gg')}
                />
              </div>
            </SectionCard>

            {/* Notification Settings */}
            <SectionCard title="Notifications">
              <NotificationSection
                preferences={notifications}
                onChange={setNotifications}
              />
              <div className="mt-6 pt-4 border-t border-zinc-800/50">
                <button className="px-4 py-2 text-sm font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">
                  Save Preferences
                </button>
              </div>
            </SectionCard>

            {/* Danger Zone */}
            <SectionCard title="Account">
              <button className="w-full py-2 text-sm text-red-400 border border-red-900/50 hover:bg-red-900/20 rounded-lg transition-colors">
                Delete Account
              </button>
              <p className="text-xs text-zinc-500 mt-2">
                This action is irreversible. All your data will be permanently deleted.
              </p>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
