import { ChatInputCommandInteraction, AutocompleteInteraction, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder, Collection, Client } from 'discord.js';
export interface Command {
    data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}
export interface Event {
    name: string;
    once?: boolean;
    execute: (...args: unknown[]) => void | Promise<void>;
}
export interface ExtendedClient extends Client {
    commands: Collection<string, Command>;
}
//# sourceMappingURL=types.d.ts.map