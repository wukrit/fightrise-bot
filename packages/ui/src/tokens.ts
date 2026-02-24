// Design tokens for UI package
// These provide type-safe access to design values

// Gray scale for borders and neutrals
const grayScale = {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
} as const;

export const colors = {
  // Primary
  primary: '#3b82f6',
  primaryHover: '#2563eb',

  // Secondary
  secondary: '#6b7280',
  secondaryHover: '#4b5563',

  // Danger
  danger: '#ef4444',
  dangerHover: '#dc2626',

  // Discord
  discord: '#5865F2',
  discordHover: '#4752C4',

  // Semantic
  success: '#57f287',
  warning: '#f59e0b',
  error: '#ed4245',

  // Neutrals
  white: '#ffffff',
  black: '#000000',
  gray: grayScale,

  // Border
  border: grayScale[200],
  borderHover: grayScale[300],
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
} as const;

export const typography = {
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const borderRadius = {
  none: '0px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
} as const;

export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '300ms ease',
} as const;

export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  modal: 1030,
  popover: 1040,
  tooltip: 1050,
} as const;

// Dark mode variants
export const colorsDark = {
  ...colors,
  background: '#1f2937',
  surface: '#374151',
  text: '#f9fafb',
  textMuted: '#9ca3af',
  border: '#4b5563',
} as const;

// CSS Variables for Radix UI integration
// These provide CSS variable names that work with Radix data-state attributes
export const cssVariables = {
  // Colors
  '--color-primary': colors.primary,
  '--color-primary-hover': colors.primaryHover,
  '--color-secondary': colors.secondary,
  '--color-secondary-hover': colors.secondaryHover,
  '--color-danger': colors.danger,
  '--color-danger-hover': colors.dangerHover,
  '--color-discord': colors.discord,
  '--color-discord-hover': colors.discordHover,
  '--color-success': colors.success,
  '--color-warning': colors.warning,
  '--color-error': colors.error,
  '--color-white': colors.white,
  '--color-black': colors.black,
  '--color-border': colors.border,
  '--color-border-hover': colors.borderHover,

  // Gray scale
  '--color-gray-50': grayScale[50],
  '--color-gray-100': grayScale[100],
  '--color-gray-200': grayScale[200],
  '--color-gray-300': grayScale[300],
  '--color-gray-400': grayScale[400],
  '--color-gray-500': grayScale[500],
  '--color-gray-600': grayScale[600],
  '--color-gray-700': grayScale[700],
  '--color-gray-800': grayScale[800],
  '--color-gray-900': grayScale[900],

  // Spacing
  '--spacing-xs': spacing.xs,
  '--spacing-sm': spacing.sm,
  '--spacing-md': spacing.md,
  '--spacing-lg': spacing.lg,
  '--spacing-xl': spacing.xl,
  '--spacing-2xl': spacing['2xl'],

  // Border radius
  '--radius-none': borderRadius.none,
  '--radius-sm': borderRadius.sm,
  '--radius-md': borderRadius.md,
  '--radius-lg': borderRadius.lg,
  '--radius-xl': borderRadius.xl,
  '--radius-full': borderRadius.full,

  // Shadows
  '--shadow-sm': shadows.sm,
  '--shadow-md': shadows.md,
  '--shadow-lg': shadows.lg,

  // Transitions
  '--transition-fast': transitions.fast,
  '--transition-normal': transitions.normal,
  '--transition-slow': transitions.slow,

  // Z-index
  '--z-dropdown': zIndex.dropdown,
  '--z-sticky': zIndex.sticky,
  '--z-modal': zIndex.modal,
  '--z-popover': zIndex.popover,
  '--z-tooltip': zIndex.tooltip,
} as const;

export type CssVariables = typeof cssVariables;

// Combined tokens export for easy importing
export const tokens = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  colorsDark,
  cssVariables,
} as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Typography = typeof typography;
export type BorderRadius = typeof borderRadius;
export type Shadows = typeof shadows;
