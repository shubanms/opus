// Progress photos — private, local-only. Images are downscaled to a bounded
// JPEG blob (via canvas + the pure fitDimensions math) and stored in IndexedDB;
// they never leave the device and are excluded from the JSON backup. DOM/DB code
// — verified by review + on-device, with the pure sizing math tested separately.
import { db } from '../db/db.js';
import { fitDimensions } from './imageResize.js';
import { todayKey } from './dateKey.js';

export const PHOTO_CATEGORIES = ['front', 'side', 'back'];

// Downscale a File/Blob to a bounded JPEG Blob using a canvas.
export function resizeImage(file, max = 1080, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const { w, h } = fitDimensions(img.naturalWidth, img.naturalHeight, max);
      const canvas = document.createElement('canvas');
      canvas.width = w || img.naturalWidth;
      canvas.height = h || img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')); };
    img.src = url;
  });
}

export async function addPhoto(file, { category = 'front', note = '', date = todayKey(), weightKg = null } = {}) {
  const blob = await resizeImage(file);
  return db.photos.add({ date, category, note, weightKg, blob, createdAt: Date.now() });
}

export async function deletePhoto(id) {
  await db.photos.delete(id);
}
