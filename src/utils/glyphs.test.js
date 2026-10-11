import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { collect } from '../../scripts/collect-glyphs.mjs';

// A kanji missing from the subset fonts would silently fall back to a system
// font. If this fails, run `npm run fonts:subset` and commit the new files.
describe('font glyph coverage', () => {
  const listed = new Set(readFileSync(new URL('../../scripts/glyphs.txt', import.meta.url), 'utf8'));

  it('scripts/glyphs.txt contains every CJK character used in src/ plus the fixed set', () => {
    const missing = [...collect()].filter((ch) => !listed.has(ch));
    expect(missing).toEqual([]);
  });

  it('includes digits', () => {
    for (const ch of '0123456789') expect(listed.has(ch)).toBe(true);
  });
});
