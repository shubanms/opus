import { useState } from 'react';
import Dexie from 'dexie';

// Shown when the local database fails to open (e.g. a blocked or corrupted
// upgrade). Lets the user retry or rebuild the database.
export default function DbRecovery() {
  const [busy, setBusy] = useState(false);

  async function repair() {
    setBusy(true);
    try {
      await Dexie.delete('OpusDB');
    } catch {
      /* ignore */
    }
    window.location.reload();
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-8 text-center"
      style={{ background: 'var(--color-chalk)' }}
    >
      <p className="font-display text-4xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
        Couldn't open your data
      </p>
      <p className="mt-2 max-w-sm font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        This usually happens when the app updated while another tab was open. Try reloading first.
        If it keeps happening, rebuild the local database.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="mt-6 w-full max-w-xs rounded-xl py-3 font-sans text-sm font-semibold"
        style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
      >
        Reload
      </button>
      <button
        onClick={repair}
        disabled={busy}
        className="mt-3 w-full max-w-xs rounded-xl py-3 font-sans text-sm font-medium"
        style={{ background: 'var(--color-ivory)', color: 'var(--color-ember)' }}
      >
        {busy ? 'Rebuilding…' : 'Rebuild database (clears local data)'}
      </button>
    </div>
  );
}
