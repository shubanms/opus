import { describe, expect, it } from 'vitest';
import { coachLine, familyDays, isoWeek, recoveryNeed, recoveryWord, volumeSummary, weekLabels } from './chronicleLogic.js';

describe('chronicleLogic', () => {
  it('takes the freshest muscle per family', () => {
    const d = familyDays({ chest: { daysSince: 2 }, 'front-deltoids': { daysSince: 1 }, biceps: { daysSince: null } });
    expect(d.胸).toBe(2);
    expect(d.肩).toBe(1);
    expect(d.腕).toBeNull();
  });
  it('maps days to need and words', () => {
    expect(recoveryNeed(0)).toBe(1);
    expect(recoveryNeed(3)).toBe(0);
    expect(recoveryWord(1)).toBe('1 day');
    expect(recoveryWord(3)).toBe('warming');
    expect(recoveryWord(null)).toBe('fresh');
  });
  it('coach line follows the data', () => {
    expect(coachLine({ 胸: 1, 肩: 2, 背: 5, 脚: null })).toBe('Push is spent. Pull or legs would be wiser tomorrow.');
    expect(coachLine({ 胸: null })).toMatch(/Nothing is spoken/);
    expect(coachLine({ 胸: 6, 背: 5 })).toMatch(/rested/);
  });
  it('labels weeks', () => {
    expect(isoWeek('2026-08-24')).toBe(35);
    expect(weekLabels([{ week: '2026-08-17' }, { week: '2026-08-24' }])).toEqual(['W34', 'NOW']);
  });
  it('summarises volume', () => {
    expect(volumeSummary([{ volume: 100 }, { volume: 120 }])).toEqual({ cur: 120, pct: 20, best: true });
    expect(volumeSummary([{ volume: 0 }]).pct).toBeNull();
  });
});
