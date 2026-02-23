// Theme configuration for the application

export const colors = {
  hotRed: {
    50: '#fff5f5',
    100: '#ffe3e3',
    200: '#ffc9c9',
    300: '#ffa8a8',
    400: '#ff8787',
    500: '#af4b0e',
    600: '#dc2f3b',
    700: '#c81d2e',
    800: '#b31a29',
    900: '#9a1622',
    950: '#7d0000',
  },
  burntClay: {
    50: '#fdf5f3',
    100: '#f9e8e3',
    200: '#f4d4ca',
    300: '#eab8a8',
    400: '#e09880',
    500: '#c25a45',
    600: '#b34935',
    700: '#9a3a2a',
    800: '#872e21',
    900: '#6f2419',
    950: '#3b1e19',
  },
};

export const themeConfig = {
  colors: {
    border: '#e2e8f0',
    input: '#e2e8f0',
    ring: '#af4b0e',
    background: '#ffffff',
    foreground: '#000000',
    primary: {
      DEFAULT: '#af4b0e',
      foreground: '#ffffff',
    },
    secondary: {
      DEFAULT: '#c25a45',
      foreground: '#ffffff',
    },
    destructive: {
      DEFAULT: '#ef4444',
      foreground: '#ffffff',
    },
    muted: {
      DEFAULT: '#f1f5f9',
      foreground: '#64748b',
    },
    accent: {
      DEFAULT: '#f1f5f9',
      foreground: '#0f172a',
    },
    popover: {
      DEFAULT: '#ffffff',
      foreground: '#0f172a',
    },
    card: {
      DEFAULT: '#ffffff',
      foreground: '#0f172a',
    },
    hotRed: colors.hotRed,
    burntClay: colors.burntClay,
  },
}; 