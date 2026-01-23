/**
 * Discord Bot Test Harness
 *
 * This module exports all the mock classes and utilities needed
 * to test Discord bot commands without a real Discord connection.
 *
 * Example usage:
 *
 * ```ts
 * import { createDiscordTestClient } from '../harness';
 * import myCommand from '../../commands/my-command';
 *
 * describe('My Command', () => {
 *   const testClient = createDiscordTestClient();
 *
 *   beforeEach(() => {
 *     testClient.reset();
 *     testClient.registerCommand(myCommand);
 *   });
 *
 *   it('should respond to the command', async () => {
 *     const interaction = await testClient.executeCommand('mycommand', {
 *       someOption: 'value',
 *     });
 *
 *     expect(interaction.replied).toBe(true);
 *     expect(interaction.lastReply?.content).toContain('expected text');
 *   });
 *
 *   it('should handle button clicks', async () => {
 *     const buttonInteraction = await testClient.clickButton('my-button-id');
 *     expect(buttonInteraction.replied).toBe(true);
 *   });
 * });
 * ```
 */

// Client
export {
  DiscordTestClient,
  createDiscordTestClient,
  waitForEvent,
  type DiscordTestClientOptions,
} from './DiscordTestClient.js';

// Interactions
export {
  MockChatInputInteraction,
  MockButtonInteraction,
  createMockChatInputInteraction,
  createMockButtonInteraction,
  createMockUser,
  createMockGuildMember,
  createMockGuild,
  createMockOptionsResolver,
  type MockChatInputInteractionOptions,
  type MockButtonInteractionOptions,
  type MockUserOptions,
  type MockGuildMemberOptions,
  type MockGuildOptions,
  type MockCommandOptions,
  type InteractionReply,
} from './MockInteraction.js';

// Channels
export {
  MockTextChannel,
  MockThreadChannel,
  createMockTextChannel,
  createMockThread,
  type MockMessage,
  type MockThreadOptions,
  type MockTextChannelOptions,
} from './MockChannel.js';
