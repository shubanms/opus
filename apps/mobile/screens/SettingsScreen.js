import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, Switch, Modal } from 'react-native';
import Constants from 'expo-constants';
import { dateKey, units } from '@opus/core';
import { Screen, H1, H2, Label, Body, Mono, Wordmark } from '../ui';
import { radius, space, fonts } from '../theme';
import { useColors, useThemedStyles } from '../native/ThemeProvider';
import Card from '../components/Card';
import PressScale from '../components/PressScale';
import Segmented from '../components/Segmented';
import { GoldButton, SecondaryButton } from '../components/Button';
import EquipmentModal from '../components/settings/EquipmentModal';
import { enableNotifications, testNotification, scheduleDailyReminder } from '../native/notifications';
import { wipeAllData, logBodyStat, currentBodyweight } from '../native/db';
import { exportJson, exportCsv, importJson } from '../native/dataExport';
import { previewSounds, playCue } from '../native/sound';
import { useSettings } from '../native/settings';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

const NOTIF_TYPES = [
  { key: 'prCelebration', label: 'PR celebrations' },
  { key: 'streakRisk', label: 'Streak at risk' },
  { key: 'gymNudge', label: 'Daily gym reminder' },
  { key: 'weeklySummary', label: 'Weekly summary' },
  { key: 'staleRoutine', label: 'Switch up a stale routine' },
];

function Row({ label, value, onValueChange }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.row}>
      <Body style={{ color: colors.textPrimary, fontFamily: fonts.sansMedium }}>{label}</Body>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.ivory, true: colors.gold }} thumbColor={colors.chalk} />
    </View>
  );
}

