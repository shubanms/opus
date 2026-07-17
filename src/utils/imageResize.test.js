import { describe, it, expect } from 'vitest';
import { fitDimensions } from './imageResize.js';

describe('fitDimensions', () => {
  it('scales a large landscape image to fit the max width', () => {
    expect(fitDimensions(4000, 3000, 1080)).toEqual({ w: 1080, h: 810 });
  });
  it('scales a large portrait image to fit the max height', () => {
    expect(fitDimensions(3000, 4000, 1080)).toEqual({ w: 810, h: 1080 });
  });
  it('never upscales a small image', () => {
    expect(fitDimensions(500, 400, 1080)).toEqual({ w: 500, h: 400 });
  });
  it('handles a square image', () => {
    expect(fitDimensions(2000, 2000, 1080)).toEqual({ w: 1080, h: 1080 });
  });
  it('is safe on bad input', () => {
    expect(fitDimensions(0, 100)).toEqual({ w: 0, h: 0 });
    expect(fitDimensions(-5, 10)).toEqual({ w: 0, h: 0 });
  });
});
