/**
 * Imposter — Neo-Brutalist Design Tokens
 * Single source of truth for design tokens (docs/DESIGN.md Section 1).
 * Single light theme: Cream canvas, thick ink strokes, hard offset shadows.
 */

export const tokens = {
  colors: {
    ink: '#111111',        // All strokes, shadows, body text
    cream: '#F4F1EA',      // Screen background
    paper: '#FFFFFF',      // Cards, inputs, buttons (default fill)
    orange: '#FF5A00',     // Primary action, host badge, accent square
    yellow: '#FFB800',     // Secondary action, selection, highlights, marker strips
    yellowSoft: '#F9DA81',  // Large soft fills (hero blocks)
    red: '#E5322D',        // Eliminated, imposter reveal, error
    green: '#1F9D55',      // Present/connected dot
    grey: '#8A8780',       // Disabled text/strokes only
  },
  shape: {
    stroke: 3,             // Standard border stroke
    strokeThin: 2,         // Thin dividers / secondary
    radius: 0,             // 0 everywhere (strict neo-brutalist)
    shadow: 4,             // Hard offset 4 right, 4 down
    shadowLarge: 6,        // Hard offset 6 right, 6 down (large cards)
    shadowColor: '#111111',// Solid ink, no blur
    space: {
      xxs: 4,
      xs: 8,
      sm: 12,
      md: 16,
      screen: 20,          // Standard screen padding
      lg: 24,
      xl: 32,
    },
    tap: 56,               // Minimum tappable height
  },
  typography: {
    fonts: {
      display: 'AbrilFatface_400Regular',
      body: 'Archivo_500Medium',
      bodyBold: 'Archivo_700Bold',
      bodyBlack: 'Archivo_800ExtraBold',
      fallbackSerif: 'serif',
      fallbackSans: 'system-ui, -apple-system, sans-serif',
    },
    styles: {
      wordmark: {
        fontFamily: 'AbrilFatface_400Regular',
        fontSize: 56,
        lineHeight: 58,
        letterSpacing: -1,
      },
      h1: {
        fontFamily: 'AbrilFatface_400Regular',
        fontSize: 36,
        lineHeight: 40,
      },
      h2: {
        fontFamily: 'AbrilFatface_400Regular',
        fontSize: 28,
        lineHeight: 32,
      },
      codeBig: {
        fontFamily: 'AbrilFatface_400Regular',
        fontSize: 72,
        lineHeight: 72,
        letterSpacing: 8,
      },
      word: {
        fontFamily: 'AbrilFatface_400Regular',
        fontSize: 56,
        lineHeight: 60,
      },
      title: {
        fontFamily: 'Archivo_800ExtraBold',
        fontSize: 20,
        lineHeight: 24,
      },
      body: {
        fontFamily: 'Archivo_500Medium',
        fontSize: 16,
        lineHeight: 22,
      },
      label: {
        fontFamily: 'Archivo_700Bold',
        fontSize: 12,
        lineHeight: 16,
        letterSpacing: 1,
      },
    },
  },
  motion: {
    pressDuration: 80,     // Signature button press duration
    pressOffset: 4,        // Translation on press (x, y)
    flipDuration: 250,     // Card flip duration
  },
} as const;

export type DesignTokens = typeof tokens;
export type TokenColors = typeof tokens.colors;
export type ColorToken = keyof TokenColors;

/**
 * Single light theme representation for AppTheme compatibility
 */
export interface AppTheme {
  name: 'cream';
  tokens: DesignTokens;
  colors: {
    background: string;
    surface: string;
    surfaceSubtle: string;
    surfaceCard: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    primaryText: string;
    accent: string;
    accentText: string;
    danger: string;
    dangerText: string;
    success: string;
    border: string;
    borderStrong: string;
    cardBack: string;
    cardBackBorder: string;
    cardBackPattern: string;
  };
  typography: {
    fontFamily: string;
    size: {
      xs: number;
      sm: number;
      base: number;
      lg: number;
      xl: number;
      xxl: number;
      cardWord: number;
    };
    weight: {
      regular: '400';
      medium: '500';
      semibold: '600';
      bold: '700';
      black: '900';
    };
  };
  metrics: {
    minTapTarget: number;
    borderRadius: {
      sm: number;
      md: number;
      lg: number;
      card: number;
      full: number;
    };
    spacing: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
  };
}

export const CreamTheme: AppTheme = {
  name: 'cream',
  tokens,
  colors: {
    background: tokens.colors.cream,
    surface: tokens.colors.paper,
    surfaceSubtle: tokens.colors.cream,
    surfaceCard: tokens.colors.paper,
    text: tokens.colors.ink,
    textSecondary: tokens.colors.ink,
    textMuted: tokens.colors.grey,
    primary: tokens.colors.orange,
    primaryText: tokens.colors.ink,
    accent: tokens.colors.yellow,
    accentText: tokens.colors.ink,
    danger: tokens.colors.red,
    dangerText: tokens.colors.paper,
    success: tokens.colors.green,
    border: tokens.colors.ink,
    borderStrong: tokens.colors.ink,
    cardBack: tokens.colors.yellowSoft,
    cardBackBorder: tokens.colors.ink,
    cardBackPattern: tokens.colors.ink,
  },
  typography: {
    fontFamily: tokens.typography.fonts.body,
    size: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 20,
      xl: 28,
      xxl: 36,
      cardWord: 56,
    },
    weight: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      black: '900',
    },
  },
  metrics: {
    minTapTarget: tokens.shape.tap,
    borderRadius: {
      sm: 0,
      md: 0,
      lg: 0,
      card: 0,
      full: 0,
    },
    spacing: {
      xs: tokens.shape.space.xs,
      sm: tokens.shape.space.sm,
      md: tokens.shape.space.md,
      lg: tokens.shape.space.lg,
      xl: tokens.shape.space.xl,
    },
  },
};

// Aliases for single light theme compatibility
export const SunTheme = CreamTheme;
export const NightTheme = CreamTheme;
export const themes = {
  sun: CreamTheme,
  night: CreamTheme,
  cream: CreamTheme,
};
