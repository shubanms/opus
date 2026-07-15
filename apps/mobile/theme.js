// OPUS design tokens — the "parchment" identity ported 1:1 from the web PWA
// (src/styles/tokens.css + tailwind.config.js). Warm, editorial, dark-luxury.
//
// Light + dark palettes: only surfaces + on-surface text flip (matching the
// web's [data-theme='dark']); the obsidian canvas, gold and status colors are
// constant. Components read the ACTIVE palette via native/ThemeProvider
// (useColors / useThemedStyles) so a theme change re-renders every surface.
export const lightColors = {
  obsidian: '#111010',
  bg: '#111010',
  chalk: '#F7F5F2',
  ivory: '#EDEAE5',
  stone: '#2C2C2C',
  gold: '#C9A84C',
  brightGold: '#E8D48A',
  ember: '#D4622A',
  sage: '#6B8F71',
  ash: '#8A8780',
  textPrimary: '#1A1A1A',
  textSecondary: '#8A8780',
  textInverse: '#F7F5F2',
};

// Dark: card/inset surfaces darken, on-surface text lightens. Canvas + accents
// unchanged. Mirrors tokens.css [data-theme='dark'].
export const darkColors = {
  ...lightColors,
  chalk: '#1A1614',
  ivory: '#262220',
  stone: '#211D1A',
  textPrimary: '#F3EFE9',
  textSecondary: '#A09A90',
};

// Default export stays the light palette so any static reference is still valid;
// themed components read the active palette via useColors().
export const colors = lightColors;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, full: 9999 };

// 4px base spacing scale (matches Tailwind's usage in the PWA).
export const space = (n) => n * 4;

// Signature expo-out easing + the PWA's duration ladder (ms).
export const motion = {
  ease: [0.22, 1, 0.36, 1],
  micro: 150,
  standard: 250,
  enter: 350,
  loading: 600,
};

// Loaded font-family names → set by App.js via @expo-google-fonts.
export const fonts = {
  display: 'CormorantGaramond_700Bold',
  displaySemi: 'CormorantGaramond_600SemiBold',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemi: 'DMSans_600SemiBold',
  sansLight: 'DMSans_300Light',
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
};
