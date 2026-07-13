// OPUS design tokens — the "parchment" identity ported 1:1 from the web PWA
// (src/styles/tokens.css + tailwind.config.js). Warm, editorial, dark-luxury:
// an obsidian canvas holding near-white chalk cards outlined by a thin ivory
// hairline, with antique gold as the single hero accent.
export const colors = {
  // Canvas + surfaces
  obsidian: '#111010', // app background / inverse feature cards
  bg: '#111010',
  chalk: '#F7F5F2', // primary card surface (parchment)
  ivory: '#EDEAE5', // inset fills, tracks, hairline borders
  stone: '#2C2C2C', // dark feature card (CharacterCard)
  // Accents
  gold: '#C9A84C', // the one thing that shines — XP, levels, PRs, CTA
  brightGold: '#E8D48A', // halo / prestige / celebration only
  ember: '#D4622A', // streaks, warnings, delete
  sage: '#6B8F71', // recovery, water, success
  ash: '#8A8780', // muted text + borders
  // Text roles (on parchment)
  textPrimary: '#1A1A1A',
  textSecondary: '#8A8780',
  textInverse: '#F7F5F2',
};

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

// Loaded font-family names → set by App.js via @expo-google-fonts. The
// serif-for-display / sans-for-UI / mono-for-numbers split IS the brand.
export const fonts = {
  display: 'CormorantGaramond_700Bold', // OPUS wordmark, titles, big numbers
  displaySemi: 'CormorantGaramond_600SemiBold',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemi: 'DMSans_600SemiBold',
  sansLight: 'DMSans_300Light',
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
};
