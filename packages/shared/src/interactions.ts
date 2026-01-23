// Interaction ID helpers for Discord custom IDs

export function parseInteractionId(customId: string) {
  const [prefix, ...parts] = customId.split(':');
  return { prefix, parts };
}

export function createInteractionId(prefix: string, ...parts: string[]) {
  return [prefix, ...parts].join(':');
}
