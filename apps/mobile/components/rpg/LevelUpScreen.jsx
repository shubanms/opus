// Full-screen level-up celebration shown after a workout that crossed a level.
// Ports the web LevelUpScreen: giant level number, new title, particle burst,
// tagline, tap/auto-dismiss. Sound + haptic gated by settings.
import { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { rpg } from '@opus/core';
import { Wordmark } from '../../ui';
import { space, fonts } from '../../theme';
import { useColors, useThemedStyles } from '../../native/ThemeProvider';
import { motionOn } from '../../native/settings';
import { playCue } from '../../native/sound';
import { success as hSuccess } from '../../native/haptics';
import Particles from '../fx/Particles';
import TitleBadge from './TitleBadge';

export default function LevelUpScreen({ visible, level, onClose }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!visible) return;
    hSuccess();
    playCue('level');
    if (motionOn()) {
      scale.setValue(0.6);
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 10 }).start();
    } else {
      scale.setValue(1);
    }
    const t = setTimeout(() => onClose?.(), 4200);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        {visible && <Particles key={`lvl-${level}`} origin={{ x: 180, y: 300 }} spread={280} />}
        <Text style={s.eyebrow}>LEVEL UP</Text>
        <Animated.Text style={[s.level, { transform: [{ scale }] }]}>{level}</Animated.Text>
        <TitleBadge title={rpg.getTitle(level)} />
        <Text style={s.tagline}>Build your masterpiece.</Text>
        <View style={{ marginTop: space(8), opacity: 0.6 }}>
          <Wordmark size={20} style={{ color: colors.textInverse }} />
        </View>
        <Text style={s.dismiss}>tap to continue</Text>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.94)', alignItems: 'center', justifyContent: 'center', padding: space(6) },
  eyebrow: { color: colors.gold, fontFamily: fonts.sansSemi, fontSize: 13, letterSpacing: 4, textTransform: 'uppercase' },
  level: { color: colors.gold, fontFamily: fonts.display, fontSize: 140, lineHeight: 150 },
  tagline: { color: colors.textSecondary, fontFamily: fonts.displaySemi, fontStyle: 'italic', fontSize: 22, marginTop: space(4) },
  dismiss: { color: colors.ash, fontFamily: fonts.sans, fontSize: 12, marginTop: space(4) },
});
