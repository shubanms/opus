import { useState } from 'react';
import { Share2 } from 'lucide-react';
import ShareableCard from './ShareableCard.jsx';
import ShareSheet from './ShareSheet.jsx';

// Opens a customizable share sheet (live preview + themes) for the given card.
export default function ShareButton({ data, CardComponent = ShareableCard, filename = 'opus-card.png', label = 'Share', className, style }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
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
        CardComponent={CardComponent}
        data={data}
        filename={filename}
      />
    </>
  );
}
