## ADDED Requirements

### Requirement: Validation Schemas

The shared package SHALL provide Zod validation schemas for runtime type validation of configuration and interaction data.

#### Scenario: Validate tournament configuration
- **WHEN** a TournamentConfig object is validated
- **THEN** the schema SHALL verify all required fields are present and correctly typed
- **AND** the schema SHALL enforce that checkInWindowMinutes is a positive number

#### Scenario: Validate interaction ID format
- **WHEN** an interaction ID string is validated
- **THEN** the schema SHALL verify the format matches `prefix:part1:part2:...`
- **AND** the schema SHALL reject empty strings or invalid prefixes

### Requirement: Standardized Error Types

The shared package SHALL provide a standardized error hierarchy for consistent error handling across all applications and packages.

#### Scenario: Create base error with code
- **WHEN** a FightRiseError is thrown
- **THEN** the error SHALL include a `code` property for programmatic handling
- **AND** the error SHALL include a human-readable `message`

#### Scenario: Specialized error types
- **WHEN** a validation fails
- **THEN** a ValidationError with code `VALIDATION_ERROR` SHALL be thrown
- **WHEN** a resource is not found
- **THEN** a NotFoundError with code `NOT_FOUND` SHALL be thrown
- **WHEN** a user lacks permissions
- **THEN** a PermissionError with code `PERMISSION_DENIED` SHALL be thrown

### Requirement: Date/Time Utilities

The shared package SHALL provide date/time utility functions for tournament scheduling and display.

#### Scenario: Format tournament date
- **WHEN** a Unix timestamp is formatted for display
- **THEN** the function SHALL return a human-readable date string
- **AND** the function SHALL support timezone-aware formatting

#### Scenario: Check time window
- **WHEN** checking if the current time is within a check-in window
- **THEN** the function SHALL return true if within the window
- **AND** the function SHALL return false if outside the window

#### Scenario: Format duration
- **WHEN** formatting a duration in milliseconds
- **THEN** the function SHALL return a human-readable string (e.g., "5 minutes", "1 hour 30 minutes")
