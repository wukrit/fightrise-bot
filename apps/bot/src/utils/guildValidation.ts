import { BaseInteraction, ChatInputCommandInteraction, AutocompleteInteraction } from 'discord.js';

/**
 * Validates that the interaction is from a Discord guild (server).
 * Returns the guildId if valid, or null if not in a guild.
 */
export function requireGuild(interaction: ChatInputCommandInteraction | AutocompleteInteraction): string | null {
  return interaction.guildId;
}

/**
 * Checks if the interaction is from a Discord guild and sends an error reply if not.
 * Use this when you need to ensure the command is used in a server context.
 *
 * @returns The guildId if valid, null if not in a guild (and error reply sent)
 */
export async function requireGuildWithReply(
  interaction: ChatInputCommandInteraction
): Promise<string | null> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
    return null;
  }

  return guildId;
}
