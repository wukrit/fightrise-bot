/**
 * Integration tests for tournament setup flow.
 * Tests the full flow of setting up a tournament through Discord commands.
 *
 * These tests use the Discord test harness to simulate interactions
 * and can optionally use a real database via Testcontainers.
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { createDiscordTestClient, DiscordTestClient } from '../harness/index.js';

// Import commands to test
import tournamentCommand from '../../commands/tournament.js';
import checkinCommand from '../../commands/checkin.js';

describe('Tournament Setup Integration', () => {
  let testClient: DiscordTestClient;

  beforeAll(() => {
    // Setup any shared resources (e.g., database connection)
  });

  afterAll(() => {
    // Cleanup shared resources
  });

  beforeEach(() => {
    // Create fresh test client for each test
    testClient = createDiscordTestClient({
      userId: 'test-user-123',
      username: 'TestTournamentOrganizer',
      guildId: 'test-guild-123',
      channelId: 'test-channel-123',
    });

    // Register commands
    testClient.registerCommands([tournamentCommand, checkinCommand]);
  });

  describe('Tournament Command', () => {
    it('should respond to /tournament command', async () => {
      const interaction = await testClient.executeCommand('tournament');

      expect(interaction.replied).toBe(true);
      expect(interaction.lastReply).toBeDefined();
    });

    it('should allow viewing tournament with slug option', async () => {
      const interaction = await testClient.executeCommand('tournament', {
        _subcommand: 'view',
        slug: 'test-tournament-slug',
      });

      expect(interaction.replied).toBe(true);
    });
  });

  describe('Check-in Command', () => {
    it('should respond to /checkin command', async () => {
      const interaction = await testClient.executeCommand('checkin');

      expect(interaction.replied).toBe(true);
      expect(interaction.lastReply).toBeDefined();
    });

    it('should send ephemeral reply', async () => {
      const interaction = await testClient.executeCommand('checkin');

      expect(interaction.ephemeral).toBe(true);
    });
  });

  describe('Command Error Handling', () => {
    it('should throw error for unregistered commands', async () => {
      await expect(
        testClient.executeCommand('nonexistent-command')
      ).rejects.toThrow('Command "nonexistent-command" not found');
    });
  });

  describe('Event Tracking', () => {
    it('should track all interactions', async () => {
      await testClient.executeCommand('tournament');
      await testClient.executeCommand('checkin');

      expect(testClient.interactions).toHaveLength(2);
    });

    it('should track all replies', async () => {
      await testClient.executeCommand('tournament');
      await testClient.executeCommand('checkin');

      expect(testClient.allReplies.length).toBeGreaterThanOrEqual(2);
    });

    it('should reset state between tests', async () => {
      await testClient.executeCommand('tournament');
      testClient.reset();

      expect(testClient.interactions).toHaveLength(0);
      expect(testClient.messages).toHaveLength(0);
    });
  });

  describe('Channel Operations', () => {
    it('should track created threads', async () => {
      const channel = testClient.getChannel('test-channel-123');
      expect(channel).toBeDefined();

      const thread = await channel!.createThread({
        name: 'Match: Player1 vs Player2',
      });

      expect(testClient.threads.has(thread.id)).toBe(true);
    });

    it('should track messages in threads', async () => {
      const thread = testClient.createThread('Test Match Thread');

      await thread.send('Welcome to your match!');
      await thread.send({
        content: 'Please check in using the button below.',
        components: [{ type: 1, components: [{ type: 2, label: 'Check In', customId: 'checkin' }] }],
      });

      expect(thread.messages).toHaveLength(2);
      expect(testClient.messages).toHaveLength(2);
    });
  });

  describe('Button Interactions', () => {
    it('should create button interactions', async () => {
      const buttonInteraction = await testClient.clickButton('checkin-button-123');

      expect(buttonInteraction.customId).toBe('checkin-button-123');
      expect(buttonInteraction.isButton()).toBe(true);
      expect(buttonInteraction.isChatInputCommand()).toBe(false);
    });

    it('should track button interactions', async () => {
      await testClient.clickButton('btn-1');
      await testClient.clickButton('btn-2');

      expect(testClient.interactions.filter((i) => i.isButton())).toHaveLength(2);
    });
  });
});

/**
 * Example of a more complex integration test with database.
 * Uncomment when database testing infrastructure is set up.
 */
/*
describe('Tournament Setup with Database', () => {
  let testClient: DiscordTestClient;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Set up test database with Testcontainers
    const { prisma: client } = await setupTestDatabase();
    prisma = client;
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase(prisma);

    testClient = createDiscordTestClient();
    testClient.registerCommand(tournamentCommand);
  });

  it('should create tournament in database', async () => {
    // First, seed the database with a test user
    const user = await createUser(prisma, {
      discordId: testClient.userId,
      discordUsername: testClient.username,
    });

    // Execute the tournament setup command
    await testClient.executeCommand('tournament', {
      _subcommand: 'setup',
      slug: 'tournament/my-test-event',
    });

    // Verify tournament was created in database
    const tournament = await prisma.tournament.findFirst({
      where: { startggSlug: 'tournament/my-test-event' },
    });

    expect(tournament).toBeDefined();
    expect(tournament?.discordGuildId).toBe(testClient.guildId);
  });
});
*/
