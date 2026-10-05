import { describe, it, expect } from 'vitest';
import { groupForRegion, regionsForGroup, MUSCLE_GROUPS } from './bodyMap.js';
import seed from './seedExercises.js';

describe('groupForRegion', () => {
  it('passes the app’s own muscle groups through', () => {
    for (const g of MUSCLE_GROUPS) expect(groupForRegion(g)).toBe(g);
  });

  it('maps the extra anatomy regions onto the group that trains them', () => {
    expect(groupForRegion('left-soleus')).toBe('calves');
    expect(groupForRegion('right-soleus')).toBe('calves');
    expect(groupForRegion('adductor')).toBe('gluteal');
    expect(groupForRegion('abductors')).toBe('gluteal');
  });

  it('ignores regions that are not muscles', () => {
    expect(groupForRegion('head')).toBeNull();
    expect(groupForRegion('neck')).toBeNull();
    expect(groupForRegion('knees')).toBeNull();
    expect(groupForRegion('elbow')).toBeNull();
    expect(groupForRegion(undefined)).toBeNull();
  });

  it('lights every region that selects a group', () => {
    expect(regionsForGroup('gluteal').sort()).toEqual(['abductors', 'adductor', 'gluteal']);
    expect(regionsForGroup('calves').sort()).toEqual(['calves', 'left-soleus', 'right-soleus']);
    expect(regionsForGroup('chest')).toEqual(['chest']);
    expect(regionsForGroup(null)).toEqual([]);
    // Round trip: every region it lights selects that group again.
    for (const g of MUSCLE_GROUPS) for (const r of regionsForGroup(g)) expect(groupForRegion(r)).toBe(g);
  });

  it('every group a tap can select has exercises in the catalogue', () => {
    const groups = new Set(seed.map((e) => e.muscleGroup));
    for (const region of ['left-soleus', 'adductor', ...MUSCLE_GROUPS]) {
      expect(groups.has(groupForRegion(region)), region).toBe(true);
    }
  });
});
