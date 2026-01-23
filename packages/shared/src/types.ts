// Shared types for FightRise

export interface TournamentConfig {
  autoCreateThreads: boolean;
  requireCheckIn: boolean;
  checkInWindowMinutes: number;
  allowSelfReporting: boolean;
}

export const DEFAULT_TOURNAMENT_CONFIG: TournamentConfig = {
  autoCreateThreads: true,
  requireCheckIn: true,
  checkInWindowMinutes: 10,
  allowSelfReporting: true,
};
