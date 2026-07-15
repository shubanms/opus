// XP progress bar — 8px ivory track with a gold fill that animates 0→pct
// (ports src/components/rpg/XPBar.jsx). Optional label row (Level N · X XP to next).
import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Icon from '../Icon';
import { Label, Mono } from '../../ui';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import { motionOn } from '../../native/settings';

export default function XPBar({ progress = 0, level, xpToNext, showLabel = false }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const w = useRef(new Animated.Value(motionOn() ? 0 : clamp(progress))).current;

  useEffect(() => {
    const target = clamp(progress);
    if (!motionOn()) {
      w.setValue(target);
      return;
    }
    Animated.timing(w, { toValue: target, duration: 1100, useNativeDriver: false }).start();
  }, [progress]);

  const width = w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View>
      {showLabel && (
        <View style={s.labelRow}>
          <View style={s.labelLeft}>
            <Icon name="flash" size={12} color={colors.gold} />
            <Label style={{ marginLeft: 5 }}>Level {level}</Label>
          </View>
          <Mono style={s.toNext}>{xpToNext > 0 ? `${Math.round(xpToNext).toLocaleString()} XP to next` : 'Max'}</Mono>
        </View>
      )}
      <View style={s.track}>
        <Animated.View style={[s.fill, { width }]} />
      </View>
    </View>
  );
}

function clamp(n) {
  return Math.max(0, Math.min(1, n || 0));
}

const makeStyles = (colors) => StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  labelLeft: { flexDirection: 'row', alignItems: 'center' },
  toNext: { fontFamily: fonts.mono, fontSize: 12, color: colors.textSecondary },
  track: { height: 8, backgroundColor: colors.ivory, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: colors.gold, borderRadius: radius.full },
});
