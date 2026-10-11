// Collects every CJK character used under src/ plus the fixed Ink kanji set
// (HANDOFF §8.6) into scripts/glyphs.txt, which scripts/subset-fonts.py feeds
// to pyftsubset. Run: node scripts/collect-glyphs.mjs
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const CJK_RE = /[\u3000-\u303F\u3040-\u30FF\u4E00-\u9FFF\uFF00-\uFFEF]/g;

// The kanji system and UI words the design commits to, even before any
// screen uses them. Keep in step with HANDOFF §8.6.
export const FIXED =
  '胸肩腕背脚腹息押挙沈蹲引礼漕片懸曲伸翼踏踵橋支縮捻竦運走歩輪登跳' +
  '月火水木金土日戦撃記鉄刻連初誓磨意鍛精巧伝傑作志誠百七不屈十重万錬剛円破頂暁梟匠' +
  '巨龍鬼岳冶影本試練型印次の位巻蔵休静斬会心抜止勝新力奉拝再構えを' +
  '令和年一二三四五六八九、。「」・' +
  '0123456789';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|jsx|css|json)$/.test(name)) out.push(p);
  }
  return out;
}

export function collect() {
  const set = new Set(FIXED);
  for (const file of walk(join(root, 'src'))) {
    for (const ch of readFileSync(file, 'utf8').match(CJK_RE) ?? []) set.add(ch);
  }
  return [...set].sort().join('');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const glyphs = collect();
  writeFileSync(join(root, 'scripts', 'glyphs.txt'), `${glyphs}\n`, 'utf8');
  console.log(`glyphs.txt: ${[...glyphs].length} characters`);
}
