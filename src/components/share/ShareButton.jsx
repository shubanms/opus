import { useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import ShareableCard from './ShareableCard.jsx';
import { shareCard } from '../../utils/share.js';

// Renders a share button plus an off-screen card that gets captured on tap.
export default function ShareButton({ data, label = 'Share', className, style }) {
  const ref = useRef();
  const [busy, setBusy] = useState(false);

  async function handle(e) {
    e?.stopPropagation();
    if (!data) return;
    setBusy(true);
    try {
      await shareCard(ref.current, `opus-${(data.name || 'workout').toLowerCase().replace(/\s+/g, '-')}.png`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={handle} disabled={busy || !data} className={className} style={style} aria-label="Share workout">
        <Share2 size={14} /> {label && (busy ? 'Preparing…' : label)}
      </button>
      <div style={{ position: 'fixed', left: -99999, top: 0, pointerEvents: 'none' }} aria-hidden>
        <ShareableCard ref={ref} data={data} />
      </div>
    </>
  );
}
