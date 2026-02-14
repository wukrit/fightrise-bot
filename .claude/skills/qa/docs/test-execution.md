# Test Execution

The test runner executes the full Docker-based test suite.

## Commands Executed

1. `npm run docker:infra` - Start Postgres and Redis
2. `npm run docker:db:push` - Push database schema
3. `npm run docker:test` - Unit tests
4. `npm run docker:test:integration` - Integration tests
5. `npm run docker:test:e2e` - E2E tests
6. `npm run docker:lint` - Linting

## Security

All subprocess calls sanitize environment variables to prevent credential exposure.

## Error Handling

- Exits with non-zero code on any test failure
- Reports which layer failed
