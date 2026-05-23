import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Github, Trash2, Info } from 'lucide-react';
import ResetDataModal from '../components/settings/ResetDataModal.jsx';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [reset, setReset] = useState(false);

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
