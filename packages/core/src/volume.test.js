import { describe, it, expect } from 'vitest';
import { setLoad, computeVolume } from './volume.js';

describe('setLoad', () => {
  it('is just the weight for loaded exercises', () => {
    expect(setLoad(100, false, 80)).toBe(100);
  });
  it('adds bodyweight for bodyweight exercises', () => {
    expect(setLoad(0, true, 80)).toBe(80);
    expect(setLoad(20, true, 80)).toBe(100); // weighted pull-up
  });
  it('treats missing values as zero', () => {
    expect(setLoad(undefined, false, undefined)).toBe(0);
    expect(setLoad(undefined, true, undefined)).toBe(0);
  });
});

describe('computeVolume', () => {
  const sets = [
    { exerciseId: 1, weight: 100, reps: 5 },              // 500
    { exerciseId: 2, weight: 0, reps: 10 },               // bodyweight → 80*10 = 800
    { exerciseId: 1, weight: 60, reps: 8, isWarmup: true }, // excluded
  ];

  it('excludes warmups and counts bodyweight via a Set predicate', () => {
    expect(computeVolume(sets, 80, new Set([2]))).toBe(1300);
  });
  it('accepts a predicate function', () => {
    expect(computeVolume(sets, 80, (id) => id === 2)).toBe(1300);
  });
  it('accepts an object map', () => {
    expect(computeVolume(sets, 80, { 2: true })).toBe(1300);
  });
  it('with no bodyweight info, only counts loaded weight', () => {
    expect(computeVolume(sets, 80)).toBe(500);
  });
  it('rounds and handles empty input', () => {
    expect(computeVolume([], 80, () => false)).toBe(0);
    expect(computeVolume(undefined, 80)).toBe(0);
  });
});
