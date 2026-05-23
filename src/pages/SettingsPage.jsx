import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Github, Trash2, Info, Bell } from 'lucide-react';
import ResetDataModal from '../components/settings/ResetDataModal.jsx';
import { useNotifications } from '../hooks/useNotifications.js';
import { NOTIF_TYPES } from '../utils/notifications.js';

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

  return (
    <div className="anim-fade-slide-up px-5 pb-8 pt-8">
      <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2">
        <ArrowLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Back</span>
      </button>

      <h1 className="mb-6 font-display text-4xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        Settings
      </h1>

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
