'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Types
type TournamentState = 'CREATED' | 'REGISTRATION_OPEN' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface Tournament {
  id: string;
  name: string;
  startggSlug: string;
  startAt: string | null;
  state: TournamentState;
  events: Event[];
}

interface Event {
  id: string;
  name: string;
  slug: string;
  entrantCount: number;
}

interface UserMatch {
  matchId: string;
  playerId: string;
}

// Mock data - in production would come from API
const mockTournament: Tournament = {
  id: '1',
  name: 'FightRise Weekly #42',
  startggSlug: 'fightrise-weekly-42',
  startAt: '2026-02-20T18:00:00Z',
  state: 'IN_PROGRESS',
  events: [
    { id: 'e1', name: 'Street Fighter 6', slug: 'sf6', entrantCount: 32 },
    { id: 'e2', name: 'Tekken 8', slug: 'tekken8', entrantCount: 16 },
    { id: 'e3', name: 'Guilty Gear Strive', slug: 'ggst', entrantCount: 24 },
  ],
};

const mockUserMatches: UserMatch[] = [
  { matchId: 'm1', playerId: 'p1' },
];

// Get Start.gg bracket embed URL
function getBracketEmbedUrl(tournamentSlug: string, eventSlug: string): string {
  return `https://start.gg/tournament/${tournamentSlug}/event/${eventSlug}/standalone-bracket`;
}

// Bracket View Toggle
type ViewMode = 'embed' | 'list';

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800 rounded-lg p-1">
      <button
        onClick={() => onChange('embed')}
        className={`px-4 py-2 text-sm rounded-md transition-colors ${
          mode === 'embed'
            ? 'bg-zinc-700 text-zinc-100'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Bracket View
        </span>
      </button>
      <button
        onClick={() => onChange('list')}
        className={`px-4 py-2 text-sm rounded-md transition-colors ${
          mode === 'list'
            ? 'bg-zinc-700 text-zinc-100'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          List View
        </span>
      </button>
    </div>
  );
}

// Event Selector
function EventSelector({
  events,
  selectedEventId,
  onSelect,
}: {
  events: Event[];
  selectedEventId: string;
  onSelect: (eventId: string) => void;
}) {
  return (
    <select
      value={selectedEventId}
      onChange={(e) => onSelect(e.target.value)}
      className="bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-700"
    >
      {events.map((event) => (
        <option key={event.id} value={event.slug}>
          {event.name} ({event.entrantCount} entrants)
        </option>
      ))}
    </select>
  );
}

