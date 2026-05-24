import { forwardRef } from 'react';
import { DEFAULT_THEME } from './themes.js';
import { toDisplay, unitLabel } from '../../utils/units.js';

// 1080×1080 "Wrapped" share card for a month or year. Off-screen + html2canvas.
const WrappedCard = forwardRef(function WrappedCard({ data, theme = DEFAULT_THEME }, ref) {
  const d = data ?? {};
  const { bg, text, sub, accent } = theme;
  const unit = d.unit ?? 'kg';
  const ulabel = unitLabel(unit);
  const series = (d.series ?? []).slice(-16);
  const peak = series.length ? Math.max(...series) : 1;

  const stat = (value, label) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 56, fontWeight: 500, color: text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 24, color: sub, marginTop: 10 }}>{label}</div>
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
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 38, fontWeight: 500, color: accent, letterSpacing: 2 }}>WRAPPED · {(d.label || '').toUpperCase()}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 104, fontWeight: 700, color: text, lineHeight: 1.02, marginTop: 6 }}>
          {Math.round(toDisplay(d.volumeKg ?? 0, unit)).toLocaleString()} {ulabel}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 28, color: sub, marginTop: 6 }}>lifted across {d.sessions ?? 0} {d.sessions === 1 ? 'session' : 'sessions'}</div>
      </div>

      {/* Sparkline */}
      {series.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90, marginTop: 36 }}>
          {series.map((v, i) => (
            <div key={i} style={{ flex: 1, height: `${Math.max(6, (v / peak) * 100)}%`, background: accent, borderRadius: 4, opacity: 0.55 + 0.45 * (v / peak) }} />
          ))}
        </div>
      )}

      <div style={{ height: 4, marginTop: 40, marginBottom: 40, background: `linear-gradient(90deg, ${accent}, rgba(0,0,0,0))` }} />

      <div style={{ display: 'flex' }}>
        {stat(d.sets ?? 0, 'Sets')}
        {stat(d.prs ?? 0, 'PRs')}
        {stat(`${Math.round(d.hours ?? 0)}h`, 'Trained')}
      </div>

      <div style={{ marginTop: 40, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {d.topLift && (
          <span style={{ background: accent, color: '#111010', borderRadius: 9999, padding: '14px 28px', fontSize: 28, fontWeight: 600 }}>Top lift · {d.topLift}</span>
        )}
        {d.busiestDay && (
          <span style={{ border: `2px solid ${sub}`, color: text, borderRadius: 9999, padding: '14px 28px', fontSize: 28, fontWeight: 600 }}>Busiest · {d.busiestDay}</span>
        )}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        {d.xp > 0 ? (
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 40, fontWeight: 500, color: accent }}>+{d.xp.toLocaleString()} XP</span>
        ) : <span />}
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 34, color: sub }}>Build your masterpiece.</span>
      </div>
    </div>
  );
});

export default WrappedCard;
