import { describe, it, expect } from 'vitest';
import { parseInteractionId, createInteractionId } from './interactions.js';
import { INTERACTION_PREFIX } from './constants.js';

describe('parseInteractionId', () => {
  it('parses simple interaction ID', () => {
    const result = parseInteractionId('checkin');
    expect(result).toEqual({ prefix: 'checkin', parts: [] });
  });

  it('parses interaction ID with one part', () => {
    const result = parseInteractionId('checkin:123');
    expect(result).toEqual({ prefix: 'checkin', parts: ['123'] });
  });

  it('parses interaction ID with multiple parts', () => {
    const result = parseInteractionId('report:match1:player2');
    expect(result).toEqual({ prefix: 'report', parts: ['match1', 'player2'] });
  });

  it('handles colon-only separator', () => {
    const result = parseInteractionId('confirm:');
    expect(result).toEqual({ prefix: 'confirm', parts: [''] });
  });

  it('handles empty string', () => {
    const result = parseInteractionId('');
    expect(result).toEqual({ prefix: '', parts: [] });
  });

  it('handles prefix-only with no colon', () => {
    const result = parseInteractionId('checkin');
    expect(result).toEqual({ prefix: 'checkin', parts: [] });
  });
});

describe('createInteractionId', () => {
  it('creates simple interaction ID', () => {
    const result = createInteractionId('checkin');
    expect(result).toBe('checkin');
  });

  it('creates interaction ID with one part', () => {
    const result = createInteractionId('checkin', '123');
    expect(result).toBe('checkin:123');
  });

  it('creates interaction ID with multiple parts', () => {
    const result = createInteractionId('report', 'match1', 'player2');
    expect(result).toBe('report:match1:player2');
  });

  it('creates interaction ID with empty parts', () => {
    const result = createInteractionId('confirm', '');
    expect(result).toBe('confirm:');
  });

  it('roundtrips with parseInteractionId', () => {
    const original = 'checkin:123:456';
    const [prefix, ...parts] = original.split(':');
    const created = createInteractionId(prefix, ...parts);
    const parsed = parseInteractionId(created);
    expect(parsed.prefix).toBe('checkin');
    expect(parsed.parts).toEqual(['123', '456']);
  });
});

describe('integration with INTERACTION_PREFIX', () => {
  it('can use INTERACTION_PREFIX constants to create IDs', () => {
    const checkinId = createInteractionId(INTERACTION_PREFIX.CHECK_IN, '123');
    expect(checkinId).toBe('checkin:123');

    const reportId = createInteractionId(INTERACTION_PREFIX.REPORT, 'match1');
    expect(reportId).toBe('report:match1');
  });

  it('can parse IDs created with INTERACTION_PREFIX', () => {
    const checkinId = createInteractionId(INTERACTION_PREFIX.CHECK_IN, '123');
    const parsed = parseInteractionId(checkinId);
    expect(parsed.prefix).toBe(INTERACTION_PREFIX.CHECK_IN);
    expect(parsed.parts).toEqual(['123']);
  });
});
