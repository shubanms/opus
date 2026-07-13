// Typographic + layout primitives carrying the OPUS brand voice: Cormorant
// Garamond serif for display/titles, DM Sans for labels/body, DM Mono for
// numbers. Import these instead of raw <Text> so the whole app stays on-brand.
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space, fonts } from './theme';

export function Screen({ children, scroll = true, contentStyle }) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <Body
        contentContainerStyle={scroll ? [s.scroll, contentStyle] : undefined}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Body>
    </SafeAreaView>
  );
}

// "OPUS" wordmark — Cormorant, wide letter-spacing (the brand signature).
export function Wordmark({ style, size = 40 }) {
  return <Text style={[s.wordmark, { fontSize: size, letterSpacing: size * 0.14 }, style]}>OPUS</Text>;
}

export function Display({ children, style }) {
  return <Text style={[s.display, style]}>{children}</Text>;
}

export function H1({ children, style, numberOfLines }) {
  return <Text numberOfLines={numberOfLines} style={[s.h1, style]}>{children}</Text>;
}

export function H2({ children, style }) {
  return <Text style={[s.h2, style]}>{children}</Text>;
}

// Small-caps overline label (eyebrow). Pass color for gold/secondary variants.
export function Label({ children, style }) {
  return <Text style={[s.label, style]}>{children}</Text>;
}

export function Body({ children, style, numberOfLines }) {
  return <Text numberOfLines={numberOfLines} style={[s.body, style]}>{children}</Text>;
}

// Tabular numeric text (DM Mono) — levels, XP, stat values, timers.
export function Mono({ children, style }) {
  return <Text style={[s.mono, style]}>{children}</Text>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space(5), paddingBottom: space(24), gap: space(4) },
  wordmark: { color: colors.textInverse, fontFamily: fonts.display },
  display: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 44, lineHeight: 46 },
  h1: { color: colors.textPrimary, fontFamily: fonts.display, fontSize: 34, lineHeight: 36 },
  h2: { color: colors.textPrimary, fontFamily: fonts.displaySemi, fontSize: 22, lineHeight: 26 },
  label: {
    color: colors.textSecondary,
    fontFamily: fonts.sansSemi,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  body: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20 },
  mono: { color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 15 },
});

export { colors, radius, space, fonts };
