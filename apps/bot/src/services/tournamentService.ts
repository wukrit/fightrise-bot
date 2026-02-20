import { prisma, TournamentState, AdminRole, Prisma, AuditAction, AuditSource } from '@fightrise/database';
import { StartGGClient, Tournament as StartGGTournament } from '@fightrise/startgg-client';
import { Client } from 'discord.js';
import { schedulePoll, calculatePollInterval } from './pollingService.js';
import { RegistrationSyncService } from './registrationSyncService.js';
import { decodeStartggToken, validateTournamentSlug } from '@fightrise/shared';
import { ValidationError } from '@fightrise/shared';
import { createAuditLog } from './auditService.js';

// Type for tournament with events included
type TournamentWithEvents = Prisma.TournamentGetPayload<{
  include: { events: true };
}>;

/**
 * Result type for tournament setup operation
 */
export type TournamentSetupResult =
  | { success: true; tournament: TournamentWithEvents | null; isUpdate: boolean }
  | { success: false; error: TournamentSetupError };

export type TournamentSetupError =
  | { code: 'USER_NOT_LINKED'; message: string }
  | { code: 'OAUTH_REQUIRED'; message: string }
  | { code: 'TOURNAMENT_NOT_FOUND'; message: string }
  | { code: 'NOT_ADMIN'; message: string }
  | { code: 'API_ERROR'; message: string };

/**
 * Service for tournament-related operations
 */
export class TournamentService {
  private startggClient: StartGGClient;
  private registrationSyncService: RegistrationSyncService;

  constructor(startggApiKey: string) {
    this.startggClient = new StartGGClient({
      apiKey: startggApiKey,
      cache: { enabled: true, ttlMs: 60000 },
      retry: { maxRetries: 3 },
    });
    this.registrationSyncService = new RegistrationSyncService(startggApiKey);
  }

  /**
   * Main entry point for setting up a tournament
   */
  async setupTournament(params: {
    discordUserId: string;
    discordGuildId: string;
    matchChannelId: string;
    tournamentSlug: string;
    discordClient?: Client;
  }): Promise<TournamentSetupResult> {
    const { discordUserId, discordGuildId, matchChannelId, tournamentSlug, discordClient } = params;

    // Step 1: Verify user has linked Start.gg account
    const user = await prisma.user.findUnique({
      where: { discordId: discordUserId },
    });

    if (!user?.startggId) {
      return {
        success: false,
        error: {
          code: 'USER_NOT_LINKED',
          message: "You haven't linked your Start.gg account yet.\n\nUse `/link-startgg` to connect your account, then try again.",
        },
      };
    }

    // Step 2: Normalize and fetch tournament
    const normalizedSlug = this.normalizeSlug(tournamentSlug);
    const startggTournament = await this.fetchTournament(normalizedSlug);

    if (!startggTournament) {
      return {
        success: false,
        error: {
          code: 'TOURNAMENT_NOT_FOUND',
          message: `Tournament not found.\n\nPlease check the slug and try again. The slug should be the part after "start.gg/tournament/" in the URL.\n\nExample: For https://start.gg/tournament/my-weekly-42, use \`my-weekly-42\``,
        },
      };
    }

    // Step 3: Validate user is admin (requires OAuth token)
    if (!user.startggToken) {
      return {
        success: false,
        error: {
          code: 'OAUTH_REQUIRED',
          message: 'OAuth connection required.\n\nYou need to link your Start.gg account with OAuth to verify tournament ownership. Use `/link-startgg` to connect your account with full permissions.',
        },
      };
    }

    const decodedToken = decodeStartggToken(user.startggToken);
    const accessToken = decodedToken?.accessToken ?? user.startggToken;
    const isAdmin = await this.validateUserIsAdmin(accessToken, normalizedSlug);
    if (!isAdmin) {
      return {
        success: false,
        error: {
          code: 'NOT_ADMIN',
          message: 'Permission denied.\n\nYou must be an admin or owner of this tournament on Start.gg to configure it.',
        },
      };
    }

    // Step 4: Save tournament configuration
    const result = await this.saveTournamentConfig({
      startggTournament,
      normalizedSlug,
      discordGuildId,
      matchChannelId,
      userId: user.id,
      discordClient,
    });

    return result;
  }

