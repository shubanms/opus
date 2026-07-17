// Training calendar — a 12-week × 7-day grid (GitHub-style), gold = trained,
// ivory = rest. Ports the web Heatmap. `days` is a Set of 'YYYY-MM-DD' keys.
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Label } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import Card from '../Card';

const WEEKS = 12;
const CELL = 13;

function isoOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Heatmap({ days }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const set = days instanceof Set ? days : new Set(days || []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); // this week's Monday
  const start = new Date(monday);
  start.setDate(start.getDate() - (WEEKS - 1) * 7);

  const columns = [];
  for (let w = 0; w < WEEKS; w++) {
    const col = [];
    for (let r = 0; r < 7; r++) {
      const d = new Date(start);
      d.setDate(d.getDate() + w * 7 + r);
      const iso = isoOf(d);
      col.push({ iso, trained: set.has(iso), future: d.getTime() > today.getTime() });
    }
    columns.push(col);
  }

  const trainedCount = set.size;

  return (
    <Card>
      <View style={s.head}>
        <Label>Training calendar</Label>
        <Text style={s.sub}>{trainedCount} day{trainedCount === 1 ? '' : 's'}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 3, marginTop: space(3) }}>
        {columns.map((col, ci) => (
          <View key={ci} style={{ gap: 3 }}>
            {col.map((cell) => (
              <View
                key={cell.iso}
                style={[
                  s.cell,
                  cell.future ? s.future : cell.trained ? s.trained : s.rest,
                ]}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </Card>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sub: { color: colors.textSecondary, fontFamily: fonts.mono, fontSize: 12 },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  trained: { backgroundColor: colors.gold },
  rest: { backgroundColor: colors.ivory },
  future: { backgroundColor: 'transparent' },
});
