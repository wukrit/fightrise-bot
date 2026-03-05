/**
 * Global setup for Playwright E2E tests.
 *
 * This runs before all tests and seeds the database with test data.
 */

import { seedTestData } from './utils/seed';

async function globalSetup() {
  console.log('Running E2E global setup...');

  // Debug: log the DATABASE_URL
  console.log('DATABASE_URL:', process.env.DATABASE_URL);

  try {
    await seedTestData();
    console.log('Global setup complete');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;
