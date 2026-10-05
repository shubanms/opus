import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Trash2, X, GitCompare } from 'lucide-react';
import { usePhotos } from '../../hooks/useProgress.js';
import { addPhoto, deletePhoto, restorePhoto, PHOTO_CATEGORIES, comparePair } from '../../utils/photoActions.js';
import { deleteWithUndo } from '../../utils/undoable.js';
import useUIStore from '../../store/uiStore.js';
import { friendlyDate } from '../../utils/dateKey.js';

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

  // Escape closes the viewer, like every other overlay.
  useEffect(() => {
    if (viewer == null) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setViewer(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [viewer]);

  // Compare the first and latest photo *of the selected pose*. Taking the
  // oldest and newest overall put a front shot beside a side shot, which
  // compares nothing.
  const pair = comparePair(photos, category);
  const canCompare = PHOTO_CATEGORIES.some((c) => comparePair(photos, c));
  const viewerPhoto = viewer != null ? photos.find((p) => p.id === viewer) : null;

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
          Progress photos
        </h2>
        {canCompare && (
          <button
            type="button"
            onClick={() => setCompare((v) => !v)}
            aria-pressed={compare}
            className="-my-2 -mr-2 flex h-10 items-center gap-1 rounded-lg px-2 font-sans text-xs font-medium"
            style={{ color: 'var(--color-gold)' }}
          >
            <GitCompare size={13} /> {compare ? 'Grid' : 'Compare'}
          </button>
        )}
      </div>

      <p className="mb-3 font-sans text-[11px]" style={{ color: 'var(--color-ash)' }}>
        🔒 Private — photos stay on this device and never leave it (not included in exports).
      </p>

      {/* Pose: what a new photo is filed under, and what Compare pairs up. */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--color-ivory)' }}>
          {PHOTO_CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className="h-8 rounded-md px-2.5 font-sans text-xs font-medium capitalize"
              style={{ background: category === c ? 'var(--color-gold)' : 'transparent', color: category === c ? 'var(--color-obsidian)' : 'var(--color-text-secondary)' }}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg font-sans text-sm font-semibold"
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
        pair ? (
          <div className="grid grid-cols-2 gap-2">
            {[pair.first, pair.latest].map((p, i) => (
              <button type="button" key={p.id} onClick={() => setViewer(p.id)} className="text-left">
                <img src={urls[p.id]} alt={`${p.category}, ${friendlyDate(p.date)}`} className="w-full rounded-xl" style={{ aspectRatio: '3/4', objectFit: 'cover' }} />
                <p className="mt-1 text-center font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {i === 0 ? 'First' : 'Latest'} · {friendlyDate(p.date)}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Take another {category} photo to compare — or pick a pose above.
          </p>
        )
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <button type="button" key={p.id} onClick={() => setViewer(p.id)} className="relative overflow-hidden rounded-xl" style={{ aspectRatio: '3/4' }}>
              <img src={urls[p.id]} alt={`${p.category}, ${friendlyDate(p.date)}`} className="h-full w-full" style={{ objectFit: 'cover' }} />
              <span className="absolute bottom-1 left-1 rounded px-1 font-mono text-[9px] capitalize" style={{ background: 'rgba(17,16,16,0.65)', color: '#fff' }}>
                {p.category}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Full-screen viewer. Portalled: a fixed overlay inside the page sits
          in whatever containing block a lingering route transform makes. */}
      {viewerPhoto &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center p-6">
            {/* The backdrop is its own button behind the content, so a tap on
                the photo itself doesn't close it. */}
            <button
              type="button"
              aria-label="Close photo"
              onClick={() => setViewer(null)}
              className="absolute inset-0"
              style={{ background: 'rgba(17,16,16,0.94)' }}
            />
            <img src={urls[viewerPhoto.id]} alt={`${viewerPhoto.category}, ${friendlyDate(viewerPhoto.date)}`} className="relative max-h-[75vh] max-w-full rounded-xl" style={{ objectFit: 'contain' }} />
            <p className="relative mt-3 font-mono text-sm" style={{ color: 'var(--color-ivory)' }}>{friendlyDate(viewerPhoto.date)} · <span className="capitalize">{viewerPhoto.category}</span></p>
            <div className="relative mt-4 flex gap-3">
              <button type="button" onClick={() => { remove(viewerPhoto); setViewer(null); }} className="flex h-10 items-center gap-1.5 rounded-full px-4 font-sans text-sm font-semibold" style={{ background: 'var(--color-ember)', color: '#fff' }}>
                <Trash2 size={14} /> Delete
              </button>
              <button type="button" onClick={() => setViewer(null)} className="flex h-10 items-center gap-1.5 rounded-full px-4 font-sans text-sm font-semibold" style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}>
                <X size={14} /> Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
