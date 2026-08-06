import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Trash2, X, GitCompare } from 'lucide-react';
import { usePhotos } from '../../hooks/useProgress.js';
import { addPhoto, deletePhoto, restorePhoto, PHOTO_CATEGORIES } from '../../utils/photoActions.js';
import { deleteWithUndo } from '../../utils/undoable.js';
import useUIStore from '../../store/uiStore.js';
import { parseKey } from '../../utils/dateKey.js';

function label(dateKey) {
  const d = parseKey(dateKey);
  return d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : dateKey;
}

export default function ProgressPhotos() {
  const photos = usePhotos();
  const fileRef = useRef(null);
  const [category, setCategory] = useState('front');
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState(null); // photo id being viewed full-screen
  const [compare, setCompare] = useState(false);

  // Object URLs for each stored blob, revoked when the set changes / unmounts.
  const urls = useMemo(() => {
    const map = {};
    for (const p of photos) map[p.id] = URL.createObjectURL(p.blob);
    return map;
  }, [photos]);
  useEffect(() => () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u)), [urls]);

  async function onPick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try { await addPhoto(file, { category }); } catch (err) { console.error(err); useUIStore.getState().showToast('Could not add that photo', { type: 'error' }); }
    setBusy(false);
  }

  async function remove(p) {
    await deleteWithUndo({ label: 'Photo', remove: () => deletePhoto(p.id), restore: restorePhoto });
  }

  const oldest = photos[photos.length - 1];
  const newest = photos[0];
  const viewerPhoto = viewer != null ? photos.find((p) => p.id === viewer) : null;

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
          Progress photos
        </h2>
        {photos.length >= 2 && (
          <button onClick={() => setCompare((v) => !v)} className="flex items-center gap-1 font-sans text-xs font-medium" style={{ color: 'var(--color-gold)' }}>
            <GitCompare size={13} /> {compare ? 'Grid' : 'Compare'}
          </button>
        )}
      </div>

      <p className="mb-3 font-sans text-[11px]" style={{ color: 'var(--color-ash)' }}>
        🔒 Private — photos stay on this device and never leave it (not included in exports).
      </p>

      {/* Add */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--color-ivory)' }}>
          {PHOTO_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="rounded-md px-2.5 py-1 font-sans text-xs font-medium capitalize"
              style={{ background: category === c ? 'var(--color-gold)' : 'transparent', color: category === c ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 font-sans text-sm font-semibold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: busy ? 0.6 : 1 }}
        >
          <Camera size={15} /> {busy ? 'Adding…' : 'Add photo'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" />
      </div>

      {photos.length === 0 ? (
        <p className="py-6 text-center font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          No photos yet — add one to start your visual timeline.
        </p>
      ) : compare ? (
        <div className="grid grid-cols-2 gap-2">
          {[oldest, newest].map((p, i) => (
            <div key={p.id}>
              <img src={urls[p.id]} alt="" className="w-full rounded-xl" style={{ aspectRatio: '3/4', objectFit: 'cover' }} />
              <p className="mt-1 text-center font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {i === 0 ? 'First' : 'Latest'} · {label(p.date)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <button key={p.id} onClick={() => setViewer(p.id)} className="relative overflow-hidden rounded-xl" style={{ aspectRatio: '3/4' }}>
              <img src={urls[p.id]} alt="" className="h-full w-full" style={{ objectFit: 'cover' }} />
              <span className="absolute bottom-1 left-1 rounded px-1 font-mono text-[9px] capitalize" style={{ background: 'rgba(17,16,16,0.65)', color: '#fff' }}>
                {p.category}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Full-screen viewer */}
      {viewerPhoto && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center p-6" style={{ background: 'rgba(17,16,16,0.94)' }} onClick={() => setViewer(null)}>
          <img src={urls[viewerPhoto.id]} alt="" className="max-h-[75vh] max-w-full rounded-xl" style={{ objectFit: 'contain' }} onClick={(e) => e.stopPropagation()} />
          <p className="mt-3 font-mono text-sm" style={{ color: 'var(--color-ivory)' }}>{label(viewerPhoto.date)} · <span className="capitalize">{viewerPhoto.category}</span></p>
          <div className="mt-4 flex gap-3">
            <button onClick={(e) => { e.stopPropagation(); remove(viewerPhoto); setViewer(null); }} className="flex items-center gap-1.5 rounded-full px-4 py-2 font-sans text-sm font-semibold" style={{ background: 'var(--color-ember)', color: '#fff' }}>
              <Trash2 size={14} /> Delete
            </button>
            <button onClick={() => setViewer(null)} className="flex items-center gap-1.5 rounded-full px-4 py-2 font-sans text-sm font-semibold" style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}>
              <X size={14} /> Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
