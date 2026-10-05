import { useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, FileCheck2, Upload } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { m, TWEEN } from '../../motion/index.jsx';
import useSettingsStore from '../../store/settingsStore.js';
import useUIStore from '../../store/uiStore.js';
import { importData, inspectBackup } from '../../utils/dataActions.js';
import { describeBackup } from '../../utils/backup.js';
import { friendlyDate } from '../../utils/dateKey.js';
import { playChime } from '../../utils/sound.js';
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
//
// Picking a file shows what is in it before anything is restored — "Backup
// from 30 Sep · 142 workouts" — because the Downloads folder holds a file per
// week and the newest one is the one you want.

// Both what the app writes (.json) and what its share sheet sends (.txt).
const ACCEPT = '.json,.txt,application/json,text/plain';

export default function WipeAlert() {
  const wipe = useWipeCheck();
  const acceptWipe = useSettingsStore((s) => s.acceptWipe);
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null); // { text, info, name }

  if (!wipe) return null;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // so picking the same file again still fires
    if (!file) return;
    const text = await file.text();
    const info = inspectBackup(text);
    if (!info.ok) {
      useUIStore.getState().showToast(info.error, { type: 'error' });
      return;
    }
    setPreview({ text, info, name: file.name });
  }

  async function restore() {
    if (!preview) return;
    setBusy(true);
    try {
      await importData(preview.text);
      playChime('goal');
      // A full reload rather than a re-render: every store and live query in
      // the app is holding state derived from a database that just changed
      // underneath all of them.
      window.location.reload();
    } catch (err) {
      console.error(err);
      setBusy(false);
      useUIStore.getState().showToast(err?.message || 'That file could not be restored.', { type: 'error' });
    }
  }

  const summary = preview ? describeBackup(preview.info) : null;

  return (
    // Dismissing — the ✕, the scrim, a swipe down — means the same thing as
    // "Start fresh". A close button that does nothing is worse than no close
    // button, and there is nothing destructive behind this one: the data is
    // already gone, and the detector re-arms the moment a new history begins.
    <Modal isOpen onClose={acceptWipe} title={preview ? 'Restore this backup?' : 'Your history is missing'}>
      {preview ? (
        <m.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={TWEEN.standard}>
          <div className="mb-4 flex items-start gap-3 rounded-2xl px-4 py-3.5" style={{ background: 'var(--color-ivory)' }}>
            <FileCheck2 size={20} className="mt-0.5 shrink-0" style={{ color: 'var(--color-sage)' }} />
            <div className="min-w-0">
              <p className="font-sans text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {summary.title}
              </p>
              <p className="mt-0.5 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {summary.detail}
              </p>
              {preview.info.lastWorkout && (
                <p className="mt-1 font-sans text-xs" style={{ color: 'var(--color-ash)' }}>
                  Last session in it: {friendlyDate(preview.info.lastWorkout)}
                </p>
              )}
              <p className="mt-1 truncate font-mono text-[11px]" style={{ color: 'var(--color-ash)' }}>
                {preview.name}
              </p>
            </div>
          </div>
          <p className="mb-5 font-sans text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Restoring replaces what is on this device with the backup, then reopens the app.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => setPreview(null)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-medium"
              style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
            >
              <ArrowLeft size={15} /> Another file
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={restore}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-semibold"
              style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: busy ? 0.5 : 1 }}
            >
              <Upload size={15} /> {busy ? 'Restoring…' : 'Restore'}
            </button>
          </div>
        </m.div>
      ) : (
        <>
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
              for a file named <span className="font-mono">opus-backup-….json</span> (or a{' '}
              <span className="font-mono">.txt</span> you sent yourself). Every one of them restores the
              day it was taken.
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
              onClick={() => fileRef.current?.click()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-semibold"
              style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
            >
              <Upload size={15} /> Restore a backup
            </button>
          </div>
        </>
      )}
      <input ref={fileRef} type="file" accept={ACCEPT} onChange={handleFile} className="hidden" />
    </Modal>
  );
}
