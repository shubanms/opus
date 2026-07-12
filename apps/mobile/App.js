import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
// Proof that the shared @opus/core package works unchanged inside React Native.
import { dateKey, oneRepMax, rpg } from '@opus/core';

export default function App() {
  const today = dateKey.todayKey();
  const e1rm = Math.round(oneRepMax.epley1RM(100, 5));
  const title = rpg.getTitle ? rpg.getTitle(rpg.getLevelFromTotalXP?.(8000) ?? 1) : '—';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.brand}>OPUS</Text>
      <Text style={styles.sub}>native · React Native + Expo</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Shared @opus/core is running:</Text>
        <Text style={styles.row}>todayKey() → {today}</Text>
        <Text style={styles.row}>epley1RM(100, 5) → {e1rm} kg</Text>
        <Text style={styles.row}>title @ 8000 XP → {title}</Text>
      </View>

      <Text style={styles.note}>
        Phase A scaffold. Build out screens, SQLite, Health Connect and notifications per
        docs/NATIVE_PORT.md.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111010', alignItems: 'center', justifyContent: 'center', padding: 24 },
  brand: { color: '#F5F3EF', fontSize: 44, fontWeight: '700', letterSpacing: 1 },
  sub: { color: '#8A8780', fontSize: 13, marginTop: 4 },
  card: { backgroundColor: '#1A1917', borderColor: '#2A2825', borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 28, width: '100%' },
  label: { color: '#C9A84C', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  row: { color: '#F5F3EF', fontSize: 15, fontFamily: 'monospace', marginTop: 4 },
  note: { color: '#8A8780', fontSize: 12, textAlign: 'center', marginTop: 28, lineHeight: 18 },
});
