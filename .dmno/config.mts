/**
 * DMNO Configuration for FightRise
 *
 * This file defines the config schema for the application.
 * Secrets are loaded from:
 *   1. `.dmno.env.local` - local secrets (gitignored) - for development
 *   2. DMNO resolution - for production with external secrets manager
 *
 * To set up local development:
 * 1. Copy `.dmno.env.local.example` to `.dmno.env.local`
 * 2. Fill in your secrets (these are gitignored)
 *
 * For Bitwarden Secrets Manager integration (requires paid subscription):
 * @see https://bitwarden.com/help/secrets-manager-overview/
 */

import { defineDmnoService, DmnoBaseTypes } from 'dmno';

export default defineDmnoService({
  schema: {
    // ===================
    // Environment
    // ===================
    NODE_ENV: {
      extends: DmnoBaseTypes.enum(['development', 'test', 'production']),
      value: process.env.NODE_ENV || 'development',
    },

    // ===================
    // Public Config (Discord)
    // ===================
    DISCORD_CLIENT_ID: {
      extends: DmnoBaseTypes.string,
      value: process.env.DISCORD_CLIENT_ID,
    },
    DISCORD_GUILD_ID: {
      extends: DmnoBaseTypes.string,
      value: process.env.DISCORD_GUILD_ID,
    },

    // ===================
    // Public Config (NextAuth)
    // ===================
    NEXTAUTH_URL: {
      extends: DmnoBaseTypes.url,
      value: process.env.NEXTAUTH_URL,
    },

    // ===================
    // OAuth Redirects (public)
    // ===================
    DISCORD_APP_INSTALL_URI: {
      extends: DmnoBaseTypes.string,
      value: process.env.DISCORD_APP_INSTALL_URI,
    },
    DISCORD_REDIRECT_URI: {
      extends: DmnoBaseTypes.string,
      value: process.env.DISCORD_REDIRECT_URI,
    },
    STARTGG_REDIRECT_URI: {
      extends: DmnoBaseTypes.string,
      value: process.env.STARTGG_REDIRECT_URI,
    },

    // ===================
    // Sensitive Config (from env - use .dmno.env.local for local dev)
    // ===================
    DISCORD_TOKEN: {
      extends: DmnoBaseTypes.string,
      sensitive: true,
      value: process.env.DISCORD_TOKEN,
    },
    DISCORD_CLIENT_SECRET: {
      extends: DmnoBaseTypes.string,
      sensitive: true,
      value: process.env.DISCORD_CLIENT_SECRET,
    },
    STARTGG_API_KEY: {
      extends: DmnoBaseTypes.string,
      sensitive: true,
      value: process.env.STARTGG_API_KEY,
    },
    NEXTAUTH_SECRET: {
      extends: DmnoBaseTypes.string,
      sensitive: true,
      value: process.env.NEXTAUTH_SECRET,
    },

    // ===================
    // Database & Redis (can stay env-based for local dev)
    // ===================
    DATABASE_URL: {
      extends: DmnoBaseTypes.string,
      value: process.env.DATABASE_URL,
    },
    REDIS_URL: {
      extends: DmnoBaseTypes.string,
      value: process.env.REDIS_URL,
    },

    // ===================
    // Smoke Test Credentials (optional)
    // ===================
    SMOKE_DISCORD_GUILD_ID: {
      extends: DmnoBaseTypes.string,
      value: process.env.SMOKE_DISCORD_GUILD_ID,
    },
    SMOKE_DISCORD_CHANNEL_ID: {
      extends: DmnoBaseTypes.string,
      value: process.env.SMOKE_DISCORD_CHANNEL_ID,
    },
    SMOKE_DISCORD_TOKEN: {
      extends: DmnoBaseTypes.string,
      sensitive: true,
      value: process.env.SMOKE_DISCORD_TOKEN,
    },
    SMOKE_DISCORD_CLIENT_ID: {
      extends: DmnoBaseTypes.string,
      value: process.env.SMOKE_DISCORD_CLIENT_ID,
    },
    SMOKE_DISCORD_CLIENT_SECRET: {
      extends: DmnoBaseTypes.string,
      sensitive: true,
      value: process.env.SMOKE_DISCORD_CLIENT_SECRET,
    },
    SMOKE_STARTGG_API_KEY: {
      extends: DmnoBaseTypes.string,
      sensitive: true,
      value: process.env.SMOKE_STARTGG_API_KEY,
    },
    SMOKE_STARTGG_TOURNAMENT_SLUG: {
      extends: DmnoBaseTypes.string,
      value: process.env.SMOKE_STARTGG_TOURNAMENT_SLUG,
    },
  },
});
