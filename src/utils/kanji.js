// Kanji iconography for the Ink design system (HANDOFF §8.6). Pure data and
// helpers: no React, no clock (toKanjiDate takes the date as an argument).
// Every kanji used here must end up in scripts/glyphs.txt
// (run `node scripts/collect-glyphs.mjs`).

const DEFAULT_KANJI = '鍛';
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

// ---- Muscles -------------------------------------------------------------
export const muscleFamily = {
  chest: '胸',
  'front-deltoids': '肩',
  'back-deltoids': '肩',
  biceps: '腕',
  triceps: '腕',
  forearm: '腕',
  'upper-back': '背',
  trapezius: '背',
  'lower-back': '背',
  quadriceps: '脚',
  hamstring: '脚',
  gluteal: '脚',
  calves: '脚',
  abs: '腹',
  obliques: '腹',
  cardio: '息',
};

export function muscleKanji(muscleKey) {
  const key = typeof muscleKey === 'string' ? muscleKey.trim().toLowerCase() : '';
  return has(muscleFamily, key) ? muscleFamily[key] : DEFAULT_KANJI;
}

// ---- Exercise forms ------------------------------------------------------
// First match wins, so the order resolves overlaps (e.g. "overhead triceps
// extension" is 伸 not 挙, "walking lunge" is 踏 not 歩).
const FORM_PATTERNS = [
  ['片', /single[\s-]?arm|one[\s-]?arm|unilateral/],
  ['跳', /jump[\s-]?rope|skipping/],
  ['登', /stair|step[\s-]?mill|climber/],
  ['踵', /calf|calves/],
  ['縮', /crunch|sit[\s-]?up|(leg|knee|hanging)[\s-]?raise/],
  ['踏', /lunge|split squat|step[\s-]?up|bulgarian/],
  ['橋', /hip[\s-]?thrust|glute[\s-]?bridge|bridge/],
  ['礼', /good[\s-]?morning/],
  ['引', /deadlift|\brdl\b|romanian|face[\s-]?pull|pull[\s-]?through/],
  ['懸', /pull[\s-]?up|chin[\s-]?up|pull[\s-]?down/],
  ['沈', /\bdips?\b/],
  ['伸', /push[\s-]?down|skull|tricep|kickback/],
  ['曲', /curl/],
  ['翼', /\bfl(y|ye|ies|yes)\b|lateral raise|side raise|front raise|rear[\s-]?delt|reverse fly|pec[\s-]?deck/],
  ['挙', /overhead|shoulder press|military|arnold|push[\s-]?press|\bohp\b/],
  ['蹲', /squat|leg[\s-]?press/],
  ['漕', /\brow(s|ing)?\b/],
  ['捻', /twist|wood[\s-]?chop/],
  ['竦', /shrug/],
  ['運', /farmer|carry|carries/],
  ['支', /plank|\bholds?\b|hang\b|wall[\s-]?sit/],
  ['押', /bench|push[\s-]?up|press[\s-]?up|chest press|\bpress\b/],
  ['走', /\brun(ning)?\b|treadmill|jog|sprint/],
  ['歩', /\bwalk|elliptical|hike/],
  ['輪', /cycl|\bbike\b|spin|bicycle/],
];

export function formKanji(exerciseName, primaryMuscle) {
  const name = typeof exerciseName === 'string' ? exerciseName.toLowerCase() : '';
  if (name) {
    for (const [kanji, re] of FORM_PATTERNS) if (re.test(name)) return kanji;
  }
  return muscleKanji(primaryMuscle);
}

// ---- Weekdays and stats --------------------------------------------------
export const WEEKDAY_KANJI = { Mon: '月', Tue: '火', Wed: '水', Thu: '木', Fri: '金', Sat: '土', Sun: '日' };

export const STAT_KANJI = {
  sessions: '戦',
  sets: '撃',
  records: '記',
  iron: '鉄',
  time: '刻',
  streak: '連',
};

// ---- Rank seals ----------------------------------------------------------
const RANK_BANDS = ['初', '鉄', '誓', '磨', '意', '鍛', '精', '巧', '伝', '傑作'];
const RANK_SEAL_BY_TITLE = {
  'First Rep': '初', 'Iron Beginner': '鉄', Committed: '誓', Grinder: '磨', 'Iron Will': '意',
  Forged: '鍛', Elite: '精', Masterwork: '巧', Legendary: '伝', 'Magnum Opus': '傑作',
};
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// Accepts a level (1-50, five levels per title band) or a title string
// ("Iron Will", "Magnum Opus II"). A prestige above 0 appends a roman numeral
// to the Magnum Opus seal (傑作II), matching prestigeLabel in rpg.js.
export function rankSealKanji(levelOrTitle, prestige = 0) {
  let idx = 0;
  if (typeof levelOrTitle === 'string') {
    const title = levelOrTitle.trim().replace(/\s+[IVX]+$/, '');
    idx = has(RANK_SEAL_BY_TITLE, title) ? RANK_BANDS.indexOf(RANK_SEAL_BY_TITLE[title]) : 0;
  } else {
    const level = Math.floor(Number(levelOrTitle));
    idx = Number.isFinite(level) ? Math.min(Math.max(Math.ceil(level / 5), 1), 10) - 1 : 0;
  }
  const seal = RANK_BANDS[idx];
  const p = Math.floor(Number(prestige));
  if (idx === 9 && Number.isFinite(p) && p > 0) return `${seal}${ROMAN[p] ?? p}`;
  return seal;
}

