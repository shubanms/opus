// OpusMark — OPUS's signature emblem: a gold ring around an obsidian disc that
// gains a stud per level and a brightening halo as you rank up (ports
// src/components/logo/OpusMark.jsx). Drawn with react-native-svg; a barbell
// glyph stands in for the lifter image.
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { colors } from '../theme';

export default function OpusMark({ size = 84, level = 1, prestige = 0 }) {
  const VB = 200;
  const c = VB / 2;
  const ringR = 90;
  const lvl = Math.max(1, Math.min(50, level || 1));
  const studCount = Math.min(lvl, 24);
  const strokeW = lvl >= 30 ? 6 : lvl >= 12 ? 5 : 4;

  // Halo intensity ramps with level + prestige (off below level 3).
  const haloAlpha = lvl < 3 && prestige === 0 ? 0 : Math.min(0.35, 0.06 + lvl * 0.006 + prestige * 0.05);

  const studs = [];
  for (let i = 0; i < studCount; i++) {
    const a = (i / studCount) * Math.PI * 2 - Math.PI / 2;
    studs.push({ x: c + Math.cos(a) * ringR, y: c + Math.sin(a) * ringR });
  }

  const iconSize = size * 0.42;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
        {/* Halo */}
        {haloAlpha > 0 && (
          <>
            <Circle cx={c} cy={c} r={99} fill={colors.gold} opacity={haloAlpha * 0.5} />
            <Circle cx={c} cy={c} r={95} fill={colors.gold} opacity={haloAlpha} />
          </>
        )}
        {/* Disc */}
        <Circle cx={c} cy={c} r={86} fill={colors.obsidian} />
        {/* Ring */}
        <Circle cx={c} cy={c} r={ringR} fill="none" stroke={colors.gold} strokeWidth={strokeW} />
        {/* Prestige crown accent */}
        {prestige > 0 && <Circle cx={c} cy={c - ringR} r={6} fill={colors.brightGold} />}
        {/* Level studs */}
        <G>
          {studs.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={3.2} fill={prestige > 0 ? colors.brightGold : colors.gold} />
          ))}
        </G>
      </Svg>
      <View style={{ position: 'absolute' }}>
        <Ionicons name="barbell" size={iconSize} color={colors.gold} />
      </View>
    </View>
  );
}
