// Progressive-overload coaching for an exercise, from its last 3 finished
// sessions (@opus/core/overload). Ports the web OverloadNudge. Silent when the
// suggestion is "maintain" or there's no history.
import { View, Text, StyleSheet } from 'react-native';
import { overload } from '@opus/core';
import Icon from '../Icon';
import { radius, space, fonts } from '../../theme';
import { useThemedStyles } from '../../native/ThemeProvider';
import { useDbQuery } from '../../native/useDbQuery';
import { getExerciseSessions } from '../../native/db';
import { useSettings } from '../../native/settings';

const ICON = { increase_reps: 'trending-up', increase_sets: 'add', increase_weight: 'barbell' };

export default function OverloadNudge({ exerciseName }) {
  const s = useThemedStyles(makeStyles);
  const { settings } = useSettings();
  const sessions = useDbQuery(() => getExerciseSessions(exerciseName, 3), [exerciseName], []);
  const sugg = overload.getOverloadSuggestion(sessions || [], { unit: settings.unit || 'kg' });
  if (!sugg || sugg.action === 'maintain') return null;

  return (
    <View style={s.wrap}>
      <Icon name={ICON[sugg.action] || 'trending-up'} size={14} color="#C9A84C" style={{ marginTop: 1 }} />
      <Text style={s.text}>{sugg.reason}</Text>
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', gap: space(2), backgroundColor: '#C9A84C18', borderColor: '#C9A84C44', borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space(3), paddingVertical: space(2), marginBottom: space(3) },
  text: { flex: 1, color: colors.textPrimary, fontFamily: fonts.sans, fontSize: 12, lineHeight: 17 },
});