// ---- Achievements (keys from src/utils/achievements.js) ------------------
// The spec lists 19 seals; the app has 19 achievements with different keys
// for a few, so sets1000 (Workhorse) takes 剛 (Relentless), level5 (Climber)
// takes 鍛 (Forged) and level10 (Double Digits) takes the gold 傑作.
export const ACHIEVEMENT_KANJI = {
  first: '初',
  w10: '志',
  w50: '誠',
  w100: '百',
  streak7: '七',
  streak30: '不屈',
  vol10k: '十',
  vol100k: '重',
  vol1m: '百万',
  sets100: '錬',
  sets1000: '剛',
  allMuscles: '円',
  pr10: '破',
  pr50: '頂',
  level5: '鍛',
  level10: '傑作',
  earlyBird: '暁',
  nightOwl: '梟',
  architect: '匠',
};
// Hidden seals show "?" until earned.
export const HIDDEN_ACHIEVEMENTS = ['vol1m', 'earlyBird', 'nightOwl', 'architect'];
export const GOLD_ACHIEVEMENTS = ['level10'];

export function achievementKanji(key) {
  return has(ACHIEVEMENT_KANJI, key) ? ACHIEVEMENT_KANJI[key] : DEFAULT_KANJI;
}
export function isHiddenAchievement(key) {
  return HIDDEN_ACHIEVEMENTS.includes(key);
}

// ---- Bosses (keyed by dungeon theme id in src/utils/dungeon.js) ----------
export const BOSS_KANJI = {
  push: '鉄', // The Iron Warden
  legs: '巨', // The Quad Colossus
  pull: '龍', // The Lat Leviathan
  arms: '鬼', // The Curl Fiend
  shoulders: '岳', // The Deltoid Titan
  full: '冶', // The Ironmonger
  shadow: '影',
};

export function bossKanji(id) {
  return has(BOSS_KANJI, id) ? BOSS_KANJI[id] : '影';
}

// ---- UI and duel words ---------------------------------------------------
export const UI_KANJI = {
  today: '本日',
  trial: '試練',
  chronicle: '記',
  forms: '型',
  seal: '印',
  nextSeal: '次の印',
  ranks: '位',
  season: '巻',
  vault: '蔵',
  rest: '休',
  stillness: '静',
  streak: '連',
  strike: '斬',
  perfect: '会心',
  combo: '連撃',
  ready: '構え',
  draw: '抜',
  finish: '止め',
  victory: '勝',
  newRecord: '新記録',
  new: '新',
  strength: '力',
  goshuin: '奉拝',
  again: '再',
};

// ---- Dates ---------------------------------------------------------------
const DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

// 0..99 in the traditional style: 五, 十, 十一, 二十, 三十一. '' if out of range.
export function kanjiNumber(n) {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v) || v < 0 || v > 99) return '';
  if (v < 10) return DIGITS[v];
  const tens = Math.floor(v / 10);
  const ones = v % 10;
  return `${tens > 1 ? DIGITS[tens] : ''}十${ones ? DIGITS[ones] : ''}`;
}

// Accepts a Date (local fields), a 'YYYY-MM-DD' string, or a timestamp.
// Returns '' for invalid input. Reiwa year = Gregorian - 2018; year 1 is 元.
export function toKanjiDate(date) {
  let y;
  let m;
  let d;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    [y, m, d] = date.slice(0, 10).split('-').map(Number);
  } else {
    if (date == null) return '';
    const dt = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(dt.getTime())) return '';
    y = dt.getFullYear();
    m = dt.getMonth() + 1;
    d = dt.getDate();
  }
  const reiwa = y - 2018;
  let yearText;
  if (reiwa === 1) yearText = '令和元年';
  else if (reiwa > 1) yearText = `令和${kanjiNumber(reiwa)}年`;
  else yearText = `${[...String(y)].map((c) => DIGITS[Number(c)]).join('')}年`;
  return `${yearText}${kanjiNumber(m)}月${kanjiNumber(d)}日`;
}
