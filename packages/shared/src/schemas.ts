import { z } from 'zod';
import { INTERACTION_PREFIX } from './constants.js';

// Tournament configuration schema
export const TournamentConfigSchema = z.object({
  autoCreateThreads: z.boolean(),
  requireCheckIn: z.boolean(),
  checkInWindowMinutes: z.number().positive(),
  allowSelfReporting: z.boolean(),
});

export type ValidatedTournamentConfig = z.infer<typeof TournamentConfigSchema>;

// Valid interaction prefixes
const validPrefixes = Object.values(INTERACTION_PREFIX) as [string, ...string[]];

// Interaction ID schema - validates format "prefix:part1:part2:..."
export const InteractionIdSchema = z
  .string()
  .min(1, 'Interaction ID cannot be empty')
  .refine(
    (val) => {
      const parts = val.split(':');
      return parts.length >= 1 && parts[0].length > 0;
    },
    { message: 'Interaction ID must have a valid prefix' }
  )
  .refine(
    (val) => {
      const prefix = val.split(':')[0];
      return validPrefixes.includes(prefix);
    },
    { message: `Interaction ID prefix must be one of: ${validPrefixes.join(', ')}` }
  );

// Partial tournament config for updates
export const PartialTournamentConfigSchema = TournamentConfigSchema.partial();

export type PartialTournamentConfig = z.infer<typeof PartialTournamentConfigSchema>;