// Embedded Bracket
function BracketEmbed({
  tournamentSlug,
  eventSlug,
}: {
  tournamentSlug: string;
  eventSlug: string;
}) {
  const embedUrl = getBracketEmbedUrl(tournamentSlug, eventSlug);

  return (
    <div className="w-full h-[calc(100vh-300px)] min-h-[500px] border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/20">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        title="Tournament Bracket"
        allow="clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}

// Simple List View (for mobile/fallback)
interface BracketMatch {
  id: string;
  round: string;
  player1: string;
  player2: string;
  score: string | null;
  winner: string | null;
  isUserMatch: boolean;
}

function BracketListView({ eventSlug }: { eventSlug: string }) {
  const [matches, setMatches] = useState<BracketMatch[]>([]);

  // Mock bracket data
  useEffect(() => {
    const mockBracketMatches: BracketMatch[] = [
      { id: 'm1', round: 'Winners Finals', player1: 'FighterPro', player2: 'ComboMaster', score: '2-0', winner: 'FighterPro', isUserMatch: true },
      { id: 'm2', round: 'Winners Finals', player1: 'PixelNinja', player2: 'ArcadeHero', score: '1-2', winner: 'ArcadeHero', isUserMatch: false },
      { id: 'm3', round: 'Winners Semifinals', player1: 'FighterPro', player2: 'RetroGamer', score: '2-1', winner: 'FighterPro', isUserMatch: true },
      { id: 'm4', round: 'Winners Semifinals', player1: 'ComboMaster', player2: 'NewChallenger', score: '2-0', winner: 'ComboMaster', isUserMatch: false },
      { id: 'm5', round: 'Winners Semifinals', player1: 'PixelNinja', player2: 'ProGamer', score: '2-1', winner: 'PixelNinja', isUserMatch: false },
      { id: 'm6', round: 'Winners Semifinals', player1: 'ArcadeHero', player2: 'Veteran', score: '2-0', winner: 'ArcadeHero', isUserMatch: false },
    ];
    setMatches(mockBracketMatches);
  }, [eventSlug]);

  const rounds = [...new Set(matches.map((m) => m.round))];

  return (
    <div className="space-y-6">
      {rounds.map((round) => (
        <div key={round}>
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">{round}</h3>
          <div className="space-y-2">
            {matches
              .filter((m) => m.round === round)
              .map((match) => (
                <div
                  key={match.id}
                  className={`bg-zinc-900/30 border rounded-lg p-4 ${
                    match.isUserMatch
                      ? 'border-emerald-800/50 bg-emerald-900/10'
                      : 'border-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          match.winner === match.player1
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        1
                      </span>
                      <span className="text-zinc-200">{match.player1}</span>
                      {match.winner === match.player1 && (
                        <span className="text-emerald-400 text-xs">✓</span>
                      )}
                    </div>
                    <span className="text-zinc-500 text-sm font-mono">
                      {match.score || '-'}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-200">{match.player2}</span>
                      {match.winner === match.player2 && (
                        <span className="text-emerald-400 text-xs">✓</span>
                      )}
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          match.winner === match.player2
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        2
                      </span>
                    </div>
                  </div>
                  {match.isUserMatch && (
                    <div className="mt-2 pt-2 border-t border-zinc-800/50">
                      <span className="text-xs text-emerald-400">Your match</span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Empty State
function EmptyState({ eventSlug }: { eventSlug: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-900/50 flex items-center justify-center">
        <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-zinc-300 mb-2">Bracket not available</h3>
      <p className="text-sm text-zinc-500 mb-4">
        The bracket for this event is not yet available on Start.gg
      </p>
      <a
        href={`https://start.gg/${eventSlug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        View on Start.gg
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  );
}

// Main Component
export default function BracketPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [selectedEventSlug, setSelectedEventSlug] = useState<string>(mockTournament.events[0]?.slug || '');
  const [viewMode, setViewMode] = useState<ViewMode>('embed');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading the bracket
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, [selectedEventSlug]);

  const selectedEvent = mockTournament.events.find((e) => e.slug === selectedEventSlug);

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
            <span className="text-zinc-300">Bracket</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Bracket</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {mockTournament.name} • {selectedEvent?.name || 'Select an event'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <EventSelector
              events={mockTournament.events}
              selectedEventId={selectedEventSlug}
              onSelect={setSelectedEventSlug}
            />
            <ViewToggle mode={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {/* View Toggle Info */}
        {viewMode === 'list' && (
          <div className="mb-6 p-4 bg-amber-900/20 border border-amber-800/50 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-amber-200">List view shows simplified bracket</p>
                <p className="text-xs text-amber-400/70 mt-1">
                  For full bracket features including match details and live updates, use the Bracket View
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bracket Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-zinc-500">Loading bracket...</p>
            </div>
          </div>
        ) : viewMode === 'embed' ? (
          selectedEvent ? (
            <BracketEmbed
              tournamentSlug={mockTournament.startggSlug}
              eventSlug={selectedEventSlug}
            />
          ) : (
            <EmptyState eventSlug={mockTournament.startggSlug} />
          )
        ) : (
          <BracketListView eventSlug={selectedEventSlug} />
        )}

        {/* Footer Note */}
        <div className="mt-8 pt-6 border-t border-zinc-800/50">
          <p className="text-xs text-zinc-600 text-center">
            Bracket data powered by{' '}
            <a
              href="https://start.gg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-400"
            >
              Start.gg
            </a>
            . Data refreshes automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
