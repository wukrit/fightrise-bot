'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Types
type Step = 'link' | 'discord' | 'settings' | 'confirm';

interface TournamentFormData {
  // Step 1: Link
  startggSlug: string;
  startggUrl: string;
  tournamentName: string;
  tournamentStartAt: string | null;
  tournamentEndAt: string | null;
  tournamentState: string;

  // Step 2: Discord
  discordGuildId: string;
  discordChannelId: string;

  // Step 3: Settings
  autoCreateThreads: boolean;
  requireCheckIn: boolean;
  checkInWindowMinutes: number;
  allowSelfReporting: boolean;
}

interface DiscordGuild {
  id: string;
  name: string;
}

interface DiscordChannel {
  id: string;
  name: string;
}

// Icons
const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const LinkIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const ServerIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ReviewIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

// Step indicator component
function StepIndicator({ currentStep, steps }: { currentStep: Step; steps: { id: Step; label: string }[] }) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                index < currentIndex
                  ? 'bg-emerald-500 text-white'
                  : index === currentIndex
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {index < currentIndex ? <CheckIcon /> : index + 1}
            </div>
            <span
              className={`text-xs mt-2 font-medium ${
                index <= currentIndex ? 'text-zinc-300' : 'text-zinc-600'
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`w-16 sm:w-24 h-0.5 mx-2 transition-colors duration-300 ${
                index < currentIndex ? 'bg-emerald-500' : 'bg-zinc-800'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Step 1: Link Tournament
function LinkTournamentStep({
  formData,
  updateFormData,
  onValidate,
  isValidating,
  validationError,
}: {
  formData: TournamentFormData;
  updateFormData: (data: Partial<TournamentFormData>) => void;
  onValidate: () => void;
  isValidating: boolean;
  validationError: string | null;
}) {
  const handleUrlChange = (url: string) => {
    updateFormData({ startggUrl: url });
    // Extract slug from URL
    const match = url.match(/startgg\.com\/([^\/]+)/);
    if (match) {
      updateFormData({ startggSlug: match[1] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-zinc-800 text-zinc-300 mb-4">
          <LinkIcon />
        </div>
        <h2 className="text-xl font-semibold text-zinc-100">Link Your Tournament</h2>
        <p className="text-zinc-500 mt-2">
          Enter your Start.gg tournament URL to import it into FightRise
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Start.gg Tournament URL
        </label>
        <input
          type="text"
          value={formData.startggUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://www.start.gg/tournament/fightrise-weekly-42"
          className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />

        {formData.startggSlug && (
          <p className="text-xs text-zinc-500 mt-2">
            Tournament slug: <span className="text-zinc-400 font-mono">{formData.startggSlug}</span>
          </p>
        )}

        {validationError && (
          <p className="text-red-400 text-sm mt-2">{validationError}</p>
        )}

        <div className="mt-6 p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-lg">
          <p className="text-sm text-zinc-400">
            <strong className="text-zinc-300">Don&apos;t have a tournament yet?</strong>
            <br />
            Create one on{' '}
            <a
              href="https://start.gg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline"
            >
              Start.gg
            </a>{' '}
            first, then come back to link it here.
          </p>
        </div>
      </div>

      <div className="flex justify-center mt-8">
        <button
          onClick={onValidate}
          disabled={!formData.startggSlug || isValidating}
          className="px-8 py-3 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isValidating ? 'Validating...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

// Step 2: Discord Setup
function DiscordSetupStep({
  formData,
  updateFormData,
  onBack,
  onNext,
}: {
  formData: TournamentFormData;
  updateFormData: (data: Partial<TournamentFormData>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [loadingDiscord, setLoadingDiscord] = useState(false);

  useEffect(() => {
    async function fetchDiscordData() {
      setLoadingDiscord(true);
      try {
        const response = await fetch('/api/discord/guilds');
        if (response.ok) {
          const data = await response.json();
          setGuilds(data.guilds || []);
          setChannels(data.channels || []);
        }
      } catch (err) {
        console.error('Failed to fetch Discord data:', err);
      } finally {
        setLoadingDiscord(false);
      }
    }

    fetchDiscordData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-zinc-800 text-zinc-300 mb-4">
          <ServerIcon />
        </div>
        <h2 className="text-xl font-semibold text-zinc-100">Discord Integration</h2>
        <p className="text-zinc-500 mt-2">
          Configure how FightRise interacts with Discord
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Discord Server
          </label>
          <select
            value={formData.discordGuildId}
            onChange={(e) => updateFormData({ discordGuildId: e.target.value })}
            className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={loadingDiscord}
          >
            <option value="">
              {loadingDiscord ? 'Loading servers...' : 'Select a server...'}
            </option>
            {guilds.map((guild) => (
              <option key={guild.id} value={guild.id}>
                {guild.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Announcement Channel
          </label>
          <select
            value={formData.discordChannelId}
            onChange={(e) => updateFormData({ discordChannelId: e.target.value })}
            className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            disabled={loadingDiscord}
          >
            <option value="">
              {loadingDiscord ? 'Loading channels...' : 'Select a channel...'}
            </option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                #{channel.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-zinc-800 text-zinc-300 font-medium rounded-lg hover:bg-zinc-700 transition-colors flex items-center gap-2"
        >
          <ArrowLeftIcon /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!formData.discordGuildId || !formData.discordChannelId}
          className="px-8 py-3 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

// Step 3: Settings
function SettingsStep({
  formData,
  updateFormData,
  onBack,
  onNext,
}: {
  formData: TournamentFormData;
  updateFormData: (data: Partial<TournamentFormData>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-zinc-800 text-zinc-300 mb-4">
          <SettingsIcon />
        </div>
        <h2 className="text-xl font-semibold text-zinc-100">Match Settings</h2>
        <p className="text-zinc-500 mt-2">
          Configure check-in and scoring behavior
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Check-in Window (minutes)
          </label>
          <input
            type="number"
            value={formData.checkInWindowMinutes}
            onChange={(e) =>
              updateFormData({ checkInWindowMinutes: parseInt(e.target.value) || 10 })
            }
            className="w-full bg-zinc-900/50 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="space-y-4 pt-4 border-t border-zinc-800">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.autoCreateThreads}
              onChange={(e) => updateFormData({ autoCreateThreads: e.target.checked })}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-sm text-zinc-300">
              Automatically create Discord threads for matches
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requireCheckIn}
              onChange={(e) => updateFormData({ requireCheckIn: e.target.checked })}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-sm text-zinc-300">
              Require player check-in before matches
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allowSelfReporting}
              onChange={(e) => updateFormData({ allowSelfReporting: e.target.checked })}
              className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-sm text-zinc-300">
              Allow players to report their own scores
            </span>
          </label>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-zinc-800 text-zinc-300 font-medium rounded-lg hover:bg-zinc-700 transition-colors flex items-center gap-2"
        >
          <ArrowLeftIcon /> Back
        </button>
        <button
          onClick={onNext}
          className="px-8 py-3 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-400 transition-colors"
        >
          Review
        </button>
      </div>
    </div>
  );
}

// Step 4: Confirm
function ConfirmStep({
  formData,
  onBack,
  onSubmit,
  isSubmitting,
}: {
  formData: TournamentFormData;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-zinc-800 text-zinc-300 mb-4">
          <ReviewIcon />
        </div>
        <h2 className="text-xl font-semibold text-zinc-100">Review & Activate</h2>
        <p className="text-zinc-500 mt-2">
          Review your tournament configuration
        </p>
      </div>

      <div className="max-w-lg mx-auto space-y-4">
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Tournament
          </h3>
          <p className="text-zinc-100 font-medium">{formData.tournamentName || 'Loading...'}</p>
          <p className="text-sm text-zinc-500 font-mono">{formData.startggSlug}</p>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Discord
          </h3>
          <p className="text-zinc-100">Server: {formData.discordGuildId || 'Not selected'}</p>
          <p className="text-zinc-100">Channel: {formData.discordChannelId ? `#${formData.discordChannelId}` : 'Not selected'}</p>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Settings
          </h3>
          <ul className="space-y-1 text-sm text-zinc-300">
            <li>Check-in window: {formData.checkInWindowMinutes} minutes</li>
            <li>Auto-create threads: {formData.autoCreateThreads ? 'Yes' : 'No'}</li>
            <li>Require check-in: {formData.requireCheckIn ? 'Yes' : 'No'}</li>
            <li>Self-reporting: {formData.allowSelfReporting ? 'Yes' : 'No'}</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="px-6 py-3 bg-zinc-800 text-zinc-300 font-medium rounded-lg hover:bg-zinc-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <ArrowLeftIcon /> Back
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-8 py-3 bg-emerald-500 text-white font-medium rounded-lg hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Creating...' : 'Create Tournament'}
        </button>
      </div>
    </div>
  );
}

// Main wizard component
export default function NewTournamentPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('link');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<TournamentFormData>({
    startggSlug: '',
    startggUrl: '',
    tournamentName: '',
    tournamentStartAt: null,
    tournamentEndAt: null,
    tournamentState: '',
    discordGuildId: '',
    discordChannelId: '',
    autoCreateThreads: true,
    requireCheckIn: true,
    checkInWindowMinutes: 10,
    allowSelfReporting: true,
  });

  const steps: { id: Step; label: string }[] = [
    { id: 'link', label: 'Link' },
    { id: 'discord', label: 'Discord' },
    { id: 'settings', label: 'Settings' },
    { id: 'confirm', label: 'Confirm' },
  ];

  const updateFormData = (data: Partial<TournamentFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationError(null);

    try {
      // Call the API to validate the tournament against Start.gg
      const response = await fetch('/api/tournaments/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: formData.startggSlug }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to validate tournament');
      }

      const data = await response.json();

      updateFormData({
        tournamentName: data.tournament.name,
        tournamentStartAt: data.tournament.startAt,
        tournamentEndAt: data.tournament.endAt,
        tournamentState: data.tournament.state,
      });

      setCurrentStep('discord');
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Failed to validate tournament. Please check the URL and try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Call the API to create the tournament
      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startggSlug: formData.startggSlug,
          discordGuildId: formData.discordGuildId,
          discordChannelId: formData.discordChannelId,
          settings: {
            autoCreateThreads: formData.autoCreateThreads,
            requireCheckIn: formData.requireCheckIn,
            checkInWindowMinutes: formData.checkInWindowMinutes,
            allowSelfReporting: formData.allowSelfReporting,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create tournament');
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to create tournament:', error);
      setValidationError('Failed to create tournament. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800/50 bg-zinc-900/20">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
          >
            <ArrowLeftIcon /> Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <StepIndicator currentStep={currentStep} steps={steps} />

        {currentStep === 'link' && (
          <LinkTournamentStep
            formData={formData}
            updateFormData={updateFormData}
            onValidate={handleValidate}
            isValidating={isValidating}
            validationError={validationError}
          />
        )}

        {currentStep === 'discord' && (
          <DiscordSetupStep
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep('link')}
            onNext={() => setCurrentStep('settings')}
          />
        )}

        {currentStep === 'settings' && (
          <SettingsStep
            formData={formData}
            updateFormData={updateFormData}
            onBack={() => setCurrentStep('discord')}
            onNext={() => setCurrentStep('confirm')}
          />
        )}

        {currentStep === 'confirm' && (
          <ConfirmStep
            formData={formData}
            onBack={() => setCurrentStep('settings')}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
