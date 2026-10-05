import { describe, it, expect } from 'vitest';
import { comparePair } from './photoActions.js';

describe('comparePair', () => {
  const photos = [
    // usePhotos hands them over newest first.
    { id: 5, date: '2026-10-01', category: 'side', createdAt: 50 },
    { id: 4, date: '2026-09-20', category: 'front', createdAt: 40 },
    { id: 3, date: '2026-09-01', category: 'side', createdAt: 30 },
    { id: 2, date: '2026-08-15', category: 'front', createdAt: 20 },
    { id: 1, date: '2026-08-01', category: 'back', createdAt: 10 },
  ];

  it('pairs the first and latest photo of the same pose', () => {
    // Oldest-vs-newest overall would put the August back shot beside the
    // October side shot.
    expect(comparePair(photos, 'front')).toEqual({ first: photos[3], latest: photos[1] });
    expect(comparePair(photos, 'side')).toEqual({ first: photos[2], latest: photos[0] });
  });

  it('needs two photos of the pose', () => {
    expect(comparePair(photos, 'back')).toBeNull();
    expect(comparePair([], 'front')).toBeNull();
    expect(comparePair(undefined, 'front')).toBeNull();
  });

  it('orders same-day photos by when they were added', () => {
    const sameDay = [
      { id: 8, date: '2026-10-05', category: 'front', createdAt: 900 },
      { id: 7, date: '2026-10-05', category: 'front', createdAt: 100 },
    ];
    expect(comparePair(sameDay, 'front')).toEqual({ first: sameDay[1], latest: sameDay[0] });
  });
});
