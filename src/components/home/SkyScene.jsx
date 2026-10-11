import { GRASS_TOPS } from './skyPalettes.js';
import EnsoRing from './EnsoRing.jsx';
import '../../styles/ink-home.css';

const LEAVES = [
  { top: 150, size: 13, fill: 'var(--ver)', dur: 9, delay: -2 },
  { top: 300, size: 14, fill: 'var(--ver)', dur: 8, delay: -5 },
  { top: 232, size: 10, fill: 'var(--gold-leaf)', dur: 12, delay: -7 },
];
const FIREFLIES = [
  [60, 350, 1.8, 3.2, -0.4],
  [122, 332, 1.5, 2.7, -1.6],
  [244, 340, 1.6, 3, -0.9],
  [352, 358, 1.5, 3.4, -2.6],
];
const BIRDS = [
  { d: 'M34 128 q 6 -5 12 0 q 6 -5 12 0', w: 1.7, dur: 0.7, delay: 0 },
  { d: 'M58 142 q 5 -4 10 0 q 5 -4 10 0', w: 1.5, dur: 0.62, delay: -0.2 },
  { d: 'M26 150 q 4 -3.5 8 0 q 4 -3.5 8 0', w: 1.3, dur: 0.66, delay: -0.4 },
];
const WINDS = [
  { d: 'M -20 150 C 80 172, 140 262, 196 336 S 262 470, 214 544', w: 1.4, da: '70 650', delay: 0 },
  { d: 'M -30 250 C 60 258, 128 326, 170 400 S 214 500, 188 546', w: 1.1, da: '50 670', delay: -1.4 },
  { d: 'M 410 128 C 334 178, 304 266, 292 346 S 262 482, 238 548', w: 1.2, da: '60 660', delay: -2.8 },
];

/**
 * The painted pass: sky, sun with the ensō ring, three ridges, mist, ronin,
 * 24 pampas blades. Loops (`live`) are CSS transform/opacity only and exist
 * only when effects are on and motion is not reduced.
 */
