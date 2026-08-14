import { useRef, useState } from 'react';
import { AlertTriangle, Upload } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import useSettingsStore from '../../store/settingsStore.js';
import useUIStore from '../../store/uiStore.js';
import { importData } from '../../utils/dataActions.js';
import { useWipeCheck } from '../../hooks/useBackup.js';

// Said out loud, the moment it is true.
//
// The failure this exists for: a browser wipe takes IndexedDB but leaves
// localStorage, so the app skips onboarding, auto-creates a blank profile and
// opens on a tidy set of zeroes. It looks like a new account. Someone lost a
// month of training that way and only worked out what had happened a week
// later, because nothing ever said anything.
//
// It cannot bring the data back. What it can do is tell you the day it happens,
// while the backup file is still in your Downloads folder and the gap is a day
// instead of a month.

export default function WipeAlert() {
  const wipe = useWipeCheck();
  const acceptWipe = useSettingsStore((s) => s.acceptWipe);
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);

  if (!wipe) return null;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await importData(await file.text());
      // A full reload rather than a re-render: every store and live query in
      // the app is holding state derived from a database that just changed
      // underneath all of them.
      window.location.reload();
    } catch (err) {
      console.error(err);
      setBusy(false);
      useUIStore.getState().showToast('That file could not be read as a backup.', { type: 'error' });
    }
  }

  return (
    // Dismissing — the ✕, the scrim, a swipe down — means the same thing as
    // "Start fresh". A close button that does nothing is worse than no close
    // button, and there is nothing destructive behind this one: the data is
    // already gone, and the detector re-arms the moment a new history begins.
    <Modal isOpen onClose={acceptWipe} title="Your history is missing">
      <div className="mb-4 flex items-start gap-2.5">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--color-ember)' }} />
        <div>
          <p className="font-sans text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
            {wipe.lost > 0
              ? `This device had ${wipe.lost} logged ${wipe.lost === 1 ? 'session' : 'sessions'}. They are gone.`
              : 'Your logged sessions are gone from this device.'}
          </p>
          <p className="mt-2 font-sans text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            OPUS stores everything in your browser, and clearing browsing data — "cookies, cache
            and other site data" — erases it. There is no copy on a server to fetch back.
          </p>
        </div>
      </div>

      <div className="mb-5 rounded-2xl px-3.5 py-3" style={{ background: 'var(--color-ivory)' }}>
        <p className="font-sans text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          Look in your <strong style={{ color: 'var(--color-text-primary)' }}>Downloads</strong> folder
          for a file named <span className="font-mono">opus-backup-….json</span>. Every one of them
          restores the day it was taken.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={acceptWipe}
          className="flex-1 rounded-xl py-3 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        >
          Start fresh
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-semibold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: busy ? 0.5 : 1 }}
        >
          <Upload size={15} /> {busy ? 'Restoring…' : 'Restore a backup'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </Modal>
  );
}
