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

      // Process each entrant
      for (const entrant of entrants) {
        if (!this.validateEntrant(entrant)) {
          result.errors.push(`Invalid entrant data: ${entrant.id}`);
          continue;
        }

        try {
          const syncResult = await this.processEntrant(
            entrant,
            eventId,
            regMap,
            usersByStartggId,
            usersByGamerTag
          );

          if (syncResult.isNew) {
            result.newRegistrations++;
          } else if (syncResult.wasUpdated) {
            result.updatedRegistrations++;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Failed to sync entrant ${entrant.id}: ${message}`);
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
        const connection = await this.fetchWithRetry(() =>
          this.startggClient.getEventEntrants(eventId, page, PAGE_SIZE)
        );

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
   * Fetch with exponential backoff for rate limiting
   */
  private async fetchWithRetry<T>(
    query: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await query();
      } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        if (err.status === 429 && attempt < maxRetries - 1) {
          const delay = Math.min(
            1000 * Math.pow(2, attempt) + Math.random() * 1000,
            30000
          );
          console.log(`Rate limited, waiting ${delay}ms before retry...`);
          await this.sleep(delay);
          continue;
        }
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
   * Process a single entrant: match to user and create/update registration
   */
  private async processEntrant(
    entrant: Entrant,
    eventId: string,
    regMap: Map<string, { id: string; userId: string | null; status: RegistrationStatus }>,
    usersByStartggId: Map<string, { id: string; startggGamerTag: string | null }>,
    usersByGamerTag: Map<string, { id: string; startggGamerTag: string | null }>
  ): Promise<{ isNew: boolean; wasUpdated: boolean }> {
    // Priority matching:
    // 1. Check if registration exists by startggEntrantId
    // Note: The actual check happens inside the transaction for consistency
    regMap.get(entrant.id); // Pre-fetch into cache

    // 2. Try to match by startggUserId
    const participantUserId = entrant.participants?.[0]?.user?.id;
    let matchedUserId: string | null = null;

    if (participantUserId) {
      const matchedUser = usersByStartggId.get(participantUserId);
      if (matchedUser) {
        matchedUserId = matchedUser.id;
      }
    }

    // 3. Try to match by gamer tag (case-insensitive)
    if (!matchedUserId && entrant.name) {
      const matchedUser = usersByGamerTag.get(entrant.name.toLowerCase());
      if (matchedUser) {
        matchedUserId = matchedUser.id;
      }
    }

    // Use transaction for atomic upsert
    return await prisma.$transaction(async (tx) => {
      // Check for existing registration by startggEntrantId (no unique constraint, use findFirst)
      const existingInTx = await tx.registration.findFirst({
        where: {
          eventId,
          startggEntrantId: entrant.id,
        },
      });

      if (existingInTx) {
        // Update existing registration
        const updateData: { status: RegistrationStatus; userId?: string } = {
          status: RegistrationStatus.CONFIRMED,
        };

        // Link user if matched and currently unlinked
        if (matchedUserId && !existingInTx.userId) {
          updateData.userId = matchedUserId;
        }

        await tx.registration.updateMany({
          where: {
            id: existingInTx.id,
            status: { not: RegistrationStatus.DQ }, // Don't overwrite DQ status
          },
          data: updateData,
        });

        return { isNew: false, wasUpdated: true };
      }

      // Check if there's an existing Discord registration to link
      if (matchedUserId) {
        const existingByUser = await tx.registration.findUnique({
          where: {
            userId_eventId: {
              userId: matchedUserId,
              eventId,
            },
          },
        });

        if (existingByUser) {
          // Link the Start.gg entrant to existing registration
          await tx.registration.update({
            where: { id: existingByUser.id },
            data: {
              startggEntrantId: entrant.id,
              status: RegistrationStatus.CONFIRMED,
            },
          });
          return { isNew: false, wasUpdated: true };
        }
      }

      // Create new registration - first get tournamentId from event
      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event) {
        throw new Error(`Event not found: ${eventId}`);
      }

      // Build data object - userId can be null for ghost registrations
      // Note: Prisma types don't reflect nullable userId correctly, using type assertion
      await tx.registration.create({
        data: {
          eventId,
          startggEntrantId: entrant.id,
          userId: matchedUserId as string | null | undefined,
          source: RegistrationSource.STARTGG,
          status: RegistrationStatus.CONFIRMED,
          tournamentId: event.tournamentId,
        } as never,
      });

      return { isNew: true, wasUpdated: false };
    });
  }
}
