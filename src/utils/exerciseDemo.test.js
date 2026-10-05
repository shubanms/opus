import { describe, it, expect, vi, afterEach } from 'vitest';
import { demoNameCandidates, pickTranslationExercise, pickAliasTranslation, pickMainImage, findDemoImage, WGER_API } from './exerciseDemo.js';

describe('demoNameCandidates', () => {
  it('tries the name, then wger’s usual plural', () => {
    expect(demoNameCandidates('Lateral Raise')).toEqual(['Lateral Raise', 'Lateral Raises']);
    expect(demoNameCandidates('Lunges')).toEqual(['Lunges']);
  });

  it('knows the spellings that differ by more than a plural', () => {
    expect(demoNameCandidates('Pull-Up')[0]).toBe('Pull-ups');
  });

  it('tidies whitespace and a trailing abbreviation dot', () => {
    expect(demoNameCandidates('  Overhead Tricep Ext. ')[0]).toBe('Overhead Tricep Ext');
    expect(demoNameCandidates('   ')).toEqual([]);
    expect(demoNameCandidates(null)).toEqual([]);
  });
});

describe('picking from API answers', () => {
  it('takes the exact-name translation, English first', () => {
    const results = [
      { name: 'Push-Up', exercise: 1551, language: 4 },
      { name: 'Push-Up', exercise: 1551, language: 2 },
    ];
    expect(pickTranslationExercise(results, 'Push-Up')).toBe(1551);
  });

  it('ignores rows that are not the name asked for (an ignored filter returns everything)', () => {
    expect(pickTranslationExercise([{ name: '1 Leg Box Squat', exercise: 1948, language: 2 }], 'Squat')).toBeNull();
    expect(pickAliasTranslation([{ alias: 'croci', translation: 1206 }], 'Deadlift')).toBeNull();
    expect(pickAliasTranslation([{ alias: 'Deadlift', translation: 9 }], 'Deadlift')).toBe(9);
  });

  it('only shows an image that belongs to the exercise', () => {
    const results = [
      { exercise: 12, is_main: true, image: 'https://wger.de/media/x.png' },
      { exercise: 73, is_main: false, image: 'https://wger.de/media/b2.png' },
      { exercise: 73, is_main: true, image: '/media/exercise-images/192/Bench-press-1.png' },
    ];
    expect(pickMainImage(results, 73)).toBe('https://wger.de/media/exercise-images/192/Bench-press-1.png');
    expect(pickMainImage(results, 99)).toBeNull();
    expect(pickMainImage(undefined, 1)).toBeNull();
  });
});

describe('findDemoImage', () => {
  afterEach(() => vi.unstubAllGlobals());

  const respond = (routes) => vi.fn(async (url) => {
    const hit = Object.entries(routes).find(([k]) => url.startsWith(`${WGER_API}/${k}`));
    if (!hit) return { ok: true, status: 200, json: async () => ({ results: [] }) };
    const [, body] = hit;
    if (body === 500) return { ok: false, status: 500, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => body };
  });

  it('follows name → exercise → main image', async () => {
    const fetch = respond({
      'exercise-translation/?name=Bench%20Press': { results: [{ name: 'Bench Press', exercise: 73, language: 2 }] },
      'exerciseimage/?exercise=73': { results: [{ exercise: 73, is_main: true, image: 'https://wger.de/b.png' }] },
    });
    vi.stubGlobal('fetch', fetch);
    expect(await findDemoImage('Bench Press')).toBe('https://wger.de/b.png');
  });

  it('falls back to the alias list', async () => {
    vi.stubGlobal('fetch', respond({
      'exercisealias/?alias=Deadlift': { results: [{ alias: 'Deadlift', translation: 9 }] },
      'exercise-translation/9/': { id: 9, exercise: 184 },
      'exerciseimage/?exercise=184': { results: [{ exercise: 184, is_main: true, image: 'https://wger.de/d.png' }] },
    }));
    expect(await findDemoImage('Deadlift')).toBe('https://wger.de/d.png');
  });

  it('resolves null — quietly — when wger fails or is unreachable', async () => {
    vi.stubGlobal('fetch', respond({ 'exercise-translation/': 500 }));
    expect(await findDemoImage('Cable Crossover')).toBeNull();
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    expect(await findDemoImage('Hack Squat')).toBeNull();
  });

  it('a failure is not remembered as "no picture"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    expect(await findDemoImage('Leg Press')).toBeNull();
    vi.stubGlobal('fetch', respond({
      'exercise-translation/?name=Leg%20Press': { results: [{ name: 'Leg Press', exercise: 371, language: 2 }] },
      'exerciseimage/?exercise=371': { results: [{ exercise: 371, is_main: true, image: 'https://wger.de/lp.png' }] },
    }));
    expect(await findDemoImage('Leg Press')).toBe('https://wger.de/lp.png');
  });
});
