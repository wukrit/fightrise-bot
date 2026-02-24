import { useState, useEffect } from 'react';

/**
 * Breakpoint values matching common responsive design patterns
 */
export const breakpoints = {
  /** 640px - Small tablets */
  sm: 640,
  /** 768px - Tablets */
  md: 768,
  /** 1024px - Small laptops */
  lg: 1024,
  /** 1280px - Desktops */
  xl: 1280,
  /** 1536px - Large desktops */
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Check if the current viewport matches a breakpoint or larger
 * @param breakpoint The breakpoint to check
 * @returns true if viewport width >= breakpoint, false on server-side since viewport is unknown
 */
export function isAtLeast(breakpoint: Breakpoint): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= breakpoints[breakpoint];
}

/**
 * Check if the current viewport is smaller than a breakpoint
 * @param breakpoint The breakpoint to check
 * @returns true if viewport width < breakpoint, false on server-side since viewport is unknown
 */
export function isBelow(breakpoint: Breakpoint): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < breakpoints[breakpoint];
}

/**
 * React hook for responsive breakpoints
 * @param breakpoint The breakpoint to check
 * @returns Current match state
 *
 * @example
 * const isDesktop = useMediaQuery('lg');
 * const isMobile = !useMediaQuery('md');
 */
export function useMediaQuery(breakpoint: Breakpoint): boolean {
  const [matches, setMatches] = useState(() => isAtLeast(breakpoint));

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${breakpoints[breakpoint]}px)`);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Initial check
    setMatches(mediaQuery.matches);

    // Listen for changes
    mediaQuery.addEventListener('change', handler);

    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [breakpoint]);

  return matches;
}

/**
 * Hook to get current viewport size
 * @returns Object with width and height of viewport
 *
 * @example
 * const { width, height } = useViewportSize();
 */
export function useViewportSize(): { width: number; height: number } {
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);

    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);

  return size;
}

/**
 * Get the current device type based on viewport width
 * Returns 'desktop' by default on server-side to ensure consistent SSR behavior
 * @returns Device type: 'mobile', 'tablet', 'desktop', or 'wide'
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' | 'wide' {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;

  if (width < breakpoints.md) return 'mobile';
  if (width < breakpoints.lg) return 'tablet';
  if (width < breakpoints.xl) return 'desktop';
  return 'wide';
}

/**
 * Hook to get current device type
 */
export function useDeviceType(): 'mobile' | 'tablet' | 'desktop' | 'wide' {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop' | 'wide'>(() =>
    getDeviceType()
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = () => {
      setDeviceType(getDeviceType());
    };

    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return deviceType;
}

/**
 * Responsive style helper - returns different values based on viewport
 * @param styles Object with breakpoint keys ('base', 'sm', 'md', 'lg', 'xl')
 * @returns Resolved style object for current viewport
 *
 * @example
 * const styles = responsiveStyle({
 *   base: { flexDirection: 'column' },
 *   md: { flexDirection: 'row' },
 * });
 */
export function responsiveStyle<T extends React.CSSProperties>(
  styles: Partial<Record<'base' | Breakpoint, T>>
): React.CSSProperties {
  if (typeof window === 'undefined') {
    // Server-side: return base styles
    return styles.base || {};
  }

  const width = window.innerWidth;

  // Find the largest matching breakpoint
  const sortedBreakpoints: Breakpoint[] = ['sm', 'md', 'lg', 'xl', '2xl'];
  let matchedStyle: T | undefined;

  for (const bp of sortedBreakpoints) {
    if (width >= breakpoints[bp] && styles[bp]) {
      matchedStyle = styles[bp];
    }
  }

  return matchedStyle || styles.base || {};
}

/**
 * Conditional style helper - applies styles based on conditions
 * @param conditions Array of [condition, style] pairs
 * @returns Merged style object
 *
 * @example
 * const styles = conditionalStyle([
 *   [isLoading, { opacity: 0.5, pointerEvents: 'none' }],
 *   [isDisabled, { cursor: 'not-allowed' }],
 * ]);
 */
export function conditionalStyle<T extends React.CSSProperties>(
  conditions: Array<[boolean, T]>
): React.CSSProperties {
  const result: React.CSSProperties = {};

  for (const [condition, style] of conditions) {
    if (condition) {
      Object.assign(result, style);
    }
  }

  return result;
}

/**
 * Generate responsive CSS variables for use in inline styles
 */
export const responsiveVars = {
  '--breakpoint-sm': `${breakpoints.sm}px`,
  '--breakpoint-md': `${breakpoints.md}px`,
  '--breakpoint-lg': `${breakpoints.lg}px`,
  '--breakpoint-xl': `${breakpoints.xl}px`,
  '--breakpoint-2xl': `${breakpoints['2xl']}px`,
} as React.CSSProperties;