export default function SkyScene({ pal, level, title, sealKanji, caption, live }) {
  return (
    <div className={`hm-sky${live ? ' hm-live' : ''}`}>
      <svg
        role="img"
        aria-label={`Ink painting of a mountain pass: the sun inside a brushed ring showing level ${level}, a lone warrior on a ridge, and pampas grass bending in the wind`}
        viewBox="0 0 390 470"
        className="hm-sky__svg"
      >
        <defs>
          <linearGradient id="hmSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={pal.skyTop} />
            <stop offset="0.55" stopColor={pal.skyMid} />
            <stop offset="1" stopColor={pal.skyBottom} />
          </linearGradient>
          <radialGradient id="hmGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={pal.glow} stopOpacity="0.6" />
            <stop offset="0.45" stopColor={pal.glow} stopOpacity="0.18" />
            <stop offset="1" stopColor={pal.glow} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hmMist" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={pal.mist} stopOpacity="0.34" />
            <stop offset="1" stopColor={pal.mist} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="hmFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--ink-1)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--ink-1)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <rect width="390" height="470" fill="url(#hmSky)" />
        <circle cx="195" cy="196" r="160" fill="url(#hmGlow)" className="hm-glow" />
        <circle cx="195" cy="196" r="62" fill={pal.disc} />
        {pal.night ? (
          <g>
            <circle cx="176" cy="182" r="13" fill="rgba(110,102,88,0.2)" />
            <circle cx="214" cy="212" r="9" fill="rgba(110,102,88,0.16)" />
            <circle cx="207" cy="172" r="5" fill="rgba(110,102,88,0.16)" />
            <circle cx="186" cy="222" r="4" fill="rgba(110,102,88,0.14)" />
          </g>
        ) : (
          <g className="hm-birds">
            {BIRDS.map((b) => (
              <path key={b.d} d={b.d} fill="none" stroke={pal.birds} strokeWidth={b.w} strokeLinecap="round" className="hm-flap" style={{ animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }} />
            ))}
          </g>
        )}
        <EnsoRing pal={pal} live={live} />
        <text x="195" y="218" textAnchor="middle" fill={pal.levelInk} style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 64 }}>{level}</text>
        <text x="195" y="241" textAnchor="middle" fill={pal.levelInk} opacity="0.85" style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: String(title).length > 9 ? 10 : 11, letterSpacing: String(title).length > 9 ? '0.2em' : '0.34em' }}>{String(title).toUpperCase()}</text>
        <path d="M0 310 L0 278 C 22 268, 40 260, 62 256 C 84 252, 98 246, 116 250 C 138 255, 156 248, 176 244 C 196 240, 214 250, 236 254 C 258 258, 276 246, 298 242 C 322 238, 344 250, 366 256 C 376 259, 384 260, 390 260 L390 310 Z" fill={pal.mount1} />
        <ellipse cx="190" cy="278" rx="230" ry="22" fill="url(#hmMist)" className="hm-mist-a" />
        <g transform="translate(264 246) rotate(6)" filter="url(#ink-stamp)">
          <rect x="-13" y="-13" width="26" height="26" rx="3" fill="var(--ver)" />
          <text x="0" y="1" lang="ja" textAnchor="middle" dominantBaseline="central" fill="var(--washi-3)" style={{ fontFamily: 'var(--font-brush)', fontSize: sealKanji.length > 1 ? 11 : 17 }}>{sealKanji}</text>
        </g>
        <path d="M0 350 L0 256 C 14 248, 28 242, 42 246 C 58 251, 70 268, 92 278 C 118 290, 146 300, 180 304 C 212 308, 238 302, 262 294 C 288 284, 312 268, 336 260 C 354 254, 372 256, 390 264 L390 350 Z" fill={pal.mount2} />
        <text x="195" y="326" textAnchor="middle" fill={pal.caption} style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12 }}>{caption}</text>
        <ellipse cx="220" cy="330" rx="250" ry="24" fill="url(#hmMist)" className="hm-mist-b" />
        <path d="M0 366 C 34 360, 70 366, 104 380 C 126 390, 142 400, 160 410 L160 470 L0 470 Z" fill={pal.mount3} />
        <path d="M150 410 C 200 382, 250 356, 300 348 C 330 344, 362 346, 390 352 L390 470 L150 470 Z" fill={pal.mount3} />
        <g transform="translate(324 347)">
          <g fill={pal.figure} stroke={pal.rim} strokeWidth="0.8" strokeLinejoin="round">
            <path d="M6 -46 C 18 -45, 28 -41, 40 -43 C 33 -37, 22 -34, 8 -35 Z" className="hm-cloak" />
            <path d="M-7 -46 C -9 -36, -10 -22, -11 -8 L -10 0 L -2 0 L 0 -16 L 2 0 L 10 0 C 11 -12, 10 -30, 8 -46 Z" />
            <path d="M-4 -50 L 4 -50 L 3 -45 L -3 -45 Z" />
            <path d="M-17 -50 Q 0 -66 17 -50 Q 0 -46 -17 -50 Z" />
            <path d="M4 -30 L 23 -37 L 24 -35 L 5 -28 Z" />
          </g>
          <path d="M9 -51 C 15 -50, 19 -47, 26 -48" fill="none" stroke={pal.figure} strokeWidth="1.1" strokeLinecap="round" className="hm-cloak hm-cloak--b" />
        </g>
        <path d="M0 414 C 70 406, 150 408, 230 416 C 290 422, 340 420, 390 412 L390 470 L0 470 Z" fill={pal.ground} />
        <g fill="none" strokeLinecap="round">
          {GRASS_TOPS.map((top, i) => {
            const x = 6 + i * 16;
            const delay = -((x / 390) * 3.4);
            return (
              <g key={x} className="hm-blade" style={{ animationDelay: `${delay.toFixed(2)}s` }}>
                <path d={`M${x} 470 C ${x + 1} 444, ${x + 3} 420, ${x + 5} ${top}`} stroke={pal.grass} strokeWidth="1.5" />
                <path d={`M${x + 5} ${top} C ${x + 8} ${top - 9}, ${x + 7} ${top - 19}, ${x + 12} ${top - 28}`} stroke={pal.plume} strokeWidth="4" opacity="0.9" />
              </g>
            );
          })}
        </g>
        {pal.night ? (
          <g>
            {FIREFLIES.map(([cx, cy, r, dur, delay]) => (
              <circle key={cx} cx={cx} cy={cy} r={r} fill="var(--gold-leaf)" className="hm-fly" style={{ animationDuration: `${dur}s`, animationDelay: `${delay}s` }} />
            ))}
          </g>
        ) : null}
        <rect x="0" y="330" width="390" height="140" fill="url(#hmFade)" />
      </svg>
      {live ? (
        <div aria-hidden className="hm-leaves">
          {LEAVES.map((l) => (
            <svg key={l.top} viewBox="0 0 12 12" className="hm-leaf" style={{ top: l.top, width: l.size, height: l.size, fill: l.fill, animationDuration: `${l.dur}s`, animationDelay: `${l.delay}s` }}>
              <path d="M0 6 C 3 0, 9 0, 12 6 C 9 12, 3 12, 0 6 Z" />
            </svg>
          ))}
        </div>
      ) : null}
      <svg aria-hidden viewBox="0 0 390 560" className="hm-wind">
        {WINDS.map((w) => (
          <path key={w.d} d={w.d} fill="none" stroke={pal.wind} strokeWidth={w.w} strokeLinecap="round" strokeDasharray={w.da} className="hm-windline" style={{ animationDelay: `${w.delay}s` }} />
        ))}
      </svg>
    </div>
  );
}
