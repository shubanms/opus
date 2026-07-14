import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Switch, Modal } from 'react-native';
import { dateKey } from '@opus/core';
import { Screen, H1, H2, Label, Body, Mono, Wordmark } from '../ui';
import { colors, radius, space, fonts } from '../theme';
import Card from '../components/Card';
import PressScale from '../components/PressScale';
import { GoldButton, SecondaryButton } from '../components/Button';
import { enableNotifications, testNotification, scheduleDailyReminder } from '../native/notifications';
import { connectAndReadSteps, healthAvailability } from '../native/healthConnect';
import { setSteps, wipeAllData } from '../native/db';
import { previewSounds } from '../native/sound';
import { useSettings } from '../native/settings';

function Row({ label, value, onValueChange }) {
  return (
    <View style={s.row}>
      <Body style={{ color: colors.textPrimary, fontFamily: fonts.sansMedium }}>{label}</Body>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.ivory, true: colors.gold }} thumbColor={colors.chalk} />
    </View>
  );
}

// Segmented control (pill row). options = [{value,label}].
function Segmented({ options, value, onChange }) {
  return (
    <View style={s.seg}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <PressScale key={o.value} sound="tap" onPress={() => onChange(o.value)} style={[s.segItem, active && s.segActive]}>
            <Text style={[s.segText, active && s.segTextActive]}>{o.label}</Text>
          </PressScale>
        );
      })}
    </View>
  );
}

