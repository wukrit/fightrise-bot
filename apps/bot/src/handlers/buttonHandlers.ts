import type { ButtonInteraction } from 'discord.js';

/**
 * Interface for button handlers.
 * Each handler is associated with an interaction prefix and handles button clicks.
 */
export interface ButtonHandler {
  /** The prefix used in the button's custom ID (e.g., 'checkin') */
  prefix: string;
  /** Execute the handler for a button interaction */
  execute(interaction: ButtonInteraction, parts: string[]): Promise<void>;
}

/**
 * Registry of button handlers, keyed by their prefix.
 * Handlers are registered in index.ts.
 */
export const buttonHandlers = new Map<string, ButtonHandler>();

/**
 * Register a button handler in the registry.
 */
export function registerButtonHandler(handler: ButtonHandler): void {
  buttonHandlers.set(handler.prefix, handler);
}