function NumberField({ label, value, onChange, suffix }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
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

export default function SettingsScreen({ navigation }) {
  const colors = useColors();
  const s = useThemedStyles(makeStyles);
  const { settings, update } = useSettings();
  const [notif, setNotif] = useState(settings.notifEnabled);
  const [name, setName] = useState(settings.name);
  const [bw, setBw] = useState(() => { const w = currentBodyweight(); return w != null ? String(Math.round(units.toDisplay(w, settings.unit || 'kg') * 10) / 10) : ''; });
  const [resetOpen, setResetOpen] = useState(false);
  const [equipOpen, setEquipOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const unit = settings.unit || 'kg';
  const currentYear = new Date().getFullYear();

  const onEnableNotif = async () => {
    try {
      const granted = await enableNotifications();
      setNotif(granted);
      update('notifEnabled', granted);
      if (granted) { await scheduleDailyReminder(Number(settings.reminderHour) || 18, 0); Alert.alert('Notifications on', `Daily reminder scheduled for ${settings.reminderHour ?? 18}:00.`); }
      else Alert.alert('Not granted', 'Enable notifications for OPUS in Android settings.');
    } catch (e) { Alert.alert('Error', String(e?.message || e)); }
  };
  const saveBodyweight = () => {
    const n = parseFloat(bw);
    if (n > 0) { try { logBodyStat({ date: dateKey.todayKey(), weight: units.toKg(n, unit) }); } catch {} }
  };
  const onExport = async (fn, kind) => {
    const res = await fn();
    if (!res.ok && res.reason !== 'sharing-unavailable') Alert.alert('Export failed', `Could not export ${kind}.`);
  };
  const onImport = () => {
    Alert.alert('Import backup?', 'This replaces all current training data with the backup. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Choose file',
        onPress: async () => {
          const res = await importJson();
          if (res.ok) Alert.alert('Imported', 'Your backup was restored.');
          else if (res.reason === 'not-opus') Alert.alert('Wrong file', "That doesn't look like an OPUS backup.");
          else if (res.reason !== 'cancelled') Alert.alert('Import failed', 'Could not read that backup.');
        },
      },
    ]);
  };
  const onTestNotif = async () => {
    try {
      const res = await testNotification();
      if (res?.ok) Alert.alert('Sent', 'Check your notification shade — a test notification just fired.');
      else Alert.alert('Notifications off', 'Allow notifications for OPUS in Android settings, then try again.');
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
        <Label style={{ marginTop: space(4) }}>Theme</Label>
        <View style={{ marginTop: space(2) }}>
          <Segmented
            options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]}
            value={settings.theme || 'system'}
            onChange={(v) => update('theme', v)}
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
        {/* Bodyweight — stored in bodyStats (kg), like the web */}
        <View style={s.numRow}>
          <Body style={{ color: colors.textPrimary, fontFamily: fonts.sansMedium }}>Bodyweight</Body>
          <View style={s.numInputWrap}>
            <TextInput value={bw} onChangeText={setBw} onBlur={saveBodyweight} keyboardType="decimal-pad" style={s.numInput} placeholderTextColor={colors.ash} placeholder="—" />
            <Text style={s.numSuffix}>{units.unitLabel(unit)}</Text>
          </View>
        </View>
        <NumberField label="Height" value={settings.height || ''} onChange={(v) => update('height', Number(v) || 0)} suffix="cm" />
        <View style={s.numRow}>
          <Body style={{ color: colors.textPrimary, fontFamily: fonts.sansMedium }}>Age</Body>
          <View style={s.numInputWrap}>
            <TextInput
              value={settings.birthYear ? String(currentYear - settings.birthYear) : ''}
              onChangeText={(v) => { const age = Number(v); update('birthYear', age > 0 ? currentYear - age : 0); }}
              keyboardType="number-pad"
              style={s.numInput}
              placeholder="—"
              placeholderTextColor={colors.ash}
            />
          </View>
        </View>
        <Label style={{ marginTop: space(3) }}>Sex</Label>
        <View style={{ marginTop: space(2) }}>
          <Segmented
            options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]}
            value={settings.sex || ''}
            onChange={(v) => update('sex', v)}
          />
        </View>
        <NumberField label="Barbell weight" value={settings.barWeight} onChange={(v) => update('barWeight', Number(v) || 20)} suffix="kg" />
        <NumberField label="Daily step goal" value={settings.stepGoal} onChange={(v) => update('stepGoal', Number(v) || 0)} />
        <NumberField label="Daily water goal" value={settings.waterGoal} onChange={(v) => update('waterGoal', Number(v) || 0)} suffix="glasses" />
        <View style={{ marginTop: space(3) }}>
          <SecondaryButton label="Equipment & plates" icon="barbell" onPress={() => setEquipOpen(true)} />
        </View>
      </Card>

      <Card>
        <Label>Notifications</Label>
        <Body style={{ marginVertical: space(2) }}>{notif ? 'Enabled · reminders active.' : 'Workout reminders and PR celebrations.'}</Body>
        <GoldButton label={notif ? 'Re-schedule reminder' : 'Enable notifications'} icon="notifications" onPress={onEnableNotif} />
        {notif && (
          <>
            <View style={{ marginTop: space(3) }}>
              {NOTIF_TYPES.map((t) => (
                <Row key={t.key} label={t.label} value={settings[t.key]} onValueChange={(v) => update(t.key, v)} />
              ))}
            </View>
            <NumberField label="Daily reminder hour" value={settings.reminderHour} onChange={(v) => update('reminderHour', Math.max(0, Math.min(23, Number(v) || 0)))} suffix="h" />
            <View style={s.numRow}>
              <Body style={{ color: colors.textPrimary, fontFamily: fonts.sansMedium }}>Quiet hours</Body>
              <View style={s.numInputWrap}>
                <TextInput value={String(settings.dndStart ?? 22)} onChangeText={(v) => update('dndStart', Math.max(0, Math.min(23, Number(v) || 0)))} keyboardType="number-pad" style={s.numInput} />
                <Text style={s.numSuffix}>→</Text>
                <TextInput value={String(settings.dndEnd ?? 7)} onChangeText={(v) => update('dndEnd', Math.max(0, Math.min(23, Number(v) || 0)))} keyboardType="number-pad" style={s.numInput} />
              </View>
            </View>
          </>
        )}
        <View style={{ height: space(2) }} />
        <SecondaryButton label="Test notification" icon="paper-plane" onPress={onTestNotif} />
      </Card>

      <Card>
        <Label>Feel</Label>
        <View style={{ marginTop: space(2) }}>
          <Row label="Sound effects" value={settings.sound} onValueChange={(v) => update('sound', v)} />
          <Row label="Animations & haptics" value={settings.effects} onValueChange={(v) => update('effects', v)} />
          <Row label="Opening theme music" value={settings.sound && settings.themeOnOpen} onValueChange={(v) => update('themeOnOpen', v)} />
        </View>
        <View style={{ marginTop: space(2), gap: space(2) }}>
          <SecondaryButton label="Preview sounds" icon="musical-notes" onPress={() => previewSounds()} />
          <SecondaryButton label="Preview theme intro" icon="sparkles" onPress={() => playCue('themeOpen', { force: true })} />
          <SecondaryButton label="Replay walkthrough" icon="book" onPress={() => { update('tourSeen', false); navigation?.navigate('Home'); }} />
          <SecondaryButton label="Show tips again" icon="bulb" onPress={() => { update('coachMarksSeen', {}); Alert.alert('Tips reset', 'Tips will show again as you browse.'); }} />
        </View>
      </Card>

      {/* Data */}
      <Card>
        <Label>Data</Label>
        <Body style={{ marginVertical: space(2) }}>Back up everything to a file you can save or move to a new phone.</Body>
        <GoldButton label="Export backup (JSON)" icon="share" onPress={() => onExport(exportJson, 'backup')} />
        <View style={{ height: space(2) }} />
        <SecondaryButton label="Import backup" icon="add" onPress={onImport} />
        <View style={{ height: space(2) }} />
        <SecondaryButton label="Export sets (CSV)" icon="list" onPress={() => onExport(exportCsv, 'CSV')} />
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
          <Text style={s.aboutTag}> v{APP_VERSION}</Text>
        </View>
      </Card>

      <EquipmentModal visible={equipOpen} onClose={() => setEquipOpen(false)} />

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

const makeStyles = (colors) => StyleSheet.create({
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
