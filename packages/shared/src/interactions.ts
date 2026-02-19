// Interaction ID helpers for Discord custom IDs

import { INTERACTION_PREFIX } from './constants.js';

export type InteractionPrefix = (typeof INTERACTION_PREFIX)[keyof typeof INTERACTION_PREFIX];

export interface ParsedInteractionId {
  prefix: InteractionPrefix;
  parts: string[];
}

export function parseInteractionId(customId: string): ParsedInteractionId {
  const [prefix, ...parts] = customId.split(':');
  return { prefix: prefix as InteractionPrefix, parts };
}

export function createInteractionId(prefix: InteractionPrefix | string, ...parts: string[]) {
  return [prefix, ...parts].join(':');
}