  /**
   * Normalize tournament slug from various input formats
   * @throws ValidationError if the resulting slug is invalid
   */
  normalizeSlug(input: string): string {
    let slug = input.trim();

    // Remove URL prefix if present
    // Handles: https://start.gg/tournament/my-slug, https://www.start.gg/tournament/my-slug/event/...
    const urlPattern = /(?:https?:\/\/)?(?:www\.)?start\.gg\/tournament\/([^/\s]+)/i;
    const urlMatch = slug.match(urlPattern);
    if (urlMatch) {
      slug = urlMatch[1];
    }

    // Remove "tournament/" prefix if present
    if (slug.startsWith('tournament/')) {
      slug = slug.slice('tournament/'.length);
    }

    // Remove any trailing path segments (e.g., /event/sf6)
    const slashIndex = slug.indexOf('/');
    if (slashIndex !== -1) {
      slug = slug.slice(0, slashIndex);
    }

    // Validate final slug format
    const validation = validateTournamentSlug(slug);
    if (!validation.valid) {
      throw new ValidationError(validation.error || 'Invalid tournament slug');
    }

    return slug;
  }

  /**
   * Fetch tournament from Start.gg API
   */
  async fetchTournament(slug: string): Promise<StartGGTournament | null> {
    try {
      return await this.startggClient.getTournament(slug);
    } catch (error) {
      // Log error but return null to indicate not found
      console.error('Error fetching tournament from Start.gg:', error);
      return null;
    }
  }

  /**
   * Validate that the user is an admin of the tournament
   * Returns false if validation fails, token is missing, or API error occurs (deny-by-default)
   */
  async validateUserIsAdmin(userToken: string | null, tournamentSlug: string): Promise<boolean> {
    // If user doesn't have OAuth token, deny access (strict validation)
    if (!userToken) {
      console.warn('User does not have Start.gg OAuth token - admin validation failed');
      return false;
    }

    try {
      // Create a client with the user's token to check their tournaments
      const userClient = new StartGGClient({
        apiKey: userToken,
        cache: { enabled: false },
      });

      const userTournaments = await userClient.getTournamentsByOwner();
      if (!userTournaments) {
        return false;
      }

      // Check if the target tournament is in the user's tournaments list
      return userTournaments.nodes.some(
        (t) => t.slug === tournamentSlug || t.slug === `tournament/${tournamentSlug}`
      );
    } catch (error) {
      console.error('Error validating tournament admin status:', error);
      // If we can't verify, deny access (strict validation)
      return false;
    }
  }

  /**
   * Save tournament configuration to database
   * Uses a transaction to ensure atomicity of all database operations
   */
  async saveTournamentConfig(params: {
    startggTournament: StartGGTournament;
    normalizedSlug: string;
    discordGuildId: string;
    matchChannelId: string;
    userId: string;
    discordClient?: Client;
  }): Promise<TournamentSetupResult> {
    const { startggTournament, normalizedSlug, discordGuildId, matchChannelId, userId, discordClient } = params;

    try {
      // Map Start.gg state to our TournamentState enum
      const tournamentState = this.mapStartggState(startggTournament.state);

      // Get IDs of events from Start.gg for orphan cleanup
      const startggEventIds = startggTournament.events.map((e) => e.id);

      // Wrap all database operations in a transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
        // Check if tournament already exists
        const existingTournament = await tx.tournament.findUnique({
          where: { startggId: startggTournament.id },
        });

        const isUpdate = !!existingTournament;

        // Upsert tournament
        const tournament = await tx.tournament.upsert({
          where: { startggId: startggTournament.id },
          create: {
            startggId: startggTournament.id,
            startggSlug: normalizedSlug,
            name: startggTournament.name,
            startAt: startggTournament.startAt ? new Date(startggTournament.startAt * 1000) : null,
            endAt: startggTournament.endAt ? new Date(startggTournament.endAt * 1000) : null,
            state: tournamentState,
            discordGuildId,
            discordChannelId: matchChannelId,
            pollIntervalMs: 30000,
          },
          update: {
            startggSlug: normalizedSlug,
            name: startggTournament.name,
            startAt: startggTournament.startAt ? new Date(startggTournament.startAt * 1000) : null,
            endAt: startggTournament.endAt ? new Date(startggTournament.endAt * 1000) : null,
            state: tournamentState,
            discordGuildId,
            discordChannelId: matchChannelId,
          },
        });

        // Sync events - upsert each event from Start.gg
        for (const event of startggTournament.events) {
          await tx.event.upsert({
            where: { startggId: event.id },
            create: {
              startggId: event.id,
              name: event.name,
              numEntrants: event.numEntrants ?? 0,
              state: this.parseEventState(event.state) as any,
              tournamentId: tournament.id,
            },
            update: {
              name: event.name,
              numEntrants: event.numEntrants ?? 0,
              state: this.parseEventState(event.state) as any,
            },
          });
        }

        // Delete orphaned events (events no longer in Start.gg response)
        await tx.event.deleteMany({
          where: {
            tournamentId: tournament.id,
            startggId: { notIn: startggEventIds },
          },
        });

        // Ensure user is tournament admin
        await tx.tournamentAdmin.upsert({
          where: {
            userId_tournamentId: {
              userId,
              tournamentId: tournament.id,
            },
          },
          create: {
            userId,
            tournamentId: tournament.id,
            role: AdminRole.OWNER,
          },
          update: {
            role: AdminRole.OWNER,
          },
        });

        // Update guild config
        await tx.guildConfig.upsert({
          where: { discordGuildId },
          create: {
            discordGuildId,
            matchChannelId,
          },
          update: {
            matchChannelId,
          },
        });

        return { tournamentId: tournament.id, isUpdate };
      });

