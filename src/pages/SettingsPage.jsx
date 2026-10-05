import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Github, Trash2, Info, Bell, User, Database, Download, Upload, Sparkles, FileText, Printer, ShieldCheck, CalendarPlus, ShieldAlert, Check, Share2 } from 'lucide-react';
import ResetDataModal from '../components/settings/ResetDataModal.jsx';
import EquipmentModal from '../components/settings/EquipmentModal.jsx';
import BackButton from '../components/layout/BackButton.jsx';
import { useNotifications } from '../hooks/useNotifications.js';
import { useRPG } from '../hooks/useRPG.js';
import { useCurrentBodyweight } from '../hooks/useProgress.js';
import useUserStore from '../store/userStore.js';
import useSettingsStore from '../store/settingsStore.js';
import useUIStore from '../store/uiStore.js';
import { NOTIF_TYPES, requestPermission, showNotification } from '../utils/notifications.js';
import { playChime } from '../utils/sound.js';
import { exportData, importData, exportSetsCsv, exportPdf, exportPlanIcs } from '../utils/dataActions.js';
import { backupLabel } from '../utils/backup.js';
import { useBackupStatus, useRunBackup, useShareBackup } from '../hooks/useBackup.js';
import { logBodyStat } from '../utils/healthActions.js';
import { toDisplay, unitLabel } from '../utils/units.js';
import { todayKey } from '../utils/dateKey.js';
import { ageFromBirthYear, changedFrom, parseAge, parseBar, parseBodyweight, parseHeight } from '../utils/profileFields.js';
import { describePersistence, persistenceState, PERSIST_UNSUPPORTED } from '../utils/storage.js';

const persistTone = {
  good: 'var(--color-sage)',
  warn: 'var(--color-ember)',
  neutral: 'var(--color-ash)',
};

const SEXES = ['Male', 'Female', 'Other'];

/** Rest between sets when a routine does not set its own. */
const REST_CHOICES = [
  { s: 60, label: '60s' },
  { s: 90, label: '90s' },
  { s: 120, label: '2 min' },
  { s: 180, label: '3 min' },
];

