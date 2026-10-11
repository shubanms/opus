import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { wipeAllData } from '../../utils/dataActions.js';
import { playChime } from '../../utils/sound.js';

const PHRASE = 'DELETE';

export default function ResetDataModal({ isOpen, onClose }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    playChime('delete');
    // wipeAllData puts the in-memory settings back to first-run values before
    // it clears anything, so nothing awake on the page can write "onboarded,
    // had data" back over the cleared storage before the reload lands.
    try {
      await wipeAllData();
    } finally {
      window.location.assign(import.meta.env.BASE_URL);
    }
  }

  const ok = text.trim() === PHRASE && !busy;

  return (
    <Modal isOpen={isOpen} onClose={() => { setText(''); onClose(); }} title="Reset everything">
      <div className="mb-4 flex items-start gap-2 rounded-xl px-3 py-3" style={{ background: '#FF8FA318', border: '1px solid #FF8FA344' }}>
        <AlertTriangle size={16} style={{ color: 'var(--color-ember)', marginTop: 1, flexShrink: 0 }} />
        <p className="font-sans text-xs" style={{ color: 'var(--color-text-primary)' }}>
          This permanently deletes <b>all</b> workouts, routines, personal records, body stats, sleep logs, and progress. It can't be undone.
        </p>
      </div>

      <p className="mb-2 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Type <span className="font-mono font-semibold" style={{ color: 'var(--color-text-primary)' }}>{PHRASE}</span> to confirm.
      </p>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PHRASE}
        autoCapitalize="characters"
        aria-label={`Type ${PHRASE} to confirm`}
        className="w-full rounded-xl px-4 py-3 font-mono text-sm outline-none"
        style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
      />

      <button
        type="button"
        onClick={confirm}
        disabled={!ok}
        className="mt-4 w-full rounded-xl py-3 font-sans text-sm font-semibold"
        style={{ background: 'var(--color-ember)', color: 'var(--color-obsidian)', opacity: ok ? 1 : 0.35 }}
      >
        {busy ? 'Resetting…' : 'Reset all data'}
      </button>
    </Modal>
  );
}
