-- Add partial unique index to prevent duplicate ghost registrations
-- Ghost registrations are Start.gg entrants without linked Discord users (userId is null)
-- PostgreSQL treats NULLs as distinct, so a regular unique constraint doesn't work
-- This partial index only enforces uniqueness when startggEntrantId is NOT NULL

CREATE UNIQUE INDEX "Registration_eventId_startggEntrantId_unique"
  ON "Registration" ("event_id", "startgg_entrant_id")
  WHERE "startgg_entrant_id" IS NOT NULL;
