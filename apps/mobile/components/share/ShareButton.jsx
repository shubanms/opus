// Opens the share composer for a given card. Self-contained: owns the sheet's
// open state so callers just drop <ShareButton cardKey="profile" data={...} />.
// `variant="pill"` renders a full-width secondary-style button; `variant="chip"`
// (default) is a compact inline icon+label for card corners.
import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from '../Icon';
import { radius, space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import PressScale from '../PressScale';
import ShareSheet from './ShareSheet';

export default function ShareButton({ cardKey = 'workout', data, filename = 'opus-card.png', label = 'Share', variant = 'chip', style }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const disabled = !data;

  return (
    <>
      <PressScale
        sound="tap"
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[variant === 'pill' ? s.pill : s.chip, disabled && { opacity: 0.4 }, style]}
      >
        <Icon name="share" size={variant === 'pill' ? 18 : 15} color={variant === 'pill' ? colors.textPrimary : colors.gold} />
        {!!label && <Text style={[variant === 'pill' ? s.pillText : s.chipText, { marginLeft: space(2) }]}>{label}</Text>}
      </PressScale>
      <ShareSheet visible={open} onClose={() => setOpen(false)} cardKey={cardKey} data={data} filename={filename} />
    </>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(3), paddingVertical: space(2), borderRadius: radius.full, backgroundColor: colors.ivory },
  chipText: { color: colors.gold, fontFamily: fonts.sansSemi, fontSize: 13 },
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: space(3.5), borderRadius: radius.lg, borderWidth: 1, borderColor: colors.ivory, backgroundColor: colors.chalk },
  pillText: { color: colors.textPrimary, fontFamily: fonts.sansSemi, fontSize: 15 },
});
