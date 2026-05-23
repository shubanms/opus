import { useRef, useState } from 'react';
import { Check } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { shareCard } from '../../utils/share.js';
import { THEMES, ACCENTS } from './themes.js';

const PREVIEW = 280;

export default function ShareSheet({ isOpen, onClose, CardComponent, data, filename = 'opus-card.png' }) {
  const ref = useRef();
  const [themeIdx, setThemeIdx] = useState(0);
  const [accentIdx, setAccentIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  const theme = { ...THEMES[themeIdx], accent: ACCENTS[accentIdx].color };

  async function doShare() {
    setBusy(true);
    try {
      await shareCard(ref.current, filename);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share">
      {/* Live preview */}
      <div
        style={{ width: PREVIEW, height: PREVIEW, margin: '0 auto', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }}
      >
        <div style={{ width: 1080, height: 1080, transform: `scale(${PREVIEW / 1080})`, transformOrigin: 'top left' }}>
          <CardComponent data={data} theme={theme} />
        </div>
      </div>

      {/* Theme */}
      <p className="mb-2 mt-5 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
        Background
      </p>
      <div className="flex gap-2">
        {THEMES.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setThemeIdx(i)}
            className="flex h-12 flex-1 items-center justify-center rounded-xl font-sans text-xs font-medium"
            style={{
              background: t.bg,
              color: t.text,
              border: themeIdx === i ? `2px solid ${theme.accent}` : '2px solid transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Accent */}
      <p className="mb-2 mt-4 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
        Accent
      </p>
      <div className="flex gap-3">
        {ACCENTS.map((a, i) => (
          <button
            key={a.id}
            onClick={() => setAccentIdx(i)}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: a.color }}
            aria-label={a.id}
          >
            {accentIdx === i && <Check size={16} style={{ color: '#111010' }} strokeWidth={3} />}
          </button>
        ))}
      </div>

      <button
        onClick={doShare}
        disabled={busy}
        className="mt-6 w-full rounded-xl py-3 font-sans text-sm font-semibold"
        style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: busy ? 0.6 : 1 }}
      >
        {busy ? 'Preparing…' : 'Share'}
      </button>

      {/* Off-screen full-size card for capture */}
      <div style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none' }} aria-hidden>
        <CardComponent ref={ref} data={data} theme={theme} />
      </div>
    </Modal>
  );
}
