import { useState } from 'react';
import Dexie from 'dexie';
import { downloadRawDump } from '../utils/dataActions.js';
import '../styles/ink-components.css';
import '../styles/ink-system.css';

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
    <div className="sy-recover">
      <p className="font-display text-4xl font-bold" style={{ color: 'var(--washi-2)' }}>
        Couldn't open your data
      </p>
      <p className="mt-2 max-w-sm font-sans text-sm" style={{ color: 'var(--mute-2)' }}>
        This usually happens when the app updated while another tab was open. Close other OPUS tabs
        and reload first.
      </p>

      <button type="button" className="ink-btn ink-btn--primary mt-6" onClick={() => window.location.reload()} disabled={busy}>
        Reload
      </button>
      <button type="button" onClick={saveCopy} disabled={busy} className="sy-ghost">
        {saved ? 'Save another copy' : 'Save a copy of my data'}
      </button>

      {saved && (
        <output className="mt-3 block max-w-xs font-sans text-xs" style={{ color: 'var(--moss)' }}>
          Copy saved to Downloads ({saved.workouts} {saved.workouts === 1 ? 'workout' : 'workouts'}). Restore it
          from Settings → Import once the app opens.
        </output>
      )}
      {error && (
        <p role="alert" className="mt-3 max-w-xs font-sans text-xs" style={{ color: 'var(--ver-light)' }}>
          {error}
        </p>
      )}

      {!confirming ? (
        <button type="button" onClick={() => setConfirming(true)} disabled={busy} className="sy-ghost sy-ghost--danger">
          Rebuild database…
        </button>
      ) : (
        <div role="alertdialog" aria-labelledby="rebuild-title" className="sy-recover__dialog">
          <p id="rebuild-title" className="font-sans text-sm font-semibold" style={{ color: 'var(--washi-2)' }}>
            Delete everything on this device?
          </p>
          <p className="mt-1 font-sans text-xs leading-relaxed" style={{ color: 'var(--mute-2)' }}>
            Rebuilding starts the app from empty. {saved
              ? 'Your copy is saved — keep it until you have restored it.'
              : 'Save a copy first: it is the only way to get this history back.'}
          </p>
          {!saved && (
            <button type="button" className="ink-btn ink-btn--primary ink-btn--block mt-3" onClick={saveCopy} disabled={busy}>
              Save a copy first
            </button>
          )}
          <div className="sy-btnrow mt-2">
            <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="sy-ghost" style={{ marginTop: 0 }}>
              Cancel
            </button>
            <button type="button" onClick={rebuild} disabled={busy} className="sy-ghost sy-ghost--danger" style={{ marginTop: 0 }}>
              {busy ? 'Working…' : 'Delete & rebuild'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
