import { describe, expect, it } from 'vitest';

import { ACHIEVEMENTS } from './achievements.js';
import { DUNGEON_THEMES } from './dungeon.js';
import {
  ACHIEVEMENT_KANJI, BOSS_KANJI, HIDDEN_ACHIEVEMENTS, STAT_KANJI, UI_KANJI, WEEKDAY_KANJI,
  achievementKanji, bossKanji, formKanji, kanjiNumber, muscleFamily, muscleKanji, rankSealKanji,
  toKanjiDate,
} from './kanji.js';
import { TITLES } from './rpg.js';

const MUSCLES = [
  'chest', 'front-deltoids', 'back-deltoids', 'biceps', 'triceps', 'forearm', 'upper-back',
  'trapezius', 'lower-back', 'quadriceps', 'hamstring', 'gluteal', 'calves', 'abs', 'obliques',
];

describe('muscleKanji', () => {
  it('resolves all 15 keys plus cardio into 7 kanji', () => {
    for (const k of MUSCLES) expect(muscleKanji(k)).toMatch(/\S/);
    expect(new Set([...MUSCLES, 'cardio'].map(muscleKanji))).toEqual(new Set('胸肩腕背脚腹息'));
    expect(Object.keys(muscleFamily)).toHaveLength(16);
  });
  it('falls back without throwing', () => {
    expect(muscleKanji('nope')).toBe('鍛');
    expect(muscleKanji(undefined)).toBe('鍛');
    expect(muscleKanji(null)).toBe('鍛');
    expect(muscleKanji('constructor')).toBe('鍛');
  });
});

describe('formKanji', () => {
  const cases = [
    ['Bench Press', '押'], ['Push-Up', '押'], ['Chest Press', '押'], ['Overhead Press', '挙'],
    ['Dips', '沈'], ['Back Squat', '蹲'], ['Leg Press', '蹲'], ['Deadlift', '引'],
    ['Romanian Deadlift', '引'], ['Face Pull', '引'], ['Good Morning', '礼'], ['Barbell Row', '漕'],
    ['Single-Arm Dumbbell Row', '片'], ['Pull-Up', '懸'], ['Chin Up', '懸'], ['Lat Pulldown', '懸'],
    ['Barbell Curl', '曲'], ['Triceps Pushdown', '伸'], ['Overhead Triceps Extension', '伸'],
    ['Cable Fly', '翼'], ['Lateral Raise', '翼'], ['Rear Delt Fly', '翼'], ['Walking Lunge', '踏'],
    ['Bulgarian Split Squat', '踏'], ['Step-Up', '踏'], ['Standing Calf Raise', '踵'],
    ['Hip Thrust', '橋'], ['Glute Bridge', '橋'], ['Plank', '支'], ['Crunch', '縮'],
    ['Sit-Up', '縮'], ['Hanging Leg Raise', '縮'], ['Russian Twist', '捻'], ['Woodchop', '捻'],
    ['Barbell Shrug', '竦'], ["Farmer's Walk", '運'], ['Running', '走'], ['Treadmill', '走'],
    ['Walking', '歩'], ['Elliptical', '歩'], ['Cycling', '輪'], ['Stair Climber', '登'],
    ['Jump Rope', '跳'],
  ];
  for (const [name, kanji] of cases) {
    it(`${name} -> ${kanji}`, () => expect(formKanji(name, 'chest')).toBe(kanji));
  }
  it('falls back to the muscle kanji, then a default', () => {
    expect(formKanji('Mystery Move', 'biceps')).toBe('腕');
    expect(formKanji('', 'quadriceps')).toBe('脚');
    expect(formKanji(undefined, undefined)).toBe('鍛');
    expect(formKanji(42, 'abs')).toBe('腹');
  });
});

