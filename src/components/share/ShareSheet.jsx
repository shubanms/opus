import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { paintCard, shareCanvas } from '../../utils/share.js';
import { THEMES, ACCENTS, resolveTheme } from '../../utils/cardLayout.js';

const PREVIEW = 280;

// The preview canvas IS the exported image — it renders at the full 1080×1080
// and is only scaled down by CSS, so what you see is exactly what gets shared.
export default function ShareSheet({ isOpen, onClose, kind, data, filename = 'opus-card.png' }) {
  const canvasRef = useRef(null);
  const [themeIdx, setThemeIdx] = useState(0);
  const [accentIdx, setAccentIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  const themeId = THEMES[themeIdx].id;
  const accentId = ACCENTS[accentIdx].id;
  const theme = resolveTheme(themeId, accentId);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    (async () => {
      // Let the modal's portal mount so the canvas ref is attached.
      await Promise.resolve();
      if (cancelled || !canvasRef.current) return;
      await paintCard(canvasRef.current, kind, data, resolveTheme(themeId, accentId));
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, kind, data, themeId, accentId]);

  async function doShare() {
    if (!canvasRef.current) return;
    setBusy(true);
    try {
      await shareCanvas(canvasRef.current, filename);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share">
      <canvas
        ref={canvasRef}
        width={1080}
        height={1080}
        style={{
          width: PREVIEW,
          height: PREVIEW,
          display: 'block',
          margin: '0 auto',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
        }}
      />

      <p className="mb-2 mt-5 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
        Background
      </p>
      <div className="flex gap-2">
        {THEMES.map((t, i) => (
          <button
            type="button"
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

      <p className="mb-2 mt-4 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
        Accent
      </p>
      <div className="flex gap-3">
        {ACCENTS.map((a, i) => (
          <button
            type="button"
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
        type="button"
        onClick={doShare}
        disabled={busy}
        className="mt-6 w-full rounded-xl py-3 font-sans text-sm font-semibold"
        style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: busy ? 0.6 : 1 }}
      >
        {busy ? 'Preparing…' : 'Share'}
      </button>
    </Modal>
  );
}
