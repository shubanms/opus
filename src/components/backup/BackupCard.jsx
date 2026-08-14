import { ShieldAlert, ShieldCheck, Download, Share2 } from 'lucide-react';
import { m, TWEEN } from '../../motion/index.jsx';
import useUIStore from '../../store/uiStore.js';
import { BACKUP, backupLabel } from '../../utils/backup.js';
import { useBackupStatus, useRunBackup, useShareBackup } from '../../hooks/useBackup.js';

// How old your only copy is, on the screen you actually look at.
//
// This used to be one line in Settings reading "keep a recent backup" — advice
// with no urgency, no age, and no button, filed under a heading nobody opens
// until something has already gone wrong. It is on Home now because the cost of
// not reading it is the entire history.
//
// Two states, because silence is what caused the problem in the first place.
// While a backup is fresh this is one quiet line — enough to know a copy exists
// and where, without becoming furniture. When it is late it becomes a card with
// buttons. It never disappears entirely: the automatic write cannot be verified
// (a browser can refuse a download nobody asked for, silently), so the app must
// not imply a safety it has not confirmed.

export default function BackupCard() {
  const status = useBackupStatus();
  const runBackup = useRunBackup();
  const shareBackup = useShareBackup();

  const urgent = status.state === BACKUP.STALE || status.state === BACKUP.NEVER;
  const accent = urgent ? 'var(--color-ember)' : 'var(--color-gold)';

  async function save() {
    await runBackup();
    useUIStore.getState().showToast('Backup saved to Downloads', { type: 'success' });
  }

  async function send() {
    const how = await shareBackup();
    useUIStore.getState().showToast(
      how === 'shared' ? 'Backup sent' : 'Backup saved to Downloads',
      { type: 'success' }
    );
  }

  if (status.state === BACKUP.FRESH) {
    return (
      <button
        type="button"
        onClick={save}
        className="mb-3 flex w-full items-center gap-1.5 px-1"
      >
        <ShieldCheck size={12} style={{ color: 'var(--color-sage)' }} />
        <span className="font-sans text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
          {backupLabel(status)} — in your Downloads folder
        </span>
      </button>
    );
  }

  return (
    <m.div
      className="glass mb-4 rounded-2xl px-4 py-3.5"
      style={{ background: 'var(--color-chalk)', border: `1px solid ${accent}55` }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={TWEEN.enter}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <ShieldAlert size={13} style={{ color: accent }} />
        <span
          className="font-sans text-[10px] font-semibold uppercase"
          style={{ color: accent, letterSpacing: '0.18em' }}
        >
          {backupLabel(status)}
        </span>
      </div>
      <p className="font-sans text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
        {/* Said plainly, because the thing people don't know is that clearing
            the browser counts. Nobody expects "cookies" to mean their squats. */}
        Your training lives only on this phone. Clearing your browser data erases it — a
        backup file in Downloads is the only copy that survives.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={save}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-sm font-semibold"
          style={{ background: accent, color: 'var(--color-obsidian)' }}
        >
          <Download size={15} /> Back up now
        </button>
        <button
          type="button"
          onClick={send}
          className="flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 font-sans text-sm font-medium"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          aria-label="Send backup somewhere else"
        >
          <Share2 size={15} />
        </button>
      </div>
    </m.div>
  );
}
