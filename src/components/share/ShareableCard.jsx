import { forwardRef } from 'react';
import { DEFAULT_THEME } from './themes.js';

function formatDuration(secs) {
  const m = Math.floor((secs ?? 0) / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// 1080×1080 workout share card. Rendered off-screen and captured with html2canvas.
const ShareableCard = forwardRef(function ShareableCard({ data, theme = DEFAULT_THEME }, ref) {
  const d = data ?? {};
  const { bg, text, sub, accent } = theme;
  const muscles = (d.muscles ?? []).slice(0, 4).map((m) => m.replace(/-/g, ' ')).join('  ·  ');

  const stat = (value, label) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 60, fontWeight: 500, color: text, lineHeight: 1 }}>{value}</div>
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
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, color: sub }}>{formatDate(d.date)}</span>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 100, fontWeight: 700, color: text, lineHeight: 1.02 }}>{d.name || 'Workout'}</div>
        {muscles && (
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 30, letterSpacing: 3, textTransform: 'uppercase', color: sub, marginTop: 18 }}>{muscles}</div>
        )}
      </div>

      <div style={{ height: 4, marginTop: 44, marginBottom: 44, background: `linear-gradient(90deg, ${accent}, rgba(0,0,0,0))` }} />

      <div style={{ display: 'flex' }}>
        {stat((d.totalVolume ?? 0).toLocaleString(), 'Volume (kg)')}
        {stat(d.totalSets ?? 0, 'Sets')}
        {stat(formatDuration(d.duration), 'Duration')}
      </div>

      {d.pr && (
        <div style={{ marginTop: 48, alignSelf: 'flex-start', background: accent, color: '#111010', borderRadius: 9999, padding: '16px 32px', fontFamily: "'DM Sans', sans-serif", fontSize: 30, fontWeight: 600 }}>
          PR · {d.pr.exercise ? `${d.pr.exercise} ` : ''}{d.pr.value} kg
        </div>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 40, fontWeight: 500, color: text }}>LVL {d.level ?? 1}</span>
          {d.xpEarned > 0 && (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 40, fontWeight: 500, color: accent }}>+{d.xpEarned} XP</span>
          )}
        </div>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 36, color: sub }}>Build your masterpiece.</span>
      </div>
    </div>
  );
});

export default ShareableCard;
