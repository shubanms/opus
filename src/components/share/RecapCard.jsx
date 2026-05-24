import { forwardRef } from 'react';
import { DEFAULT_THEME } from './themes.js';
import { toDisplay, unitLabel } from '../../utils/units.js';

// 1080×1080 weekly recap share card. Rendered off-screen, captured by html2canvas.
const RecapCard = forwardRef(function RecapCard({ data, theme = DEFAULT_THEME }, ref) {
  const d = data ?? {};
  const { bg, text, sub, accent } = theme;
  const unit = d.unit ?? 'kg';
  const ulabel = unitLabel(unit);

  const stat = (value, label) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 64, fontWeight: 500, color: text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 26, color: sub, marginTop: 10 }}>{label}</div>
    </div>
  );

  return (
    <div ref={ref} style={{ width: 1080, height: 1080, background: bg, padding: 88, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', border: `4px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: accent }} />
          </div>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 52, fontWeight: 700, letterSpacing: 8, color: text }}>OPUS</span>
        </div>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 30, fontWeight: 600, color: text }}>{d.name || 'ATHLETE'}</span>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 38, fontWeight: 500, color: accent, letterSpacing: 2 }}>MY WEEK</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 104, fontWeight: 700, color: text, lineHeight: 1.02, marginTop: 6 }}>
          {d.sessions ?? 0} {d.sessions === 1 ? 'session' : 'sessions'}
        </div>
      </div>

      <div style={{ height: 4, marginTop: 44, marginBottom: 44, background: `linear-gradient(90deg, ${accent}, rgba(0,0,0,0))` }} />

      <div style={{ display: 'flex' }}>
        {stat(Math.round(toDisplay(d.volumeKg ?? 0, unit)).toLocaleString(), `Volume (${ulabel})`)}
        {stat(d.sets ?? 0, 'Sets')}
        {stat(d.prs ?? 0, 'PRs')}
      </div>

      {d.topLift && (
        <div style={{ marginTop: 48, alignSelf: 'flex-start', background: accent, color: '#111010', borderRadius: 9999, padding: '16px 32px', fontFamily: "'DM Sans', sans-serif", fontSize: 30, fontWeight: 600 }}>
          Top lift · {d.topLift}
        </div>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        {d.xp > 0 ? (
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 44, fontWeight: 500, color: accent }}>+{d.xp.toLocaleString()} XP</span>
        ) : <span />}
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 36, color: sub }}>Build your masterpiece.</span>
      </div>
    </div>
  );
});

export default RecapCard;
