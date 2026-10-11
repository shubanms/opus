// The ensō level ring, drawn inside the sky SVG (so it shares the sky's
// coordinate space). A faint full track plus a brushed progress stroke that
// writes on over 1.2 s. Everything is centred on (195, 196), sun radius 62.
const TRACK = 'M 116.07 224.73 A 84 84 0 1 1 254.40 255.40';

export default function EnsoRing({ pal, progress = 0, live }) {
  const p = Math.max(0, Math.min(1, progress));
  const len = Math.max(p * 100, 2);
  return (
    <g filter="url(#ink-brush)">
      <path d={TRACK} pathLength="100" fill="none" stroke={pal.enso} strokeWidth="9" strokeLinecap="round" opacity="0.28" />
      <path
        d={TRACK}
        pathLength="100"
        fill="none"
        stroke={pal.enso}
        strokeWidth="17"
        strokeLinecap="round"
        strokeDasharray={`${len} 400`}
        className={live ? 'hm-write' : undefined}
        style={{ '--hm-len': len }}
      />
      <ellipse cx="117.5" cy="226.5" rx="12.6" ry="10" transform="rotate(-30 117.5 226.5)" fill={pal.enso} />
      <path d="M 117.15 216.86 A 80.6 80.6 0 1 1 270.74 223.57" fill="none" stroke={pal.streak} strokeWidth="1.3" strokeDasharray="24 11 6 16 40 8 12 20" opacity="0.85" />
      <path d="M 108.93 211.18 A 87.4 87.4 0 0 1 270.69 152.3" fill="none" stroke={pal.streak} strokeWidth="1.1" strokeDasharray="12 18 26 7 9 14" opacity="0.8" />
      <path d="M 278.63 226.44 A 89 89 0 0 1 246.05 268.9" fill="none" stroke={pal.enso} strokeWidth="2" strokeDasharray="6 3 10 4" opacity="0.55" />
    </g>
  );
}