describe('maps', () => {
  it('weekdays and stats', () => {
    expect(Object.values(WEEKDAY_KANJI).join('')).toBe('月火水木金土日');
    expect(Object.values(STAT_KANJI).join('')).toBe('戦撃記鉄刻連');
  });
  it('UI words include the required set', () => {
    const all = Object.values(UI_KANJI);
    for (const w of ['本日', '試練', '次の印', '会心', '連撃', '構え', '止め', '新記録', '奉拝', '再']) {
      expect(all).toContain(w);
    }
  });
  it('every achievement in the app has a kanji; hidden ones are flagged', () => {
    for (const a of ACHIEVEMENTS) {
      expect(ACHIEVEMENT_KANJI[a.key], a.key).toBeTruthy();
      expect(HIDDEN_ACHIEVEMENTS.includes(a.key), a.key).toBe(Boolean(a.hidden));
    }
    expect(achievementKanji('zzz')).toBe('鍛');
  });
  it('every dungeon boss has a kanji, plus the shadow', () => {
    for (const t of DUNGEON_THEMES) expect(BOSS_KANJI[t.id], t.id).toBeTruthy();
    expect(BOSS_KANJI.shadow).toBe('影');
    expect(bossKanji('unknown')).toBe('影');
  });
});

describe('rankSealKanji', () => {
  it('maps each title band by level and by title', () => {
    const expected = ['初', '鉄', '誓', '磨', '意', '鍛', '精', '巧', '伝', '傑作'];
    expected.forEach((k, i) => {
      expect(rankSealKanji(i * 5 + 1)).toBe(k);
      expect(rankSealKanji(i * 5 + 5)).toBe(k);
      expect(rankSealKanji(TITLES[i + 1])).toBe(k);
    });
  });
  it('adds prestige suffix only on Magnum Opus and never throws', () => {
    expect(rankSealKanji(50, 2)).toBe('傑作II');
    expect(rankSealKanji(50, 3)).toBe('傑作III');
    expect(rankSealKanji('Magnum Opus III')).toBe('傑作');
    expect(rankSealKanji(13, 2)).toBe('誓');
    expect(rankSealKanji(999)).toBe('傑作');
    expect(rankSealKanji(undefined)).toBe('初');
    expect(rankSealKanji('???')).toBe('初');
  });
});

describe('toKanjiDate', () => {
  it('formats the spec example', () => {
    expect(toKanjiDate(new Date(2026, 9, 5))).toBe('令和八年十月五日');
    expect(toKanjiDate('2026-10-05')).toBe('令和八年十月五日');
  });
  it('handles 1, 10, 11, 20, 31', () => {
    expect(toKanjiDate('2026-01-01')).toBe('令和八年一月一日');
    expect(toKanjiDate('2026-11-10')).toBe('令和八年十一月十日');
    expect(toKanjiDate('2026-12-11')).toBe('令和八年十二月十一日');
    expect(toKanjiDate('2026-03-20')).toBe('令和八年三月二十日');
    expect(toKanjiDate('2026-12-31')).toBe('令和八年十二月三十一日');
  });
  it('crosses month and year boundaries', () => {
    expect(toKanjiDate('2026-01-31')).toBe('令和八年一月三十一日');
    expect(toKanjiDate('2026-02-01')).toBe('令和八年二月一日');
    expect(toKanjiDate('2027-01-01')).toBe('令和九年一月一日');
    expect(toKanjiDate('2028-01-01')).toBe('令和十年一月一日');
    expect(toKanjiDate('2038-01-01')).toBe('令和二十年一月一日');
  });
  it('first Reiwa year is 元; invalid input gives empty string', () => {
    expect(toKanjiDate('2019-05-01')).toBe('令和元年五月一日');
    expect(toKanjiDate('garbage')).toBe('');
    expect(toKanjiDate(undefined)).toBe('');
    expect(toKanjiDate(null)).toBe('');
  });
  it('kanjiNumber', () => {
    expect([1, 9, 10, 11, 20, 21, 30, 31].map(kanjiNumber)).toEqual(['一', '九', '十', '十一', '二十', '二十一', '三十', '三十一']);
    expect(kanjiNumber(-1)).toBe('');
  });
});
