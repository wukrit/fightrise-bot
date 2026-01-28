/**
 * Unit tests for the polling service.
 * Tests calculatePollInterval and match state logic.
 */

import { describe, it, expect } from 'vitest';
import { TournamentState } from '@fightrise/database';
import { POLL_INTERVALS } from '@fightrise/shared';
import { calculatePollInterval } from '../../services/pollingService.js';

describe('calculatePollInterval', () => {
  it('returns null for completed tournaments', () => {
    expect(calculatePollInterval(TournamentState.COMPLETED)).toBeNull();
  });

  it('returns null for cancelled tournaments', () => {
    expect(calculatePollInterval(TournamentState.CANCELLED)).toBeNull();
  });

  it('returns 15s for in-progress tournaments', () => {
    expect(calculatePollInterval(TournamentState.IN_PROGRESS)).toBe(POLL_INTERVALS.ACTIVE);
    expect(calculatePollInterval(TournamentState.IN_PROGRESS)).toBe(15000);
  });

  it('returns 1min for registration open tournaments', () => {
    expect(calculatePollInterval(TournamentState.REGISTRATION_OPEN)).toBe(POLL_INTERVALS.REGISTRATION);
    expect(calculatePollInterval(TournamentState.REGISTRATION_OPEN)).toBe(60000);
  });

  it('returns 5min for created tournaments', () => {
    expect(calculatePollInterval(TournamentState.CREATED)).toBe(POLL_INTERVALS.INACTIVE);
    expect(calculatePollInterval(TournamentState.CREATED)).toBe(300000);
  });

  it('returns 5min for registration closed tournaments', () => {
    expect(calculatePollInterval(TournamentState.REGISTRATION_CLOSED)).toBe(POLL_INTERVALS.INACTIVE);
    expect(calculatePollInterval(TournamentState.REGISTRATION_CLOSED)).toBe(300000);
  });
});

describe('STARTGG_SET_STATE constants', () => {
  it('exports correct set state values', async () => {
    const { STARTGG_SET_STATE } = await import('@fightrise/shared');

    expect(STARTGG_SET_STATE.NOT_STARTED).toBe(1);
    expect(STARTGG_SET_STATE.STARTED).toBe(2);
    expect(STARTGG_SET_STATE.COMPLETED).toBe(3);
    expect(STARTGG_SET_STATE.READY).toBe(6);
    expect(STARTGG_SET_STATE.IN_PROGRESS).toBe(7);
  });
});
