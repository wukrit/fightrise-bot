# Tournament Setup Specification

## Overview

The `/tournament setup` command allows tournament admins to link a Start.gg tournament to their Discord server, enabling match thread creation, check-ins, and score reporting.

## ADDED Requirements

### Requirement: Tournament Setup Command

The bot SHALL provide a `/tournament setup` slash command with the following parameters:
- `slug` (required, string): Start.gg tournament slug
- `match-channel` (required, channel): Discord channel for match threads

The command SHALL require `ManageGuild` permission in Discord.

#### Scenario: Successful tournament setup
Given a user with ManageGuild permission and linked Start.gg account
And the user is an admin of the tournament on Start.gg
When the user runs `/tournament setup slug:my-weekly-42 match-channel:#matches`
Then the bot defers the reply
And fetches the tournament from Start.gg
And creates Tournament, Event, TournamentAdmin, and GuildConfig records
And replies with a success embed showing tournament details

#### Scenario: User not linked to Start.gg
Given a user without a linked Start.gg account
When the user runs `/tournament setup slug:my-weekly match-channel:#matches`
Then the bot replies with an ephemeral message directing them to use `/link-startgg`

#### Scenario: Tournament not found
Given a user with a linked Start.gg account
When the user runs `/tournament setup slug:nonexistent-tournament match-channel:#matches`
Then the bot replies with an ephemeral error message explaining the tournament was not found

#### Scenario: User not tournament admin
Given a user with a linked Start.gg account
But the user is not an admin of the tournament on Start.gg
When the user runs `/tournament setup slug:someone-elses-tournament match-channel:#matches`
Then the bot replies with an ephemeral permission denied message

### Requirement: Slug Normalization

The command SHALL accept tournament slugs in multiple formats and normalize them:
- `my-weekly-42` (preferred)
- `tournament/my-weekly-42`
- `https://start.gg/tournament/my-weekly-42`
- `https://www.start.gg/tournament/my-weekly-42/event/sf6`

#### Scenario: Full URL provided as slug
Given a user provides `https://start.gg/tournament/my-weekly-42/event/sf6` as the slug
When the command processes the slug
Then it extracts `my-weekly-42` as the normalized slug
And uses this normalized slug for the Start.gg API call

### Requirement: Tournament Data Persistence

On successful setup, the bot SHALL create or update the following database records:

**Tournament:**
- startggId, startggSlug, name, startAt, endAt, state
- discordGuildId, discordChannelId
- pollIntervalMs (default 30000)

**Event:** (for each event in tournament)
- startggId, name, numEntrants, state, tournamentId

**TournamentAdmin:**
- userId, tournamentId, role (OWNER)

**GuildConfig:**
- discordGuildId, matchChannelId

#### Scenario: Creating new tournament record
Given no tournament with the slug exists in the database
When tournament setup completes successfully
Then a new Tournament record is created with Start.gg data
And Event records are created for each tournament event
And a TournamentAdmin record links the user as OWNER
And GuildConfig is updated with the match channel

#### Scenario: Updating existing tournament
Given a tournament with the slug already exists in the database for this guild
When tournament setup completes successfully
Then the existing Tournament record is updated
And Event records are synced (created/updated as needed)
And GuildConfig is updated if the channel changed

### Requirement: Success Response

On successful setup, the bot SHALL reply with an embed containing:
- Tournament name
- Start date (formatted)
- List of events
- Match channel mention
- Status indicator

#### Scenario: Success embed display
Given tournament setup completes successfully
When the bot sends the confirmation
Then the embed has a green color indicating success
And displays the tournament name as the title
And shows the start date in a readable format
And lists all events by name
And mentions the match channel
