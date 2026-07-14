// Character radar — a 5-axis SVG polygon of Strength/Power/Endurance/
// Consistency/Balance from rpg.getCharacterStats. Ports the PWA CharacterCard
// radar (Recharts → hand-drawn SVG). Dark feature card.
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Line as SvgLine, Circle, Text as SvgText } from 'react-native-svg';
import { rpg } from '@opus/core';
import { Label } from '../../ui';
import { colors, radius, space, fonts } from '../../theme';
import Card from '../Card';
import { useDbQuery } from '../../native/useDbQuery';
import { getRadarInputs } from '../../native/db';

const SIZE = 220;
const CENTER = SIZE / 2;
const R = 78;

export default function RadarCard() {
  const inputs = useDbQuery(() => getRadarInputs(), [], null);
  const stats = rpg.getCharacterStats(inputs || {});
  const n = stats.length;

  const point = (i, frac) => {
    const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [CENTER + Math.cos(ang) * R * frac, CENTER + Math.sin(ang) * R * frac];
  };
  const ring = (frac) => stats.map((_, i) => point(i, frac).join(',')).join(' ');
  const shape = stats.map((s, i) => point(i, Math.max(0.04, s.value / 100)).join(',')).join(' ');

  return (
    <Card variant="dark">
      <Label style={{ color: colors.gold }}>Character</Label>
      <View style={{ alignItems: 'center', marginTop: space(2) }}>
        <Svg width={SIZE} height={SIZE}>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <Polygon key={f} points={ring(f)} fill="none" stroke="rgba(247,245,242,0.12)" strokeWidth={1} />
          ))}
          {stats.map((_, i) => {
            const [x, y] = point(i, 1);
            return <SvgLine key={i} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="rgba(247,245,242,0.12)" strokeWidth={1} />;
          })}
          <Polygon points={shape} fill="rgba(201,168,76,0.28)" stroke={colors.gold} strokeWidth={2} />
          {stats.map((s, i) => {
            const [lx, ly] = point(i, 1.16);
            return (
              <SvgText key={s.axis} x={lx} y={ly} fill={colors.ash} fontSize={9} fontFamily={fonts.sansSemi} textAnchor="middle">
                {s.axis}
              </SvgText>
            );
          })}
          <Circle cx={CENTER} cy={CENTER} r={2} fill={colors.gold} />
        </Svg>
      </View>
      <View style={s.legend}>
        {stats.map((st) => (
          <View key={st.axis} style={s.legendRow}>
            <Text style={s.legAxis}>{st.axis}</Text>
            <Text style={s.legVal}>{Math.round(st.value)}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  legend: { marginTop: space(3), gap: space(1) },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between' },
  legAxis: { color: colors.ash, fontFamily: fonts.sans, fontSize: 12 },
  legVal: { color: colors.textInverse, fontFamily: fonts.mono, fontSize: 12 },
});
