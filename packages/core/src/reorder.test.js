import { describe, it, expect } from 'vitest';
import { moveItem } from './reorder.js';

describe('moveItem', () => {
  it('moves an item down', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });
  it('moves an item up', () => {
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
  });
  it('is a no-op (same ref) past the top', () => {
    const arr = ['a', 'b'];
    expect(moveItem(arr, 0, -1)).toBe(arr);
  });
  it('is a no-op (same ref) past the bottom', () => {
    const arr = ['a', 'b'];
    expect(moveItem(arr, 1, 1)).toBe(arr);
  });
  it('is a no-op on a single element', () => {
    const arr = ['only'];
    expect(moveItem(arr, 0, 1)).toBe(arr);
    expect(moveItem(arr, 0, -1)).toBe(arr);
  });
  it('ignores an out-of-range index', () => {
    const arr = ['a', 'b'];
    expect(moveItem(arr, 5, -1)).toBe(arr);
  });
  it('does not mutate the input', () => {
    const arr = ['a', 'b', 'c'];
    moveItem(arr, 0, 1);
    expect(arr).toEqual(['a', 'b', 'c']);
  });
});
