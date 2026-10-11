// Ink seals for the Vault's title flairs (HANDOFF 9.8). The catalogue in
// economy.js keeps its ids, prices and rarities; only the glyph shown changes.
// Every kanji here is already in scripts/glyphs.txt.
const FLAIR_SEAL = {
  flair_ironclad: '鉄',
  flair_ember: '火',
  flair_bolt: '力',
  flair_crown: '金',
  flair_skull: '鬼',
  flair_star: '日',
  flair_dragon: '龍',
  flair_trophy: '勝',
};

export function flairSeal(id) {
  return Object.prototype.hasOwnProperty.call(FLAIR_SEAL, id) ? FLAIR_SEAL[id] : '印';
}