      // Fetch the complete tournament with events outside transaction
      const completeTournament = await prisma.tournament.findUnique({
        where: { id: result.tournamentId },
        include: { events: true },
      });

      // Schedule polling for this tournament
      if (completeTournament) {
        const interval = calculatePollInterval(completeTournament.state);
        if (interval !== null) {
          await schedulePoll(completeTournament.id, interval);
        }
      }

      // Sync registrations from Start.gg for all events
      if (completeTournament?.events) {
        for (const event of completeTournament.events) {
          try {
            const syncResult = await this.registrationSyncService.syncEventRegistrations(event.id, discordClient);
            if (!syncResult.success) {
              console.error(`Registration sync failed for event ${event.id}:`, syncResult.errors);
            } else {
              console.log(
                `Synced registrations for event ${event.id}: ` +
                `${syncResult.newRegistrations} new, ${syncResult.updatedRegistrations} updated`
              );
            }
          } catch (error) {
            // Don't fail tournament setup if sync fails
            console.error(`Error syncing registrations for event ${event.id}:`, error);
          }
        }
      }

      // Create audit log entry for tournament creation/update
      await createAuditLog({
        action: result.isUpdate ? AuditAction.TOURNAMENT_UPDATED : AuditAction.TOURNAMENT_CREATED,
        entityType: 'Tournament',
        entityId: completeTournament?.id ?? result.tournamentId,
        userId: userId,
        after: completeTournament
          ? {
              name: completeTournament.name,
              startggSlug: completeTournament.startggSlug,
              state: completeTournament.state,
              discordGuildId: completeTournament.discordGuildId,
            }
          : undefined,
        reason: `Tournament ${result.isUpdate ? 'updated' : 'created'} via /tournament command`,
        source: AuditSource.DISCORD,
      });

      return {
        success: true,
        tournament: completeTournament,
        isUpdate: result.isUpdate,
      };
    } catch (error) {
      console.error('Error saving tournament config:', error);
      return {
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'Failed to save tournament configuration.\n\nPlease try again in a few moments.',
        },
      };
    }
  }

  /**
   * Map Start.gg tournament state number to our enum
   */
  private mapStartggState(state: number | null): TournamentState {
    // Start.gg states: 1 = CREATED, 2 = ACTIVE, 3 = COMPLETED
    switch (state) {
      case 1:
        return TournamentState.CREATED;
      case 2:
        return TournamentState.IN_PROGRESS;
      case 3:
        return TournamentState.COMPLETED;
      default:
        return TournamentState.CREATED;
    }
  }

  /**
   * Parse event state string to number
   */
  private parseEventState(state: string | undefined): number {
    if (!state) return 1;
    switch (state.toUpperCase()) {
      case 'CREATED':
        return 1;
      case 'ACTIVE':
        return 2;
      case 'COMPLETED':
        return 3;
      default:
        return 1;
    }
  }
}

// Export singleton factory
let serviceInstance: TournamentService | null = null;

export function getTournamentService(): TournamentService {
  if (!serviceInstance) {
    const apiKey = process.env.STARTGG_API_KEY;
    if (!apiKey) {
      throw new Error('STARTGG_API_KEY environment variable is required');
    }
    serviceInstance = new TournamentService(apiKey);
  }
  return serviceInstance;
}
