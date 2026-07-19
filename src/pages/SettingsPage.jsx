import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Github, Trash2, Info, Bell, User, Database, Download, Upload, Sparkles, FileText, Printer } from 'lucide-react';
import ResetDataModal from '../components/settings/ResetDataModal.jsx';
import EquipmentModal from '../components/settings/EquipmentModal.jsx';
import { useNotifications } from '../hooks/useNotifications.js';
import { useRPG } from '../hooks/useRPG.js';
import { useCurrentBodyweight } from '../hooks/useProgress.js';
import useUserStore from '../store/userStore.js';
import useSettingsStore from '../store/settingsStore.js';
import useUIStore from '../store/uiStore.js';
import { NOTIF_TYPES, requestPermission, showNotification } from '../utils/notifications.js';
import { playChime } from '../utils/sound.js';
import { exportData, importData, exportSetsCsv, exportPdf } from '../utils/dataActions.js';
import { logBodyStat } from '../utils/healthActions.js';
import { toDisplay, toKg, unitLabel } from '../utils/units.js';

const SEXES = ['Male', 'Female', 'Other'];

function Switch({ on, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      className="relative h-6 w-10 flex-shrink-0 rounded-full"
      style={{ background: on && !disabled ? 'var(--color-gold)' : 'var(--color-ivory)', opacity: disabled ? 0.4 : 1 }}
      aria-pressed={on}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full"
        style={{ background: 'var(--color-text-inverse)', left: on ? 18 : 2, transition: 'left 160ms var(--ease-out)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
      />
    </button>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
      {children}
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function SettingsPage() {
  const navigate = useNavigate();
  const [reset, setReset] = useState(false);
  const [equip, setEquip] = useState(false);
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
  const bodyweight = useCurrentBodyweight();
  const fileRef = useRef();
  const age = profile?.birthYear ? new Date().getFullYear() - profile.birthYear : '';

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

  return (
    <div className="anim-fade-slide-up px-5 pb-8 pt-8">
      <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2">
        <ArrowLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Back</span>
      </button>

      <h1 className="mb-6 font-display text-4xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        Settings
      </h1>

      {/* Profile */}
      <section className="mb-5 rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
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
              <button key={u} onClick={() => setUnit(u)} className="px-4 py-1.5 font-sans text-sm font-medium"
                style={{ background: unit === u ? 'var(--color-gold)' : 'transparent', color: unit === u ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}>
                {u}
              </button>
            ))}
          </div>
        </div>

        <Row label="Name">
          <input
            defaultValue={profile?.name ?? ''}
            onBlur={(e) => updateProfile({ name: e.target.value.trim() })}
            placeholder="Athlete"
            className="w-40 rounded-lg px-3 py-1.5 text-right font-sans text-sm outline-none"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          />
        </Row>

        <Row label={`Bodyweight (${unitLabel(unit)})`}>
          <input
            key={bodyweight}
            defaultValue={bodyweight != null ? toDisplay(bodyweight, unit) : ''}
            onBlur={(e) => { if (e.target.value !== '') logBodyStat({ date: new Date().toISOString().slice(0, 10), weight: toKg(Number(e.target.value), unit) }); }}
            type="number" inputMode="decimal" placeholder="—"
            className="w-24 rounded-lg px-3 py-1.5 text-right font-mono text-sm outline-none"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          />
        </Row>

        <Row label="Height (cm)">
          <input
            defaultValue={profile?.height ?? ''}
            onBlur={(e) => updateProfile({ height: e.target.value ? Number(e.target.value) : null })}
            type="number" inputMode="decimal" placeholder="—"
            className="w-24 rounded-lg px-3 py-1.5 text-right font-mono text-sm outline-none"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          />
        </Row>

        <Row label="Age">
          <input
            defaultValue={age}
            onBlur={(e) => updateProfile({ birthYear: e.target.value ? new Date().getFullYear() - Number(e.target.value) : null })}
            type="number" inputMode="numeric" placeholder="—"
            className="w-24 rounded-lg px-3 py-1.5 text-right font-mono text-sm outline-none"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          />
        </Row>

        <Row label="Sex">
          <div className="flex gap-1">
            {SEXES.map((s) => (
              <button key={s} onClick={() => updateProfile({ sex: s })} className="rounded-lg px-3 py-1.5 font-sans text-xs"
                style={{ background: profile?.sex === s ? 'var(--color-gold)' : 'var(--color-ivory)', color: profile?.sex === s ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}>
                {s[0]}
              </button>
            ))}
          </div>
        </Row>

        <Row label={`Barbell weight (${unitLabel(unit)})`}>
          <input
            key={`${unit}-${barWeight}`}
            defaultValue={toDisplay(barWeight, unit)}
            onBlur={(e) => setBarWeight(toKg(Number(e.target.value) || 0, unit))}
            type="number" inputMode="decimal"
            className="w-24 rounded-lg px-3 py-1.5 text-right font-mono text-sm outline-none"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          />
        </Row>

        <button
          onClick={() => setEquip(true)}
          className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5"
          style={{ background: 'var(--color-ivory)' }}
        >
          <span className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>Equipment &amp; plates</span>
          <span className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>Gym / Home →</span>
        </button>

        <Row label="Daily step goal">
          <input
            key={stepGoal}
            defaultValue={stepGoal}
            onBlur={(e) => setStepGoal(Math.max(0, parseInt(e.target.value) || 0))}
            type="number" inputMode="numeric"
            className="w-24 rounded-lg px-3 py-1.5 text-right font-mono text-sm outline-none"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          />
        </Row>

        <Row label="Daily water goal (glasses)">
          <input
            key={waterGoal}
            defaultValue={waterGoal}
            onBlur={(e) => setWaterGoal(Math.max(1, parseInt(e.target.value) || 1))}
            type="number" inputMode="numeric"
            className="w-24 rounded-lg px-3 py-1.5 text-right font-mono text-sm outline-none"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          />
        </Row>
      </section>

      {/* About */}
      <section className="mb-5 rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
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
          className="mt-3 flex items-center gap-2 font-sans text-sm font-medium"
          style={{ color: 'var(--color-gold)' }}
        >
          <Github size={15} /> View on GitHub
        </a>
      </section>

      {/* Notifications */}
      <section className="mb-5 rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
        <div className="mb-3 flex items-center gap-2">
          <Bell size={14} style={{ color: 'var(--color-ash)' }} />
          <span className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Notifications
          </span>
        </div>

        <div className="flex items-center justify-between py-1.5">
          <div className="min-w-0 pr-3">
            <p className="font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Enable notifications</p>
            {perm === 'denied' && (
              <p className="font-sans text-xs" style={{ color: 'var(--color-ember)' }}>Blocked in browser settings</p>
            )}
          </div>
          <Switch on={settings.enabled && perm === 'granted'} onChange={setMaster} disabled={perm === 'denied'} />
        </div>

        {settings.enabled && perm === 'granted' && (
          <>
            <div className="my-2 h-px" style={{ background: 'var(--color-ivory)' }} />
            {NOTIF_TYPES.map((t) => (
              <div key={t.key} className="flex items-center justify-between py-1.5">
                <span className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>{t.label}</span>
                <Switch on={!!settings[t.key]} onChange={() => toggleType(t.key)} />
              </div>
            ))}

            <div className="mt-3 flex items-center justify-between">
              <span className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>Quiet hours</span>
              <div className="flex items-center gap-2">
                <select
                  value={settings.dndStart}
                  onChange={(e) => update({ dndStart: Number(e.target.value) })}
                  className="rounded-lg px-2 py-1 font-mono text-xs outline-none"
                  style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
                >
                  {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                </select>
                <span className="font-sans text-xs" style={{ color: 'var(--color-ash)' }}>to</span>
                <select
                  value={settings.dndEnd}
                  onChange={(e) => update({ dndEnd: Number(e.target.value) })}
                  className="rounded-lg px-2 py-1 font-mono text-xs outline-none"
                  style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
                >
                  {HOURS.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}
                </select>
              </div>
            </div>
          </>
        )}

        <div className="mt-3 flex gap-2">
          <button
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
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-xs font-medium"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          >
            <Bell size={14} /> Test notification
          </button>
          <button
            onClick={() => { playChime('goal', { force: true }); setTimeout(() => playChime('anthem', { force: true }), 1000); }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-xs font-medium"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          >
            <Sparkles size={14} /> Preview sounds
          </button>
        </div>
        <p className="mt-2 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Notifications show while OPUS is open or installed; a static app can't push in the background.
        </p>
      </section>

      {/* Experience */}
      <section className="mb-5 rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={14} style={{ color: 'var(--color-ash)' }} />
          <span className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Experience
          </span>
        </div>
        <Row label="Theme">
          <div className="flex overflow-hidden rounded-lg" style={{ background: 'var(--color-ivory)' }}>
            {['light', 'dark', 'system'].map((t) => (
              <button key={t} onClick={() => setTheme(t)} className="px-3 py-1.5 font-sans text-xs font-medium capitalize"
                style={{ background: theme === t ? 'var(--color-gold)' : 'transparent', color: theme === t ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}>
                {t}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Effects & haptics">
          <Switch on={effects} onChange={setEffects} />
        </Row>
        <Row label="Sound">
          <Switch on={sound} onChange={setSound} />
        </Row>
        <Row label="Opening theme music">
          <Switch on={themeOnOpen} onChange={setThemeOnOpen} disabled={!sound} />
        </Row>
        <button
          onClick={() => { setTourSeen(false); navigate('/home'); }}
          className="mt-3 w-full rounded-xl py-2.5 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        >
          Replay walkthrough
        </button>
        <button
          onClick={() => { resetCoachMarks(); useUIStore.getState().showToast('Tips will show again as you browse.'); }}
          className="mt-2 w-full rounded-xl py-2.5 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        >
          Show tips again
        </button>
      </section>

      {/* Data */}
      <section className="mb-5 rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
        <div className="mb-3 flex items-center gap-2">
          <Database size={14} style={{ color: 'var(--color-ash)' }} />
          <span className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Data
          </span>
        </div>
        <p className="mb-3 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Back up everything to a file, or restore from one.
        </p>
        <div className="flex gap-2">
          <button
            onClick={exportData}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-semibold"
            style={{ background: 'var(--color-obsidian)', color: 'var(--color-text-inverse)' }}
          >
            <Download size={15} /> Export
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-medium"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          >
            <Upload size={15} /> Import
          </button>
          <input ref={fileRef} type="file" accept="application/json" onChange={handleImport} className="hidden" />
        </div>

        <p className="mb-2 mt-4 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Or export for spreadsheets / printing:
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => exportSetsCsv(unit)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-sm font-medium"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          >
            <FileText size={15} /> CSV
          </button>
          <button
            onClick={() => exportPdf(unit)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-sm font-medium"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          >
            <Printer size={15} /> PDF
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid #D4622A55' }}>
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