// A labelled switch with a phone-sized target. It was a bare 40×24 button with
// no name — a screen reader announced "button, pressed" with no hint of what —
// and smaller than a fingertip. The negative margin keeps the 44 px hit area
// from making every row taller.
function Switch({ on, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!on && !disabled}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="-my-2.5 -mr-2 flex h-11 w-14 shrink-0 items-center justify-center"
    >
      {/* Off is a tinted track, not the card colour: in the light theme the
          old translucent-white track vanished into the white card. */}
      <span
        className="relative h-6 w-10 rounded-full"
        style={{
          background: on && !disabled ? 'var(--color-gold)' : 'color-mix(in srgb, var(--color-ash) 38%, transparent)',
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full"
          style={{ background: 'var(--color-text-inverse)', left: on ? 18 : 2, transition: 'left 160ms var(--opus-ease-out)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
        />
      </span>
    </button>
  );
}

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'experience', label: 'Experience' },
  { id: 'data', label: 'Data' },
  { id: 'about', label: 'About' },
  { id: 'danger', label: 'Reset' },
];

function Row({ label, htmlFor, children }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>{label}</label>
      ) : (
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
      )}
      {children}
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Put a field back to what is saved, after a value that could not be used.
function restore(input, value) {
  input.value = value ?? '';
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [reset, setReset] = useState(false);
  const [equip, setEquip] = useState(false);
  const [persist, setPersist] = useState(PERSIST_UNSUPPORTED);
  const [icsHour, setIcsHour] = useState(18);
  const backup = useBackupStatus();
  const runBackup = useRunBackup();
  const sendBackup = useShareBackup();
  const autoBackup = useSettingsStore((s) => s.autoBackup);
  const setAutoBackup = useSettingsStore((s) => s.setAutoBackup);

  useEffect(() => {
    let alive = true;
    persistenceState().then((s) => { if (alive) setPersist(s); });
    return () => { alive = false; };
  }, []);

  // `/settings#profile` (from the Profile card) opens at that section.
  useEffect(() => {
    const id = hash?.slice(1);
    if (!id) return;
    const el = document.getElementById(`settings-${id}`);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
  }, [hash]);

  const storageInfo = describePersistence(persist);
  const { settings, perm, update, toggleType, setMaster } = useNotifications();
  const { profile } = useRPG();

  const updateProfile = useUserStore((s) => s.updateProfile);
  const barWeight = useSettingsStore((s) => s.barWeight);
  const setBarWeight = useSettingsStore((s) => s.setBarWeight);
  const unit = useSettingsStore((s) => s.unit);
  const setUnit = useSettingsStore((s) => s.setUnit);
  const effects = useSettingsStore((s) => s.effects);
  const setEffects = useSettingsStore((s) => s.setEffects);
  const sound = useSettingsStore((s) => s.sound);
  const setSound = useSettingsStore((s) => s.setSound);
  const themeOnOpen = useSettingsStore((s) => s.themeOnOpen);
  const setThemeOnOpen = useSettingsStore((s) => s.setThemeOnOpen);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setTourSeen = useSettingsStore((s) => s.setTourSeen);
  const resetCoachMarks = useSettingsStore((s) => s.resetCoachMarks);
  const stepGoal = useSettingsStore((s) => s.stepGoal);
  const setStepGoal = useSettingsStore((s) => s.setStepGoal);
  const waterGoal = useSettingsStore((s) => s.waterGoal);
  const setWaterGoal = useSettingsStore((s) => s.setWaterGoal);
  const restDuration = useSettingsStore((s) => s.restDuration);
  const setRestDuration = useSettingsStore((s) => s.setRestDuration);
  const bodyweight = useCurrentBodyweight();
  const fileRef = useRef();

  async function handleCalendar() {
    const ok = await exportPlanIcs(icsHour);
    // No plan means no file. Saying so beats downloading an empty calendar and
    // letting someone work out for themselves why nothing appeared.
    if (!ok) {
      useUIStore.getState().showToast('Assign routines to days first — Routines → edit a routine', { type: 'error' });
    }
  }
  const age = ageFromBirthYear(profile?.birthYear);
  const shownWeight = bodyweight != null ? toDisplay(bodyweight, unit) : '';
  const systemOn = settings.enabled && perm === 'granted';
  const restIsCustom = !REST_CHOICES.some((c) => c.s === restDuration);

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importData(text);
      window.location.assign(import.meta.env.BASE_URL);
    } catch {
      useUIStore.getState().showToast('Could not import this file.', { type: 'error' });
    }
  }

  // Bodyweight logs a body-stat row, so it must only do that for a real,
  // changed value. It used to log on every blur, and after a kg→lbs switch the
  // field still held the kg number under a "(lbs)" label — blurring it saved
  // 80 "lbs" as a 36 kg bodyweight.
  function saveBodyweight(e) {
    if (!changedFrom(e.target.value, shownWeight)) {
      restore(e.target, shownWeight);
      return;
    }
    const parsed = parseBodyweight(e.target.value, unit);
    if (!parsed.ok) {
      restore(e.target, shownWeight);
      return;
    }
    logBodyStat({ date: todayKey(), weight: parsed.value });
  }

  // Out-of-range values are clamped and shown clamped; unusable ones (a
  // negative age, letters) put the saved value back rather than saving junk.
  function saveHeight(e) {
    const parsed = parseHeight(e.target.value);
    if (!parsed.ok) {
      restore(e.target, profile?.height);
      return;
    }
    if (parsed.value !== (profile?.height ?? null)) updateProfile({ height: parsed.value });
    restore(e.target, parsed.value);
  }

  function saveAge(e) {
    const parsed = parseAge(e.target.value);
    if (!parsed.ok) {
      restore(e.target, age);
      return;
    }
    if (parsed.value !== (profile?.birthYear ?? null)) updateProfile({ birthYear: parsed.value });
    restore(e.target, ageFromBirthYear(parsed.value));
  }

  // A cleared field means "the usual bar" for the unit, never a 0 kg bar.
  function saveBar(e) {
    const parsed = parseBar(e.target.value, unit);
    if (!parsed.ok) {
      restore(e.target, toDisplay(barWeight, unit));
      return;
    }
    setBarWeight(parsed.value);
    restore(e.target, toDisplay(parsed.value, unit));
  }

  const inputCls = 'w-24 rounded-lg px-3 py-2 text-right font-mono text-sm outline-none';
  const inputStyle = { background: 'var(--color-ivory)', color: 'var(--color-text-primary)' };

  return (
    <div className="px-5 pb-8 pt-8">
      <BackButton fallback="/profile" className="mb-3" />

      <h1 className="mb-6 font-display text-4xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        Settings
      </h1>

      {/* Settings is a long single scroll — six sections deep to change your
          units. This is a table of contents, not a search box: with a fixed and
          known set of sections, jumping beats filtering. */}
      <nav className="mb-5 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide" aria-label="Jump to settings section">
        {SECTIONS.map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => document.getElementById(`settings-${sec.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="flex min-h-11 shrink-0 items-center rounded-full px-4 font-sans text-xs font-medium"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-secondary)' }}
          >
            {sec.label}
          </button>
        ))}
      </nav>

      {/* Profile */}
      <section id="settings-profile" className="glass mb-5 scroll-mt-4 rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
        <div className="mb-3 flex items-center gap-2">
          <User size={14} style={{ color: 'var(--color-ash)' }} />
          <span className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Profile
          </span>
        </div>
        {/* Units */}
        <div className="flex items-center justify-between py-1.5">
          <span className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>Units</span>
          <div className="flex overflow-hidden rounded-lg" style={{ background: 'var(--color-ivory)' }}>
            {['kg', 'lbs'].map((u) => (
              <button key={u} type="button" onClick={() => setUnit(u)} aria-pressed={unit === u} className="min-h-11 px-4 font-sans text-sm font-medium"
                style={{ background: unit === u ? 'var(--color-gold)' : 'transparent', color: unit === u ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}>
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* The profile fields are uncontrolled, so they wait for the profile:
            rendered empty before it loads, a blur would have saved the blank. */}
        {profile && (
          <>
            <Row label="Name" htmlFor="set-name">
              <input
                id="set-name"
                defaultValue={profile.name ?? ''}
                onBlur={(e) => { const v = e.target.value.trim(); if (v !== (profile.name ?? '')) updateProfile({ name: v }); }}
                placeholder="Athlete"
                className="w-40 rounded-lg px-3 py-2 text-right font-sans text-sm outline-none"
                style={inputStyle}
              />
            </Row>

            <Row label={`Bodyweight (${unitLabel(unit)})`} htmlFor="set-weight">
              <input
                id="set-weight"
                // Keyed on the unit as well as the value: the field must show
                // the number in the unit its label names.
                key={`${unit}-${bodyweight}`}
                defaultValue={shownWeight}
                onBlur={saveBodyweight}
                type="number" inputMode="decimal" placeholder="—" min="0"
                className={inputCls}
                style={inputStyle}
              />
            </Row>

            <Row label="Height (cm)" htmlFor="set-height">
              <input
                id="set-height"
                key={`h-${profile.height}`}
                defaultValue={profile.height ?? ''}
                onBlur={saveHeight}
                type="number" inputMode="decimal" placeholder="—" min="100" max="250"
                className={inputCls}
                style={inputStyle}
              />
            </Row>

            <Row label="Age" htmlFor="set-age">
              <input
                id="set-age"
                key={`a-${profile.birthYear}`}
                defaultValue={age}
                onBlur={saveAge}
                type="number" inputMode="numeric" placeholder="—" min="13" max="100"
                className={inputCls}
                style={inputStyle}
              />
            </Row>

            <Row label="Sex">
              {/* Tap the selected one again to clear it. */}
              <div className="-my-1 flex gap-1">
                {SEXES.map((s) => (
                  <button key={s} type="button" onClick={() => updateProfile({ sex: profile.sex === s ? null : s })} aria-pressed={profile.sex === s} aria-label={s}
                    className="h-11 w-11 rounded-lg font-sans text-xs"
                    style={{ background: profile.sex === s ? 'var(--color-gold)' : 'var(--color-ivory)', color: profile.sex === s ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}>
                    {s[0]}
                  </button>
                ))}
              </div>
            </Row>
          </>
        )}

        <Row label={`Barbell weight (${unitLabel(unit)})`} htmlFor="set-bar">
          <input
            id="set-bar"
            key={`${unit}-${barWeight}`}
            defaultValue={toDisplay(barWeight, unit)}
            onBlur={saveBar}
            type="number" inputMode="decimal" min="0"
            className={inputCls}
            style={inputStyle}
          />
        </Row>

        <button
          type="button"
          onClick={() => setEquip(true)}
          className="mt-1 flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2.5"
          style={{ background: 'var(--color-ivory)' }}
        >
          <span className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>Equipment &amp; plates</span>
          <span className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>Gym / Home →</span>
        </button>

        {/* Rest could only be changed from inside a running workout. */}
        <div className="pt-3">
          <span className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>Default rest</span>
          <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Between sets, unless a routine sets its own.
          </p>
          <div className="mt-2 flex gap-1.5">
            {REST_CHOICES.map((c) => (
              <button
                key={c.s}
                type="button"
                onClick={() => { setRestDuration(c.s); playChime('tick'); }}
                aria-pressed={restDuration === c.s}
                className="min-h-11 flex-1 rounded-lg font-mono text-xs font-medium"
                style={{ background: restDuration === c.s ? 'var(--color-gold)' : 'var(--color-ivory)', color: restDuration === c.s ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}
              >
                {c.label}
              </button>
            ))}
            {restIsCustom && (
              <span
                className="flex min-h-11 flex-1 items-center justify-center rounded-lg font-mono text-xs font-medium"
                style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
                title="Set during a workout"
              >
                {restDuration}s
              </span>
            )}
          </div>
        </div>

        <Row label="Daily step goal" htmlFor="set-steps">
          <input
            id="set-steps"
            key={stepGoal}
            defaultValue={stepGoal}
            onBlur={(e) => setStepGoal(Math.max(0, Number.parseInt(e.target.value) || 0))}
            type="number" inputMode="numeric" min="0"
            className={inputCls}
            style={inputStyle}
          />
        </Row>

        <Row label="Daily water goal (glasses)" htmlFor="set-water">
          <input
            id="set-water"
            key={waterGoal}
            defaultValue={waterGoal}
            onBlur={(e) => setWaterGoal(Math.max(1, Number.parseInt(e.target.value) || 1))}
            type="number" inputMode="numeric" min="1"
            className={inputCls}
            style={inputStyle}
          />
        </Row>
      </section>

      {/* Notifications */}
      <section id="settings-notifications" className="glass mb-5 scroll-mt-4 rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
        <div className="mb-3 flex items-center gap-2">
          <Bell size={14} style={{ color: 'var(--color-ash)' }} />
          <span className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Notifications
          </span>
        </div>

        {/* In-app reminders fire for everyone, so everyone needs their
            switches. They were only shown once system notifications were on
            and granted — so the only way to silence a reminder was to grant a
            permission you might not want. */}
        <p className="font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Reminders</p>
        <p className="mb-1 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          A short note when you open OPUS — no permission needed.
        </p>
        {NOTIF_TYPES.filter((t) => t.inApp).map((t) => (
          <div key={t.key} className="flex items-center justify-between py-1.5">
            <span className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>{t.label}</span>
            <Switch on={!!settings[t.key]} onChange={() => toggleType(t.key)} label={t.label} />
          </div>
        ))}

        <div className="mt-2 flex items-center justify-between">
          <span className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>Quiet hours</span>
          <div className="flex items-center gap-2">
            <select
              aria-label="Quiet hours start"
              value={settings.dndStart}
              onChange={(e) => update({ dndStart: Number(e.target.value) })}
              className="min-h-9 rounded-lg px-2 py-1 font-mono text-xs outline-none"
              style={inputStyle}
            >
              {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
            <span className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>to</span>
            <select
              aria-label="Quiet hours end"
              value={settings.dndEnd}
              onChange={(e) => update({ dndEnd: Number(e.target.value) })}
              className="min-h-9 rounded-lg px-2 py-1 font-mono text-xs outline-none"
              style={inputStyle}
            >
              {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
            </select>
          </div>
        </div>

        <div className="my-3 h-px" style={{ background: 'var(--color-ivory)' }} />

        <div className="flex items-center justify-between py-1.5">
          <div className="min-w-0 pr-3">
            <p className="font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>System notifications</p>
            <p className="font-sans text-xs" style={{ color: perm === 'denied' ? 'var(--color-ember)' : 'var(--color-text-secondary)' }}>
              {perm === 'denied' ? 'Blocked in browser settings' : 'Records, and streak alerts while OPUS is closed'}
            </p>
          </div>
          <Switch on={systemOn} onChange={setMaster} disabled={perm === 'denied'} label="System notifications" />
        </div>

        {systemOn && NOTIF_TYPES.filter((t) => !t.inApp).map((t) => (
          <div key={t.key} className="flex items-center justify-between py-1.5">
            <span className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>{t.label}</span>
            <Switch on={!!settings[t.key]} onChange={() => toggleType(t.key)} label={t.label} />
          </div>
        ))}

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={async () => {
              const p = await requestPermission();
              if (p !== 'granted') {
                useUIStore.getState().showToast('Allow notifications in your browser/OS to test.', { type: 'info' });
                return;
              }
              try {
                await showNotification('OPUS', { body: "Test notification — you're all set." });
              } catch {
                useUIStore.getState().showToast("Couldn't send a notification — check OS settings.", { type: 'error' });
              }
            }}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-xs font-medium"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          >
            <Bell size={14} /> Test notification
          </button>
          <button
            type="button"
            onClick={() => { playChime('goal', { force: true }); setTimeout(() => playChime('anthem', { force: true }), 1000); }}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-xs font-medium"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          >
            <Sparkles size={14} /> Preview sounds
          </button>
        </div>
        <p className="mt-2 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          System notifications show while OPUS is open or installed; a static app can't push in the background.
        </p>
      </section>

      {/* Experience */}
      <section id="settings-experience" className="glass mb-5 scroll-mt-4 rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={14} style={{ color: 'var(--color-ash)' }} />
          <span className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Experience
          </span>
        </div>
        <Row label="Theme">
          <div className="flex overflow-hidden rounded-lg" style={{ background: 'var(--color-ivory)' }}>
            {['light', 'dark', 'system'].map((t) => (
              <button key={t} type="button" onClick={() => setTheme(t)} aria-pressed={theme === t} className="min-h-11 px-3 font-sans text-xs font-medium capitalize"
                style={{ background: theme === t ? 'var(--color-gold)' : 'transparent', color: theme === t ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}>
                {t}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Effects & haptics">
          <Switch on={effects} onChange={setEffects} label="Effects & haptics" />
        </Row>
        <Row label="Sound">
          <Switch on={sound} onChange={setSound} label="Sound" />
        </Row>
        <Row label="Opening theme music">
          <Switch on={themeOnOpen} onChange={setThemeOnOpen} disabled={!sound} label="Opening theme music" />
        </Row>
        <button
          type="button"
          onClick={() => { setTourSeen(false); navigate('/home'); }}
          className="mt-3 min-h-11 w-full rounded-xl py-2.5 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        >
          Replay walkthrough
        </button>
        <button
          type="button"
          onClick={() => { resetCoachMarks(); useUIStore.getState().showToast('Tips will show again as you browse.'); }}
          className="mt-2 min-h-11 w-full rounded-xl py-2.5 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        >
          Show tips again
        </button>
      </section>

      {/* Data */}
      <section id="settings-data" className="glass mb-5 scroll-mt-4 rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
        <div className="mb-3 flex items-center gap-2">
          <Database size={14} style={{ color: 'var(--color-ash)' }} />
          <span className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Data
          </span>
        </div>
        <p className="mb-3 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Back up everything to a file, or restore from one.
        </p>

        {/* Storage protection — IndexedDB is evictable unless the browser
            grants persistence, and this app has no server-side copy. */}
        <div
          className="mb-3 flex items-start gap-2 rounded-xl p-3"
          style={{ background: 'var(--color-ivory)' }}
        >
          <ShieldCheck
            size={15}
            className="mt-0.5 shrink-0"
            style={{ color: persistTone[storageInfo.tone] }}
          />
          <div>
            <p className="font-sans text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Storage: {storageInfo.label}
            </p>
            <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {storageInfo.detail}
            </p>
          </div>
        </div>
        {/* Backups first in the Data section, and stated in terms of what is at
            stake rather than what the button does. A browser wipe takes
            IndexedDB with it; a file in Downloads is the only thing left. */}
        <div className="mb-4 rounded-2xl p-3" style={{ background: 'var(--color-ivory)' }}>
          <div className="mb-2 flex items-center gap-2">
            <ShieldAlert size={14} style={{ color: 'var(--color-gold)' }} />
            <span className="font-sans text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {backupLabel(backup)}
            </span>
          </div>
          <button
            type="button"
            aria-pressed={!!autoBackup}
            onClick={() => setAutoBackup(!autoBackup)}
            className="flex min-h-11 w-full items-center gap-2.5"
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
              style={{ background: autoBackup ? 'var(--color-gold)' : 'var(--color-chalk)', border: autoBackup ? 'none' : '1px solid var(--color-ash)' }}
            >
              {autoBackup && <Check size={13} strokeWidth={3} style={{ color: 'var(--color-obsidian)' }} />}
            </span>
            <span className="text-left font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>
              Weekly backup to Downloads
            </span>
          </button>
          <p className="mt-0.5 pl-7 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Only writes a file when something has actually changed, so a quiet week adds nothing
            to your Downloads folder.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={async () => { await runBackup(); useUIStore.getState().showToast('Backup saved to Downloads', { type: 'success' }); }}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-sm font-medium"
              style={{ background: 'var(--color-chalk)', color: 'var(--color-text-primary)' }}
            >
              <Download size={15} /> Back up now
            </button>
            <button
              type="button"
              onClick={async () => { const how = await sendBackup(); useUIStore.getState().showToast(how === 'shared' ? 'Backup sent' : 'Backup saved to Downloads', { type: 'success' }); }}
              className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-sm font-medium"
              style={{ background: 'var(--color-chalk)', color: 'var(--color-text-primary)' }}
            >
              <Share2 size={15} /> Send a copy
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportData}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-semibold"
            style={{ background: 'var(--color-obsidian)', color: 'var(--color-text-inverse)' }}
          >
            <Download size={15} /> Export
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-medium"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          >
            <Upload size={15} /> Import
          </button>
          <input ref={fileRef} type="file" accept="application/json" onChange={handleImport} className="hidden" />
        </div>

        {/* Calendar export. The v5 research settled that this is the only
            reminder path with no platform gaps, no permission prompt and no
            server: a calendar already has a scheduler, already syncs across
            your devices, and already knows how to nag you. */}
        <p className="mb-2 mt-4 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Put your weekly plan in your calendar, with a reminder 30 minutes before:
        </p>
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="ics-hour">Session time</label>
          <select
            id="ics-hour"
            value={icsHour}
            onChange={(e) => setIcsHour(Number(e.target.value))}
            className="rounded-xl px-3 py-2.5 font-mono text-sm outline-none"
            style={inputStyle}
          >
            {Array.from({ length: 17 }, (_, i) => i + 5).map((h) => (
              <option key={h} value={h}>{`${String(h).padStart(2, '0')}:00`}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCalendar}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-sm font-medium"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          >
            <CalendarPlus size={15} /> Add to calendar
          </button>
        </div>

        <p className="mb-2 mt-4 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Or export for spreadsheets / printing:
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => exportSetsCsv(unit)}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-sm font-medium"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          >
            <FileText size={15} /> CSV
          </button>
          <button
            type="button"
            onClick={() => exportPdf(unit)}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-sm font-medium"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          >
            <Printer size={15} /> PDF
          </button>
        </div>
      </section>

      {/* About */}
      <section id="settings-about" className="glass mb-5 scroll-mt-4 rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
        <div className="mb-3 flex items-center gap-2">
          <Info size={14} style={{ color: 'var(--color-ash)' }} />
          <span className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            About
          </span>
        </div>
        <p className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>OPUS</p>
        <p className="font-sans text-sm italic" style={{ color: 'var(--color-text-secondary)' }}>Build your masterpiece.</p>
        <p className="mt-1 font-mono text-xs" style={{ color: 'var(--color-ash)' }}>v3.0.0</p>
        <a
          href="https://github.com/shubanms/opus"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex min-h-11 items-center gap-2 font-sans text-sm font-medium"
          style={{ color: 'var(--color-gold)' }}
        >
          <Github size={15} /> View on GitHub
        </a>
      </section>

      {/* Danger zone — last, where the jump-nav says it is, and the furthest a
          careless scroll can take you from it. */}
      <section id="settings-danger" className="scroll-mt-4 rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid #FF8FA355' }}>
        <div className="mb-1 flex items-center gap-2">
          <Trash2 size={14} style={{ color: 'var(--color-ember)' }} />
          <span className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-ember)' }}>
            Danger zone
          </span>
        </div>
        <p className="mb-3 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Reset the app to a clean slate. Everything stored on this device is erased.
        </p>
        <button
          type="button"
          onClick={() => setReset(true)}
          className="w-full rounded-xl py-3 font-sans text-sm font-semibold"
          style={{ background: 'var(--color-ember)', color: 'var(--color-text-inverse)' }}
        >
          Reset all data
        </button>
      </section>

      <ResetDataModal isOpen={reset} onClose={() => setReset(false)} />
      <EquipmentModal isOpen={equip} onClose={() => setEquip(false)} />
    </div>
  );
}