function NumberField({ label, value, onChange, suffix }) {
  return (
    <View style={s.numRow}>
      <Body style={{ color: colors.textPrimary, fontFamily: fonts.sansMedium }}>{label}</Body>
      <View style={s.numInputWrap}>
        <TextInput
          value={String(value ?? '')}
          onChangeText={onChange}
          keyboardType="number-pad"
          style={s.numInput}
          placeholderTextColor={colors.ash}
        />
        {suffix ? <Text style={s.numSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { settings, update } = useSettings();
  const [notif, setNotif] = useState(settings.notifDaily);
  const [steps, setStepsState] = useState(null);
  const [name, setName] = useState(settings.name);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirm, setConfirm] = useState('');

  const onEnableNotif = async () => {
    try {
      const granted = await enableNotifications();
      setNotif(granted);
      update('notifDaily', granted);
      if (granted) { await scheduleDailyReminder(18, 0); Alert.alert('Notifications on', 'Daily 6pm reminder scheduled.'); }
      else Alert.alert('Not granted', 'Enable notifications for OPUS in Android settings.');
    } catch (e) { Alert.alert('Error', String(e?.message || e)); }
  };
  const onTestNotif = async () => { try { await testNotification(); } catch (e) { Alert.alert('Error', String(e?.message || e)); } };
  const onConnectHealth = async () => {
    try {
      const avail = await healthAvailability();
      if (avail === 'NotInstalled') { Alert.alert('Health Connect', 'Install Health Connect from the Play Store, then retry.'); return; }
      if (avail !== 'Available') { Alert.alert('Health Connect', 'Not supported on this device.'); return; }
      const res = await connectAndReadSteps();
      if (res.ok) { setStepsState(res.steps); try { setSteps(dateKey.todayKey(), res.steps); } catch {} Alert.alert('Imported', `${res.steps.toLocaleString()} steps today.`); }
      else Alert.alert('Health Connect', 'Could not read steps.');
    } catch (e) { Alert.alert('Error', String(e?.message || e)); }
  };

  const doReset = () => {
    if (confirm !== 'DELETE') return;
    try { wipeAllData(); } catch {}
    setResetOpen(false);
    setConfirm('');
    Alert.alert('Data cleared', 'All workouts, records and progress were reset.');
  };

  return (
    <Screen>
      <H1>Settings</H1>

      {/* Units + theme */}
      <Card>
        <Label>Units</Label>
        <View style={{ marginTop: space(2) }}>
          <Segmented
            options={[{ value: 'kg', label: 'Kilograms' }, { value: 'lbs', label: 'Pounds' }]}
            value={settings.unit || 'kg'}
            onChange={(v) => update('unit', v)}
          />
        </View>
      </Card>

      {/* Profile */}
      <Card>
        <Label>Profile</Label>
        <View style={s.numRow}>
          <Body style={{ color: colors.textPrimary, fontFamily: fonts.sansMedium }}>Name</Body>
          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={() => update('name', name.trim() || 'Athlete')}
            style={[s.numInput, { minWidth: 140, textAlign: 'right' }]}
            placeholder="Athlete"
            placeholderTextColor={colors.ash}
          />
        </View>
        <NumberField label="Barbell weight" value={settings.barWeight} onChange={(v) => update('barWeight', Number(v) || 20)} suffix="kg" />
        <NumberField label="Daily step goal" value={settings.stepGoal} onChange={(v) => update('stepGoal', Number(v) || 0)} />
        <NumberField label="Daily water goal" value={settings.waterGoal} onChange={(v) => update('waterGoal', Number(v) || 0)} suffix="glasses" />
      </Card>

      <Card>
        <Label>Notifications</Label>
        <Body style={{ marginVertical: space(2) }}>{notif ? 'Enabled · daily reminder set.' : 'Workout reminders and PR celebrations.'}</Body>
        <GoldButton label={notif ? 'Re-schedule reminder' : 'Enable notifications'} icon="notifications" onPress={onEnableNotif} />
        <View style={{ height: space(2) }} />
        <SecondaryButton label="Test notification" icon="paper-plane" onPress={onTestNotif} />
      </Card>

      <Card>
        <Label>Feel</Label>
        <View style={{ marginTop: space(2) }}>
          <Row label="Sound effects" value={settings.sound} onValueChange={(v) => update('sound', v)} />
          <Row label="Animations & haptics" value={settings.effects} onValueChange={(v) => update('effects', v)} />
        </View>
        <View style={{ marginTop: space(2) }}>
          <SecondaryButton label="Preview sounds" icon="musical-notes" onPress={() => previewSounds()} />
        </View>
      </Card>

      <Card>
        <Label>Health Connect</Label>
        <Body style={{ marginVertical: space(2) }}>{steps != null ? `${steps.toLocaleString()} steps imported today.` : 'Auto-import steps, weight and sleep from Android Health Connect.'}</Body>
        <GoldButton label="Connect & import today's steps" icon="walk" onPress={onConnectHealth} />
      </Card>

      {/* Danger zone */}
      <Card>
        <Label style={{ color: colors.ember }}>Danger zone</Label>
        <Body style={{ marginVertical: space(2) }}>Permanently delete all workouts, records and progress. The exercise library is kept.</Body>
        <SecondaryButton label="Reset all data" icon="trash" tone="neutral" onPress={() => setResetOpen(true)} />
      </Card>

      <Card>
        <Label>About</Label>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: space(2) }}>
          <Wordmark size={20} style={{ color: colors.textPrimary }} />
          <Text style={s.aboutTag}> · native</Text>
        </View>
        <Body style={{ marginTop: 4 }}>React Native + Expo build. Shared logic via @opus/core.</Body>
      </Card>

      {/* Reset confirm modal */}
      <Modal visible={resetOpen} transparent animationType="fade" onRequestClose={() => setResetOpen(false)}>
        <View style={s.backdrop}>
          <View style={s.confirmCard}>
            <H2>Reset everything?</H2>
            <Body style={{ marginTop: space(2) }}>Type DELETE to confirm. This cannot be undone.</Body>
            <TextInput
              value={confirm}
              onChangeText={setConfirm}
              autoCapitalize="characters"
              placeholder="DELETE"
              placeholderTextColor={colors.ash}
              style={s.confirmInput}
            />
            <View style={{ flexDirection: 'row', gap: space(3), marginTop: space(3) }}>
              <SecondaryButton label="Cancel" onPress={() => { setResetOpen(false); setConfirm(''); }} style={{ flex: 1 }} />
              <PressScale onPress={doReset} disabled={confirm !== 'DELETE'} style={[s.deleteBtn, confirm !== 'DELETE' && { opacity: 0.4 }]}>
                <Text style={s.deleteText}>Delete</Text>
              </PressScale>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space(2) },
  aboutTag: { color: colors.textSecondary, fontFamily: fonts.sans, fontSize: 14 },
  seg: { flexDirection: 'row', backgroundColor: colors.ivory, borderRadius: radius.lg, padding: 3 },
  segItem: { flex: 1, paddingVertical: space(2.5), borderRadius: radius.md, alignItems: 'center' },
  segActive: { backgroundColor: colors.gold },
  segText: { color: colors.textSecondary, fontFamily: fonts.sansMedium, fontSize: 13 },
  segTextActive: { color: colors.obsidian },
  numRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space(2.5), borderTopColor: colors.ivory, borderTopWidth: StyleSheet.hairlineWidth },
  numInputWrap: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  numInput: { color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 15, paddingVertical: space(1), minWidth: 60, textAlign: 'right' },
  numSuffix: { color: colors.ash, fontFamily: fonts.sans, fontSize: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(17,16,16,0.72)', alignItems: 'center', justifyContent: 'center', padding: space(6) },
  confirmCard: { backgroundColor: colors.chalk, borderRadius: radius.xl, padding: space(5), width: '100%' },
  confirmInput: { backgroundColor: colors.ivory, borderRadius: radius.md, paddingHorizontal: space(4), paddingVertical: space(3), marginTop: space(3), color: colors.textPrimary, fontFamily: fonts.mono, fontSize: 15 },
  deleteBtn: { flex: 1, backgroundColor: colors.ember, borderRadius: radius.lg, paddingVertical: space(3.5), alignItems: 'center' },
  deleteText: { color: colors.textInverse, fontFamily: fonts.sansSemi, fontSize: 15 },
});
