// Shared segmented pill control (options = [{value,label}]). Lifted from the
// local copy in SettingsScreen so Progress tabs and Settings share one control.
import { View, Text, StyleSheet } from 'react-native';
import { radius, space, fonts } from '../theme';
import { useThemedStyles } from '../native/ThemeProvider';
import PressScale from './PressScale';

export default function Segmented({ options, value, onChange, style }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={[s.seg, style]}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <PressScale key={o.value} sound="tap" onPress={() => onChange(o.value)} style={[s.item, active && s.active]}>
            <Text style={[s.text, active && s.textActive]} numberOfLines={1}>{o.label}</Text>
          </PressScale>
        );
      })}
    </View>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  seg: { flexDirection: 'row', backgroundColor: colors.ivory, borderRadius: radius.lg, padding: 3 },
  item: { flex: 1, paddingVertical: space(2.5), borderRadius: radius.md, alignItems: 'center' },
  active: { backgroundColor: colors.gold },
  text: { color: colors.textSecondary, fontFamily: fonts.sansMedium, fontSize: 13 },
  textActive: { color: colors.obsidian },
});
