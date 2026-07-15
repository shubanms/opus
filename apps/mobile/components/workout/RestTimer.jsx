// Rest timer — a circular SVG countdown shown after a set is logged. Presets
// (1:00 / 1:30 / 2:00 / 3:00) + ±15s, ring warms gold→ember in the final 10s,
// chimes + buzzes on completion. Ports the PWA RestTimer. The chosen preset is
// persisted (restDuration setting) so it sticks across sets.
import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Mono, Label } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import PressScale from '../PressScale';
import { SecondaryButton } from '../Button';
import { playCue } from '../../native/sound';
import { success as hSuccess } from '../../native/haptics';
import { getSetting, setSetting } from '../../native/settings';

const PRESETS = [60, 90, 120, 180];
const SIZE = 180;
const STROKE = 12;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.max(0, sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RestTimer({ onDone }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const initial = Number(getSetting('restDuration')) || 90;
  const [total, setTotal] = useState(initial);
  const [remaining, setRemaining] = useState(initial);
  const [running, setRunning] = useState(true);
  const tickRef = useRef(null);
  const doneRef = useRef(false);

  // Countdown loop (250ms granularity for a smooth ring without waking too often).
  useEffect(() => {
    if (!running) return undefined;
    const startedAt = Date.now();
    const from = remaining;
    tickRef.current = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const next = Math.max(0, from - elapsed);
      setRemaining(next);
      if (next <= 0 && !doneRef.current) {
        doneRef.current = true;
        clearInterval(tickRef.current);
        setRunning(false);
        playCue('chime');
        hSuccess();
        onDone?.();
      }
    }, 250);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const reset = (secs) => {
    doneRef.current = false;
    setTotal(secs);
    setRemaining(secs);
    setRunning(true);
    setSetting('restDuration', secs);
  };
  const adjust = (delta) => {
    doneRef.current = false;
    const next = Math.max(15, Math.round(remaining) + delta);
    setTotal((t) => Math.max(t, next));
    setRemaining(next);
    setRunning(true);
  };

  const frac = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
  const offset = CIRC * (1 - frac);
  const ring = remaining <= 10 ? colors.ember : colors.gold;

  return (
    <View style={s.wrap}>
      <View style={s.header}>
        <Label>Rest</Label>
        <PressScale hitSlop={8} onPress={() => onDone?.()}>
          <Text style={s.skip}>Skip</Text>
        </PressScale>
      </View>

      <View style={s.ringWrap}>
        <Svg width={SIZE} height={SIZE}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.ivory} strokeWidth={STROKE} fill="none" />
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={ring}
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={s.center} pointerEvents="none">
          <Mono style={s.time}>{fmt(Math.ceil(remaining))}</Mono>
        </View>
      </View>

      <View style={s.adjustRow}>
        <SecondaryButton label="−15s" onPress={() => adjust(-15)} sound="tap" style={s.adjBtn} />
        <SecondaryButton label="+15s" onPress={() => adjust(15)} sound="tap" style={s.adjBtn} />
      </View>

      <View style={s.presets}>
        {PRESETS.map((p) => (
          <PressScale key={p} onPress={() => reset(p)} sound="tap" style={[s.preset, total === p && s.presetActive]}>
            <Text style={[s.presetText, total === p && s.presetTextActive]}>{fmt(p)}</Text>
          </PressScale>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  wrap: { backgroundColor: colors.stone, borderRadius: radius.xl, padding: space(4), gap: space(3), alignItems: 'stretch' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skip: { color: colors.ash, fontFamily: fonts.sansMedium, fontSize: 13 },
  ringWrap: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center', width: SIZE, height: SIZE },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  time: { color: colors.textInverse, fontSize: 40, fontFamily: fonts.mono },
  adjustRow: { flexDirection: 'row', gap: space(2), justifyContent: 'center' },
  adjBtn: { flex: 1 },
  presets: { flexDirection: 'row', gap: space(2), justifyContent: 'center' },
  preset: { flex: 1, paddingVertical: space(2.5), borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  presetActive: { backgroundColor: colors.gold },
  presetText: { color: colors.ash, fontFamily: fonts.mono, fontSize: 13 },
  presetTextActive: { color: colors.obsidian },
});
