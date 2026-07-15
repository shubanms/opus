// Gold CTA + neutral secondary buttons — the PWA's rounded-2xl gold-on-obsidian
// primary and ivory neutral. Built on PressScale so they animate + buzz + click.
import { View, Text, StyleSheet } from 'react-native';
import Icon from './Icon';
import PressScale from './PressScale';
import { radius, space, fonts } from '../theme';
import { useColors, useThemedStyles } from '../native/ThemeProvider';

export function GoldButton({ label, onPress, icon, sound = 'tap', style, disabled }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  return (
    <PressScale onPress={onPress} sound={sound} disabled={disabled} style={[s.btn, s.gold, disabled && s.disabled, style]}>
      <View style={s.row}>
        {icon ? <Icon name={icon} size={18} color={colors.obsidian} style={{ marginRight: 8 }} /> : null}
        <Text style={[s.text, s.goldText]}>{label}</Text>
      </View>
    </PressScale>
  );
}

export function SecondaryButton({ label, onPress, icon, sound = 'tap', style, tone = 'neutral' }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const toneStyle = tone === 'sage' ? s.sage : s.neutral;
  const textTone = tone === 'sage' ? s.sageText : s.neutralText;
  return (
    <PressScale onPress={onPress} sound={sound} style={[s.btn, toneStyle, style]}>
      <View style={s.row}>
        {icon ? <Icon name={icon} size={16} color={tone === 'sage' ? colors.textInverse : colors.textPrimary} style={{ marginRight: 6 }} /> : null}
        <Text style={[s.text, textTone]}>{label}</Text>
      </View>
    </PressScale>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  btn: { borderRadius: radius.lg, paddingVertical: space(3.5), paddingHorizontal: space(4), alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  gold: { backgroundColor: colors.gold },
  neutral: { backgroundColor: colors.ivory },
  sage: { backgroundColor: colors.sage },
  disabled: { opacity: 0.5 },
  text: { fontFamily: fonts.sansSemi, fontSize: 15 },
  goldText: { color: colors.obsidian },
  neutralText: { color: colors.textPrimary },
  sageText: { color: colors.textInverse },
});
