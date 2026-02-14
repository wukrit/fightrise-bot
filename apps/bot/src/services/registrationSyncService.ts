import { prisma, RegistrationStatus, RegistrationSource } from '@fightrise/database';
import { StartGGClient, Entrant } from '@fightrise/startgg-client';
import { Client, EmbedBuilder, Colors } from 'discord.js';

const MAX_PAGES = 20;
const PAGE_SIZE = 50;

/**
 * Result of a registration sync operation
 */
export interface SyncResult {
  success: boolean;
  totalEntrants: number;
  newRegistrations: number;
  updatedRegistrations: number;
  errors: string[];
}

/**
 * Service for syncing registrations from Start.gg to local database
 */
export class RegistrationSyncService {
  private startggClient: StartGGClient;

  constructor(startggApiKey: string) {
    this.startggClient = new StartGGClient({
      apiKey: startggApiKey,
      cache: { enabled: false },
      retry: { maxRetries: 3 },
    });
  }

  /**
   * Main entry point: sync registrations for an event
   * @param eventId - The event ID to sync registrations for
   * @param discordClient - Optional Discord client for sending notifications
   */
  async syncEventRegistrations(eventId: string, discordClient?: Client): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      totalEntrants: 0,
      newRegistrations: 0,
      updatedRegistrations: 0,
      errors: [],
    };

    try {
      // Fetch all entrants from Start.gg
      const entrants = await this.fetchEntrantsFromStartgg(eventId);
      result.totalEntrants = entrants.length;

      if (entrants.length === 0) {
        return result;
      }

      // Fetch event once to get tournamentId (needed for new registrations)
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { tournamentId: true },
      });
      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }

      // Prefetch existing registrations for this event
      const existingRegistrations = await prisma.registration.findMany({
        where: { eventId },
        select: {
          id: true,
          startggEntrantId: true,
          userId: true,
          status: true,
        },
      });
      const regMap = new Map(
        existingRegistrations
          .filter((r) => r.startggEntrantId)
          .map((r) => [r.startggEntrantId!, r])
      );

      // Extract participant user IDs and gamer tags for matching
      const participantUserIds = entrants
        .map((e) => e.participants?.[0]?.user?.id)
        .filter((id): id is string => typeof id === 'string');
      const gamerTags = entrants
        .map((e) => e.name?.toLowerCase())
        .filter((tag): tag is string => typeof tag === 'string');

      // Prefetch relevant users (only those that could match)
      const relevantUsers = await prisma.user.findMany({
        where: {
          OR: [
            { startggId: { in: participantUserIds } },
            { startggGamerTag: { in: gamerTags, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          startggId: true,
          startggGamerTag: true,
        },
      });

      const usersByStartggId = new Map(
        relevantUsers
          .filter((u) => u.startggId)
          .map((u) => [u.startggId!, u])
      );
      const usersByGamerTag = new Map(
        relevantUsers
          .filter((u) => u.startggGamerTag)
          .map((u) => [u.startggGamerTag!.toLowerCase(), u])
      );

      // Pre-compute all operations using prefetched data (avoids O(n) transactions)
      const operations = this.computeBatchOperations(
        entrants,
        eventId,
        event.tournamentId,
        regMap,
        usersByStartggId,
        usersByGamerTag
      );

      // Execute all database operations in a single transaction
      if (operations.updates.length > 0 || operations.creates.length > 0) {
        await prisma.$transaction(async (tx) => {
          // Perform all updates
          for (const update of operations.updates) {
            await tx.registration.updateMany({
              where: update.where,
              data: update.data,
            });
          }

          // Perform all creates
          for (const create of operations.creates) {
            await tx.registration.create({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data: create as any,
            });
          }
        });

        result.newRegistrations = operations.creates.length;
        result.updatedRegistrations = operations.updates.length;
      }

      // Validate entrants and collect errors (no DB operations)
      for (const entrant of entrants) {
        if (!this.validateEntrant(entrant)) {
          result.errors.push(`Invalid entrant data: ${entrant.id}`);
        }
      }
    } catch (error) {
      result.success = false;
      const message = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Fatal error during sync: ${message}`);
    }

    // Send Discord notification for new registrations
    if (result.newRegistrations > 0) {
      try {
        await this.notifyNewRegistrations(eventId, result.newRegistrations, discordClient);
      } catch (error) {
        console.error('[RegistrationSync] Failed to send notification:', error);
      }
    }

    return result;
  }

  /**
   * Send Discord notification about new registrations
   */
  async notifyNewRegistrations(
    eventId: string,
    newRegistrations: number,
    discordClient?: Client
  ): Promise<void> {
    if (!discordClient || newRegistrations === 0) {
      return;
    }

    // Get the event's tournament's Discord channel
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        name: true,
        tournament: {
          select: {
            discordChannelId: true,
          },
        },
      },
    });

    const channelId = event?.tournament?.discordChannelId;

    if (!channelId) {
      console.log('[RegistrationSync] No Discord channel configured for notifications');
      return;
    }

    const channel = await discordClient.channels.fetch(channelId);

    if (!channel || !('send' in channel)) {
      console.log(`[RegistrationSync] Could not find channel ${channelId}`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('New Registrations Synced')
      .setColor(Colors.Green)
      .setDescription(`**${newRegistrations}** new registration(s) synced from Start.gg for **${event?.name}**`)
      .addFields({
        name: 'Source',
        value: 'Start.gg',
        inline: true,
      });

    await channel.send({ embeds: [embed] });
  }

  /**
   * Fetch all entrants from Start.gg with pagination
   */
  private async fetchEntrantsFromStartgg(
    eventId: string
  ): Promise<Entrant[]> {
    const allEntrants: Entrant[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      try {
        const connection = await this.startggClient.getEventEntrants(eventId, page, PAGE_SIZE);

        if (!connection?.nodes) {
          break;
        }

        allEntrants.push(...connection.nodes);

        // Check if there are more pages
        const totalPages = connection.pageInfo?.totalPages ?? 0;
        if (page >= totalPages) {
          break;
        }
      } catch (error) {
        // Log error but continue - could be rate limiting
        console.error(`Error fetching entrants page ${page}:`, error);
        break;
      }
    }

    return allEntrants;
  }

  /**
   * Validate entrant data before processing
   */
  private validateEntrant(entrant: Entrant): boolean {
    if (!entrant.id) return false;
    if (!entrant.name && !entrant.participants?.[0]?.user?.gamerTag) return false;
    return true;
  }

  /**
   * Compute all batch operations using prefetched data (avoids O(n) transactions)
   * This replaces the per-entrant processEntrant method with a single batch operation
   */
  private computeBatchOperations(
    entrants: Entrant[],
    eventId: string,
    tournamentId: string,
    regMap: Map<string, { id: string; userId: string | null; status: RegistrationStatus }>,
    usersByStartggId: Map<string, { id: string; startggGamerTag: string | null }>,
    usersByGamerTag: Map<string, { id: string; startggGamerTag: string | null }>
  ): {
    updates: Array<{
      where: { id: string; status?: { not: RegistrationStatus } };
      data: { status: RegistrationStatus; userId?: string; startggEntrantId?: string };
    }>;
    creates: Array<{
      eventId: string;
      startggEntrantId: string;
      userId: string | null;
      source: RegistrationSource;
      status: RegistrationStatus;
      tournamentId: string;
    }>;
  } {
    const updates: Array<{
      where: { id: string; status?: { not: RegistrationStatus } };
      data: { status: RegistrationStatus; userId?: string; startggEntrantId?: string };
    }> = [];
    const creates: Array<{
      eventId: string;
      startggEntrantId: string;
      userId: string | null;
      source: RegistrationSource;
      status: RegistrationStatus;
      tournamentId: string;
    }> = [];

    // Track userId -> registration for linking existing Discord registrations
    const userIdToRegId = new Map<string, string>();
    for (const [, reg] of regMap) {
      if (reg.userId) {
        userIdToRegId.set(reg.userId, reg.id);
      }
    }

    for (const entrant of entrants) {
      if (!this.validateEntrant(entrant)) {
        continue;
      }

      // Try to match by startggUserId
      const participantUserId = entrant.participants?.[0]?.user?.id;
      let matchedUserId: string | null = null;

      if (participantUserId) {
        const matchedUser = usersByStartggId.get(participantUserId);
        if (matchedUser) {
          matchedUserId = matchedUser.id;
        }
      }

      // Try to match by gamer tag (case-insensitive)
      if (!matchedUserId && entrant.name) {
        const matchedUser = usersByGamerTag.get(entrant.name.toLowerCase());
        if (matchedUser) {
          matchedUserId = matchedUser.id;
        }
      }

      // Check if registration exists by startggEntrantId (using prefetched data)
      const existingByEntrantId = entrant.id ? regMap.get(entrant.id) : null;

      if (existingByEntrantId) {
        // Update existing registration
        const updateData: { status: RegistrationStatus; userId?: string; startggEntrantId?: string } = {
          status: RegistrationStatus.CONFIRMED,
        };

        // Link user if matched and currently unlinked
        if (matchedUserId && !existingByEntrantId.userId) {
          updateData.userId = matchedUserId;
        }

        updates.push({
          where: {
            id: existingByEntrantId.id,
            status: { not: RegistrationStatus.DQ }, // Don't overwrite DQ status
          },
          data: updateData,
        });
      } else if (matchedUserId) {
        // Check if there's an existing Discord registration to link
        const existingRegId = userIdToRegId.get(matchedUserId);

        if (existingRegId) {
          // Link the Start.gg entrant to existing registration
          updates.push({
            where: {
              id: existingRegId,
            },
            data: {
              startggEntrantId: entrant.id,
              status: RegistrationStatus.CONFIRMED,
            },
          });
        } else {
          // Create new registration
          creates.push({
            eventId,
            startggEntrantId: entrant.id,
            userId: matchedUserId,
            source: RegistrationSource.STARTGG,
            status: RegistrationStatus.CONFIRMED,
            tournamentId,
          });
        }
      } else {
        // Create new registration (ghost - no user matched)
        creates.push({
          eventId,
          startggEntrantId: entrant.id,
          userId: null,
          source: RegistrationSource.STARTGG,
          status: RegistrationStatus.CONFIRMED,
          tournamentId,
        });
      }
    }

    return { updates, creates };
  }
}

// Export singleton factory
let serviceInstance: RegistrationSyncService | null = null;

export function getRegistrationSyncService(): RegistrationSyncService {
  if (!serviceInstance) {
    const apiKey = process.env.STARTGG_API_KEY;
    if (!apiKey) {
      throw new Error('STARTGG_API_KEY environment variable is required');
    }
    serviceInstance = new RegistrationSyncService(apiKey);
  }
  return serviceInstance;
}
