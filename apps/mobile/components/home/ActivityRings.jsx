// Daily activity rings — steps (gold) + water (sage) vs their goals, with −/+
// water controls. Ports the PWA ActivityRings. Steps come from Health Connect
// import (Settings); water is tapped in here.
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { dateKey } from '@opus/core';
import { Label, Mono } from '../../ui';
import { colors, radius, space, fonts } from '../../theme';
import Card from '../Card';
import PressScale from '../PressScale';
import { useDbQuery } from '../../native/useDbQuery';
import { getSteps, getWater, setWater } from '../../native/db';
import { useSettings } from '../../native/settings';

const SIZE = 96;
const STROKE = 9;

function Ring({ frac, color, radiusPx }) {
  const c = 2 * Math.PI * radiusPx;
  return (
    <>
      <Circle cx={SIZE / 2} cy={SIZE / 2} r={radiusPx} stroke={colors.ivory} strokeWidth={STROKE} fill="none" />
      <Circle
        cx={SIZE / 2} cy={SIZE / 2} r={radiusPx} stroke={color} strokeWidth={STROKE} fill="none"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, frac))}
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
      />
    </>
  );
}

export default function ActivityRings() {
  const { settings } = useSettings();
  const today = dateKey.todayKey();
  const steps = useDbQuery(() => getSteps(today), [today], null) || 0;
  const water = useDbQuery(() => getWater(today), [today], null) || 0;
  const stepGoal = settings.stepGoal || 8000;
  const waterGoal = settings.waterGoal || 8;

  const addWater = (delta) => setWater(today, Math.max(0, water + delta));

  return (
    <Card>
      <Label>Today's activity</Label>
      <View style={s.row}>
        <View style={s.rings}>
          <Svg width={SIZE} height={SIZE}>
            <Ring frac={steps / stepGoal} color={colors.gold} radiusPx={(SIZE - STROKE) / 2} />
            <Ring frac={water / waterGoal} color={colors.sage} radiusPx={(SIZE - STROKE) / 2 - STROKE - 3} />
          </Svg>
        </View>
        <View style={{ flex: 1, gap: space(3) }}>
          <View>
            <Mono style={[s.val, { color: colors.gold }]}>{steps.toLocaleString()}<Text style={s.goal}> / {stepGoal.toLocaleString()} steps</Text></Mono>
          </View>
          <View style={s.waterRow}>
            <Mono style={[s.val, { color: colors.sage }]}>{water}<Text style={s.goal}> / {waterGoal} glasses</Text></Mono>
            <View style={s.waterBtns}>
              <PressScale onPress={() => addWater(-1)} sound="tap" style={s.wBtn}><Text style={s.wBtnText}>−</Text></PressScale>
              <PressScale onPress={() => addWater(1)} sound="tick" style={[s.wBtn, s.wBtnAdd]}><Text style={[s.wBtnText, { color: colors.obsidian }]}>+</Text></PressScale>
            </View>
          </View>
        </View>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space(4), marginTop: space(3) },
  rings: { width: SIZE, height: SIZE },
  val: { fontFamily: fonts.monoMedium, fontSize: 18, color: colors.textPrimary },
  goal: { fontFamily: fonts.sans, fontSize: 12, color: colors.textSecondary },
  waterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waterBtns: { flexDirection: 'row', gap: space(2) },
  wBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.ivory, alignItems: 'center', justifyContent: 'center' },
  wBtnAdd: { backgroundColor: colors.sage },
  wBtnText: { fontFamily: fonts.sansSemi, fontSize: 20, color: colors.textPrimary },
});
