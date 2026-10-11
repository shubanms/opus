import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt.js';
import useUIStore from '../../store/uiStore.js';
import { playChime } from '../../utils/sound.js';

const DISMISSED_KEY = 'opus_install_dismissed';

function readDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * "Install OPUS" — offered once on Home, and only where the browser can do it.
 *
 * Installing is the cheapest protection this app has: an installed PWA is what
 * Chrome most readily exempts from storage eviction, and it opens like an app
 * instead of a tab someone might clear. Dismissing it is permanent (Settings →
 * Data keeps the button), because a card that comes back every visit is nagging.
 */
export default function InstallCard() {
  const { canInstall, installed, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (!canInstall || installed || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* per-device convenience only */
    }
  }

  async function handleInstall() {
    const outcome = await install();
    if (outcome === 'accepted') {
      playChime('success');
      useUIStore.getState().showToast('Installed — OPUS now lives on your home screen', { type: 'success' });
    }
  }

  return (
    <div
      className="glass mb-4 flex items-center gap-3 rounded-2xl p-3"
      style={{ background: 'var(--color-chalk)', border: '1px solid var(--accent-line)' }}
    >
      <div className="min-w-0 flex-1">
        <p className="font-sans text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Install OPUS
        </p>
        <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Opens like an app, and your training is far less likely to be cleared.
        </p>
      </div>
      <button
        type="button"
        onClick={handleInstall}
        className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 font-sans text-sm font-semibold"
        style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
      >
        <Download size={14} /> Install
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Not now"
        className="-mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
      >
        <X size={16} style={{ color: 'var(--color-ash)' }} />
      </button>
    </div>
  );
}
