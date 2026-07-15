// Runtime theming — resolves the active palette from the `theme` setting
// (light | dark | system) + the OS color scheme, exposes it via context.
// useColors() for inline/JSX colors; useThemedStyles(makeStyles) for
// StyleSheets. The native equivalent of the web's [data-theme] toggle.
import { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from '../theme';
import { useSettings } from './settings';

const ThemeContext = createContext(lightColors);

export function ThemeProvider({ children }) {
  const { settings } = useSettings();
  const system = useColorScheme();
  const pref = settings.theme || 'system';
  const scheme = pref === 'system' ? (system || 'light') : pref;
  const colors = scheme === 'dark' ? darkColors : lightColors;
  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}

export function useColors() {
  return useContext(ThemeContext);
}

export function useThemedStyles(makeStyles) {
  const colors = useContext(ThemeContext);
  return useMemo(() => makeStyles(colors), [colors, makeStyles]);
}
