import { useState } from 'react';
import Dexie from 'dexie';
import { downloadRawDump } from '../utils/dataActions.js';

// Shown when the local database fails to open (e.g. a blocked or corrupted
// upgrade). Lets the user retry, save what is there, or rebuild.
//
// "Rebuild database" deletes everything on the device, and it used to do so
// on a single tap with no confirm — on the one screen people reach when they
// are already worried about their data. Now it asks, and offers a copy first:
// the database is read raw (no Dexie, no version, so nothing can upgrade it)
// and saved in the backup format, so Settings → Import can restore it once the
// app opens again.
//
// Rendered outside the app shell (no router, no toast host, no motion
// provider), so everything here is plain state and plain elements.

const btn = 'mt-3 w-full max-w-xs rounded-xl py-3 font-sans text-sm';

export default function DbRecovery() {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saved, setSaved] = useState(null); // { workouts } once a copy is saved
  const [error, setError] = useState('');

  async function saveCopy() {
    setBusy(true);
    setError('');
    try {
      setSaved(await downloadRawDump());
    } catch (err) {
      setError(`Couldn't read the database (${err?.name || 'error'}). Nothing was changed.`);
    } finally {
      setBusy(false);
    }
  }

  async function rebuild() {
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
        This usually happens when the app updated while another tab was open. Close other OPUS tabs
        and reload first.
      </p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        disabled={busy}
        className={`${btn} mt-6 font-semibold`}
        style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
      >
        Reload
      </button>
      <button
        type="button"
        onClick={saveCopy}
        disabled={busy}
        className={`${btn} font-medium`}
        style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
      >
        {saved ? 'Save another copy' : 'Save a copy of my data'}
      </button>

      {saved && (
        <output className="mt-3 block max-w-xs font-sans text-xs" style={{ color: 'var(--color-sage)' }}>
          Copy saved to Downloads ({saved.workouts} {saved.workouts === 1 ? 'workout' : 'workouts'}). Restore it
          from Settings → Import once the app opens.
        </output>
      )}
      {error && (
        <p role="alert" className="mt-3 max-w-xs font-sans text-xs" style={{ color: 'var(--color-ember)' }}>
          {error}
        </p>
      )}

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={busy}
          className={`${btn} font-medium`}
          style={{ background: 'transparent', color: 'var(--color-ember)' }}
        >
          Rebuild database…
        </button>
      ) : (
        <div
          role="alertdialog"
          aria-labelledby="rebuild-title"
          className="mt-5 w-full max-w-xs rounded-2xl p-4 text-left"
          style={{ background: 'var(--color-ivory)', border: '1px solid var(--color-ember)' }}
        >
          <p id="rebuild-title" className="font-sans text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Delete everything on this device?
          </p>
          <p className="mt-1 font-sans text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Rebuilding starts the app from empty. {saved
              ? 'Your copy is saved — keep it until you have restored it.'
              : 'Save a copy first: it is the only way to get this history back.'}
          </p>
          {!saved && (
            <button
              type="button"
              onClick={saveCopy}
              disabled={busy}
              className="mt-3 w-full rounded-xl py-2.5 font-sans text-sm font-semibold"
              style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
            >
              Save a copy first
            </button>
          )}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="flex-1 rounded-xl py-2.5 font-sans text-sm font-medium"
              style={{ background: 'var(--color-chalk)', color: 'var(--color-text-primary)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={rebuild}
              disabled={busy}
              className="flex-1 rounded-xl py-2.5 font-sans text-sm font-semibold"
              style={{ background: 'var(--color-ember)', color: 'var(--color-obsidian)' }}
            >
              {busy ? 'Working…' : 'Delete & rebuild'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
