// src/theme/theme.js

export const theme = {
  colors: {
    primary: '#006948',          // Precision-Ag deep emerald green
    primaryLight: '#D1FAE5',     // Soft emerald tint for background highlights
    secondary: '#575e70',        // Slate
    background: '#F9FAFB',       // Light gray fog page background
    surface: '#FFFFFF',          // Card/Container background
    surfaceDim: '#F3F4F6',       // Muted background
    text: '#111827',             // Primary dark slate text
    textMuted: '#6B7280',        // Secondary gray stone text
    border: '#E5E7EB',           // Light border gray
    borderFocused: '#006948',    // Focus border green
    error: '#BA1A1A',            // Error red
    errorContainer: '#FFDAD6',
    warning: '#D97706',          // Orange / Amber for alerts/pending
    warningContainer: '#FEF3C7',
    success: '#059669',          // Positive emerald green
    successContainer: '#D1FAE5',
    white: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
  roundness: {
    small: 6,
    medium: 12,                  // Buttons & Inputs standard roundness
    large: 16,                   // Container cards
    full: 9999,                  // Chips & Badges pill shape
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 40,
    xxl: 80,
  },
  typography: {
    display: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 40,
    },
    headline: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 32,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
    },
    bodyLarge: {
      fontSize: 16,
      fontWeight: '500',
      lineHeight: 24,
    },
    bodyMedium: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    bodySmall: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
    },
    labelBold: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
    },
    labelSmall: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
    },
  }
};

export default theme;
