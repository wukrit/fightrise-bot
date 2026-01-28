import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResponseCache } from './cache.js';

describe('ResponseCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('get/set', () => {
    it('should store and retrieve values', () => {
      const cache = new ResponseCache({ enabled: true });
      const value = { data: 'test' };

      cache.set('method', { id: '123' }, value);
      const result = cache.get('method', { id: '123' });

      expect(result).toEqual(value);
    });

    it('should return undefined for cache miss', () => {
      const cache = new ResponseCache({ enabled: true });

      const result = cache.get('method', { id: '123' });

      expect(result).toBeUndefined();
    });

    it('should return undefined when cache is disabled', () => {
      const cache = new ResponseCache({ enabled: false });
      const value = { data: 'test' };

      cache.set('method', { id: '123' }, value);
      const result = cache.get('method', { id: '123' });

      expect(result).toBeUndefined();
    });

    it('should differentiate by method name', () => {
      const cache = new ResponseCache({ enabled: true });

      cache.set('method1', { id: '123' }, { data: 'one' });
      cache.set('method2', { id: '123' }, { data: 'two' });

      expect(cache.get('method1', { id: '123' })).toEqual({ data: 'one' });
      expect(cache.get('method2', { id: '123' })).toEqual({ data: 'two' });
    });

    it('should differentiate by params', () => {
      const cache = new ResponseCache({ enabled: true });

      cache.set('method', { id: '123' }, { data: 'one' });
      cache.set('method', { id: '456' }, { data: 'two' });

      expect(cache.get('method', { id: '123' })).toEqual({ data: 'one' });
      expect(cache.get('method', { id: '456' })).toEqual({ data: 'two' });
    });
  });

  describe('TTL expiration', () => {
    it('should return undefined for expired entries', () => {
      const cache = new ResponseCache({ enabled: true, ttlMs: 1000 });

      cache.set('method', { id: '123' }, { data: 'test' });

      // Before expiration
      expect(cache.get('method', { id: '123' })).toEqual({ data: 'test' });

      // After expiration
      vi.advanceTimersByTime(1001);
      expect(cache.get('method', { id: '123' })).toBeUndefined();
    });

    it('should use default TTL when not specified', () => {
      const cache = new ResponseCache({ enabled: true });

      cache.set('method', { id: '123' }, { data: 'test' });

      // Should still be valid before default TTL (60s)
      vi.advanceTimersByTime(59000);
      expect(cache.get('method', { id: '123' })).toEqual({ data: 'test' });

      // Should be expired after default TTL
      vi.advanceTimersByTime(2000);
      expect(cache.get('method', { id: '123' })).toBeUndefined();
    });
  });

  describe('invalidate', () => {
    it('should invalidate all entries for a method', () => {
      const cache = new ResponseCache({ enabled: true });

      cache.set('method1', { id: '1' }, { data: 'one' });
      cache.set('method1', { id: '2' }, { data: 'two' });
      cache.set('method2', { id: '1' }, { data: 'three' });

      cache.invalidate('method1');

      expect(cache.get('method1', { id: '1' })).toBeUndefined();
      expect(cache.get('method1', { id: '2' })).toBeUndefined();
      expect(cache.get('method2', { id: '1' })).toEqual({ data: 'three' });
    });

    it('should invalidate all entries when no method specified', () => {
      const cache = new ResponseCache({ enabled: true });

      cache.set('method1', { id: '1' }, { data: 'one' });
      cache.set('method2', { id: '1' }, { data: 'two' });

      cache.invalidate();

      expect(cache.get('method1', { id: '1' })).toBeUndefined();
      expect(cache.get('method2', { id: '1' })).toBeUndefined();
    });
  });

  describe('invalidateByParams', () => {
    it('should invalidate specific entry', () => {
      const cache = new ResponseCache({ enabled: true });

      cache.set('method', { id: '1' }, { data: 'one' });
      cache.set('method', { id: '2' }, { data: 'two' });

      cache.invalidateByParams('method', { id: '1' });

      expect(cache.get('method', { id: '1' })).toBeUndefined();
      expect(cache.get('method', { id: '2' })).toEqual({ data: 'two' });
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      const cache = new ResponseCache({ enabled: true });

      cache.set('method1', { id: '1' }, { data: 'one' });
      cache.set('method2', { id: '1' }, { data: 'two' });

      cache.clear();

      expect(cache.size).toBe(0);
    });
  });

  describe('size', () => {
    it('should return the number of cached entries', () => {
      const cache = new ResponseCache({ enabled: true });

      expect(cache.size).toBe(0);

      cache.set('method1', { id: '1' }, { data: 'one' });
      expect(cache.size).toBe(1);

      cache.set('method2', { id: '1' }, { data: 'two' });
      expect(cache.size).toBe(2);
    });
  });

  describe('setEnabled', () => {
    it('should enable caching', () => {
      const cache = new ResponseCache({ enabled: false });

      cache.setEnabled(true);
      cache.set('method', { id: '1' }, { data: 'test' });

      expect(cache.get('method', { id: '1' })).toEqual({ data: 'test' });
    });

    it('should disable caching and clear entries', () => {
      const cache = new ResponseCache({ enabled: true });

      cache.set('method', { id: '1' }, { data: 'test' });
      cache.setEnabled(false);

      expect(cache.size).toBe(0);
      expect(cache.get('method', { id: '1' })).toBeUndefined();
    });
  });

  describe('setTtl', () => {
    it('should update TTL for new entries', () => {
      const cache = new ResponseCache({ enabled: true, ttlMs: 1000 });

      cache.setTtl(5000);
      cache.set('method', { id: '1' }, { data: 'test' });

      vi.advanceTimersByTime(4000);
      expect(cache.get('method', { id: '1' })).toEqual({ data: 'test' });

      vi.advanceTimersByTime(2000);
      expect(cache.get('method', { id: '1' })).toBeUndefined();
    });
  });

  describe('maxEntries', () => {
    it('should evict oldest entries when maxEntries is exceeded', () => {
      const cache = new ResponseCache({ enabled: true, maxEntries: 3 });

      cache.set('method', { id: '1' }, { data: 'one' });
      cache.set('method', { id: '2' }, { data: 'two' });
      cache.set('method', { id: '3' }, { data: 'three' });

      expect(cache.size).toBe(3);

      // Adding a 4th entry should evict the oldest (id: 1)
      cache.set('method', { id: '4' }, { data: 'four' });

      expect(cache.size).toBe(3);
      expect(cache.get('method', { id: '1' })).toBeUndefined(); // Evicted
      expect(cache.get('method', { id: '2' })).toEqual({ data: 'two' });
      expect(cache.get('method', { id: '3' })).toEqual({ data: 'three' });
      expect(cache.get('method', { id: '4' })).toEqual({ data: 'four' });
    });

    it('should use default maxEntries (1000) when not specified', () => {
      const cache = new ResponseCache({ enabled: true });

      // Add entries up to default max
      for (let i = 0; i < 1000; i++) {
        cache.set('method', { id: String(i) }, { data: i });
      }

      expect(cache.size).toBe(1000);

      // Adding one more should evict the oldest
      cache.set('method', { id: '1000' }, { data: 1000 });

      expect(cache.size).toBe(1000);
      expect(cache.get('method', { id: '0' })).toBeUndefined(); // Evicted
      expect(cache.get('method', { id: '1000' })).toEqual({ data: 1000 });
    });

    it('should handle updating existing entry without eviction', () => {
      const cache = new ResponseCache({ enabled: true, maxEntries: 2 });

      cache.set('method', { id: '1' }, { data: 'one' });
      cache.set('method', { id: '2' }, { data: 'two' });

      // Update existing entry (should not cause eviction)
      cache.set('method', { id: '1' }, { data: 'one-updated' });

      expect(cache.size).toBe(2);
      expect(cache.get('method', { id: '1' })).toEqual({ data: 'one-updated' });
      expect(cache.get('method', { id: '2' })).toEqual({ data: 'two' });
    });
  });
});
