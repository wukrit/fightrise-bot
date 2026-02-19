-- Add CHECK constraint to ensure User has at least one identity
-- This prevents creating phantom users with no way to be looked up

ALTER TABLE "User" ADD CONSTRAINT "User_has_identity"
  CHECK ("discordId" IS NOT NULL OR "startggId" IS NOT NULL OR "email" IS NOT NULL);
