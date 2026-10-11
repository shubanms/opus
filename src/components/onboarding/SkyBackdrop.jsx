import useSky from '../home/useSky.js';
import { SKY_PALETTES } from '../home/skyPalettes.js';
import '../../styles/ink-system.css';

/**
 * A still sky for the first-run screens: the current sky's gradient, a sun
 * disc and three ridges. Static by design (no loops), so it needs no motion
 * gating. Scene colours come from the Home palettes.
 */
export default function SkyBackdrop() {
  const pal = SKY_PALETTES[useSky()];
  return (
    <div className="sy-sky" aria-hidden="true" style={{ '--sy-top': pal.skyTop, '--sy-mid': pal.skyMid, '--sy-bot': pal.skyBottom }}>
      <svg className="sy-sky__svg" viewBox="0 0 390 844" preserveAspectRatio="xMidYMax slice">
        <defs>
          <radialGradient id="syGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={pal.glow} stopOpacity="0.55" />
            <stop offset="1" stopColor={pal.glow} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="195" cy="250" r="190" fill="url(#syGlow)" />
        <circle cx="195" cy="250" r="58" fill={pal.disc} />
        <path d="M0 560 L60 520 L110 548 L190 470 L250 530 L320 490 L390 540 L390 844 L0 844Z" fill={pal.mount1} />
        <path d="M0 640 L70 600 L140 640 L220 575 L300 628 L390 590 L390 844 L0 844Z" fill={pal.mount2} />
        <path d="M0 730 L90 700 L180 730 L270 690 L390 725 L390 844 L0 844Z" fill={pal.mount3} />
      </svg>
      <div className="sy-sky__veil" />
    </div>
  );
}
