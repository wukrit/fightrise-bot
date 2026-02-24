import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  breakpoints,
  isAtLeast,
  isBelow,
  responsiveStyle,
  conditionalStyle,
  responsiveVars,
} from './responsive.js';

// Mock window for non-hook tests
beforeEach(() => {
  vi.stubGlobal('window', {
    innerWidth: 1024,
    innerHeight: 768,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('breakpoints', () => {
  it('has correct breakpoint values', () => {
    expect(breakpoints.sm).toBe(640);
    expect(breakpoints.md).toBe(768);
    expect(breakpoints.lg).toBe(1024);
    expect(breakpoints.xl).toBe(1280);
    expect(breakpoints['2xl']).toBe(1536);
  });
});

describe('isAtLeast', () => {
  it('returns false on server-side', () => {
    vi.stubGlobal('window', undefined);
    expect(isAtLeast('md')).toBe(false);
  });

  it('returns true when viewport is at or above breakpoint', () => {
    vi.stubGlobal('window', { innerWidth: 1024 });
    expect(isAtLeast('md')).toBe(true);
  });

  it('returns false when viewport is below breakpoint', () => {
    vi.stubGlobal('window', { innerWidth: 500 });
    expect(isAtLeast('md')).toBe(false);
  });
});

describe('isBelow', () => {
  it('returns false on server-side', () => {
    vi.stubGlobal('window', undefined);
    expect(isBelow('md')).toBe(false);
  });

  it('returns true when viewport is below breakpoint', () => {
    vi.stubGlobal('window', { innerWidth: 500 });
    expect(isBelow('md')).toBe(true);
  });

  it('returns false when viewport is at or above breakpoint', () => {
    vi.stubGlobal('window', { innerWidth: 1024 });
    expect(isBelow('md')).toBe(false);
  });
});

describe('responsiveStyle', () => {
  it('returns base styles on server-side', () => {
    vi.stubGlobal('window', undefined);
    const styles = responsiveStyle({
      base: { color: 'blue' },
      md: { color: 'red' },
    });
    expect(styles).toEqual({ color: 'blue' });
  });

  it('returns base styles when viewport is small', () => {
    vi.stubGlobal('window', { innerWidth: 500 });
    const styles = responsiveStyle({
      base: { color: 'blue' },
      md: { color: 'red' },
    });
    expect(styles).toEqual({ color: 'blue' });
  });

  it('returns matching breakpoint styles when viewport is larger', () => {
    vi.stubGlobal('window', { innerWidth: 800 });
    const styles = responsiveStyle({
      base: { color: 'blue' },
      md: { color: 'red' },
    });
    expect(styles).toEqual({ color: 'red' });
  });
});

describe('conditionalStyle', () => {
  it('applies styles when condition is true', () => {
    const styles = conditionalStyle([
      [true, { color: 'red' }],
    ]);
    expect(styles).toEqual({ color: 'red' });
  });

  it('does not apply styles when condition is false', () => {
    const styles = conditionalStyle([
      [false, { color: 'red' }],
    ]);
    expect(styles).toEqual({});
  });

  it('merges multiple true conditions', () => {
    const styles = conditionalStyle([
      [true, { color: 'red' }],
      [true, { fontSize: '16px' }],
    ]);
    expect(styles).toEqual({ color: 'red', fontSize: '16px' });
  });

  it('only applies true conditions', () => {
    const styles = conditionalStyle([
      [true, { color: 'red' }],
      [false, { fontSize: '16px' }],
      [true, { backgroundColor: 'blue' }],
    ]);
    expect(styles).toEqual({ color: 'red', backgroundColor: 'blue' });
  });
});

describe('responsiveVars', () => {
  it('contains breakpoint CSS variables', () => {
    const vars = responsiveVars as Record<string, string>;
    expect(vars['--breakpoint-sm']).toBe('640px');
    expect(vars['--breakpoint-md']).toBe('768px');
    expect(vars['--breakpoint-lg']).toBe('1024px');
    expect(vars['--breakpoint-xl']).toBe('1280px');
    expect(vars['--breakpoint-2xl']).toBe('1536px');
  });
});
