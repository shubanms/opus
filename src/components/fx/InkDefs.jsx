/**
 * Shared SVG filters. Mounted once in AppLayout; components reference them with
 * filter="url(#ink-brush)" etc. Use on small elements only, never full-screen.
 */
export default function InkDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <filter id="ink-brush" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="4" result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale="6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="ink-brush-fine" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="31" result="t" />
          <feDisplacementMap in="SourceGraphic" in2="t" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="ink-stamp" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="3" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -4 3.1" result="mask" />
          <feComposite in="SourceGraphic" in2="mask" operator="in" result="speckled" />
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="9" result="warp" />
          <feDisplacementMap in="speckled" in2="warp" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="ink-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
    </svg>
  );
}
