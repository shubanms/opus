import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space } from './theme';

export function Screen({ children, scroll = true }) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <Body contentContainerStyle={scroll ? s.scroll : undefined} style={{ flex: 1 }}>
        {children}
      </Body>
    </SafeAreaView>
  );
}

export function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function H1({ children, style }) {
  return <Text style={[s.h1, style]}>{children}</Text>;
}

export function Label({ children, style }) {
  return <Text style={[s.label, style]}>{children}</Text>;
}

export function Body({ children, style }) {
  return <Text style={[s.body, style]}>{children}</Text>;
}

export function Mono({ children, style }) {
  return <Text style={[s.mono, style]}>{children}</Text>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space(5), paddingBottom: space(24), gap: space(4) },
  card: { backgroundColor: colors.chalk, borderColor: colors.ivory, borderWidth: 1, borderRadius: radius.xl, padding: space(4) },
  h1: { color: colors.textPrimary, fontSize: 34, fontWeight: '700', letterSpacing: 0.5 },
  label: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  body: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  mono: { color: colors.textPrimary, fontVariant: ['tabular-nums'], fontSize: 15 },
});
