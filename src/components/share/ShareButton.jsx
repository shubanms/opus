import { useState } from 'react';
import { Share2 } from 'lucide-react';
import ShareSheet from './ShareSheet.jsx';

// Opens the share sheet (live canvas preview + theme pickers) for a card kind:
// 'workout' | 'profile' | 'recap' | 'challenge' | 'wrapped'.
export default function ShareButton({ data, kind = 'workout', filename = 'opus-card.png', label = 'Share', className, style }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); if (data) setOpen(true); }}
        disabled={!data}
        className={className}
        style={style}
        aria-label="Share"
      >
        <Share2 size={14} /> {label && label}
      </button>
      <ShareSheet
        isOpen={open}
        onClose={() => setOpen(false)}
        kind={kind}
        data={data}
        filename={filename}
      />
    </>
  );
}
