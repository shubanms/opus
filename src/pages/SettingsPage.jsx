import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Github, Trash2, Info, Bell, User, Database, Download, Upload } from 'lucide-react';
import ResetDataModal from '../components/settings/ResetDataModal.jsx';
import { useNotifications } from '../hooks/useNotifications.js';
import { useRPG } from '../hooks/useRPG.js';
import useUserStore from '../store/userStore.js';
import useSettingsStore from '../store/settingsStore.js';
import { NOTIF_TYPES } from '../utils/notifications.js';
import { exportData, importData } from '../utils/dataActions.js';

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
        style={{ background: 'var(--color-chalk)', left: on ? 18 : 2, transition: 'left 160ms var(--ease-out)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
      />
    </button>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function SettingsPage() {
  const navigate = useNavigate();
  const [reset, setReset] = useState(false);
  const { settings, perm, update, toggleType, setMaster } = useNotifications();
  const { profile } = useRPG();
  const updateProfile = useUserStore((s) => s.updateProfile);
  const barWeight = useSettingsStore((s) => s.barWeight);
  const setBarWeight = useSettingsStore((s) => s.setBarWeight);
  const fileRef = useRef();

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importData(text);
      window.location.assign(import.meta.env.BASE_URL);
    } catch {
      alert('Could not import this file.');
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
        <div className="flex items-center justify-between py-1.5">
          <span className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>Name</span>
          <input
            defaultValue={profile?.name ?? ''}
            onBlur={(e) => updateProfile({ name: e.target.value.trim() })}
            placeholder="Athlete"
            className="w-40 rounded-lg px-3 py-1.5 text-right font-sans text-sm outline-none"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          />
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="font-sans text-sm" style={{ color: 'var(--color-text-primary)' }}>Barbell weight (kg)</span>
          <input
            value={barWeight}
            onChange={(e) => setBarWeight(Number(e.target.value) || 0)}
            type="number"
            inputMode="decimal"
            className="w-24 rounded-lg px-3 py-1.5 text-right font-mono text-sm outline-none"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          />
        </div>
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
            style={{ background: 'var(--color-obsidian)', color: 'var(--color-chalk)' }}
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
          style={{ background: 'var(--color-ember)', color: 'var(--color-chalk)' }}
        >
          Reset all data
        </button>
      </section>

      <ResetDataModal isOpen={reset} onClose={() => setReset(false)} />
    </div>
  );
}
