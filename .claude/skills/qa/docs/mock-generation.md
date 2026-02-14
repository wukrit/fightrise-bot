# Mock Generation

The mock generator fetches real Start.gg API responses and creates MSW handlers.

## Process

1. **Load credentials** from `.env` via `env-loader.ts`
2. **Fetch GraphQL** responses using Start.gg API
3. **Sanitize** sensitive data (IDs, names, timestamps)
4. **Generate** TypeScript MSW handlers
5. **Write to staging** directory
6. **Show diff** to user
7. **Confirm** before writing to target

## Sanitization Rules

- User IDs → `"mock-user-1"`, `"mock-user-2"`
- Tournament IDs → `"mock-tournament-1"`
- Event IDs → `"mock-event-1"`
- Timestamps → static dates
- Real names → `"Mock Player 1"`

## Output

Generated handlers are written to:
`packages/startgg-client/src/__mocks__/handlers.ts`
