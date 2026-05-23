import { forwardRef } from 'react';

const CHALK = '#F7F5F2';
const ASH = '#8A8780';
const GOLD = '#C9A84C';
const STONE = '#2C2C2C';
const OBSIDIAN = '#111010';

function formatDuration(secs) {
  const m = Math.floor((secs ?? 0) / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// 1080×1080 share card. Rendered off-screen and captured with html2canvas.
const ShareableCard = forwardRef(function ShareableCard({ data }, ref) {
  const d = data ?? {};
  const muscles = (d.muscles ?? []).slice(0, 4).map((m) => m.replace(/-/g, ' ')).join('  ·  ');

  const stat = (value, label) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 60, fontWeight: 500, color: CHALK, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 26, color: ASH, marginTop: 10 }}>
        {label}
      </div>
    </div>
  );

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1080,
        background: STONE,
        padding: 88,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', border: `4px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: OBSIDIAN }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: GOLD }} />
          </div>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 52, fontWeight: 700, letterSpacing: 8, color: CHALK }}>
            OPUS
          </span>
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, color: ASH }}>{formatDate(d.date)}</span>
      </div>

      {/* Title block */}
      <div style={{ marginTop: 'auto' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 100, fontWeight: 700, color: CHALK, lineHeight: 1.02 }}>
          {d.name || 'Workout'}
        </div>
        {muscles && (
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 30, letterSpacing: 3, textTransform: 'uppercase', color: ASH, marginTop: 18 }}>
            {muscles}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 4, marginTop: 44, marginBottom: 44, background: `linear-gradient(90deg, ${GOLD}, rgba(201,168,76,0))` }} />

      {/* Stats */}
      <div style={{ display: 'flex' }}>
        {stat((d.totalVolume ?? 0).toLocaleString(), 'Volume (kg)')}
        {stat(d.totalSets ?? 0, 'Sets')}
        {stat(formatDuration(d.duration), 'Duration')}
      </div>

      {/* PR */}
      {d.pr && (
        <div style={{ marginTop: 48, alignSelf: 'flex-start', background: GOLD, color: OBSIDIAN, borderRadius: 9999, padding: '16px 32px', fontFamily: "'DM Sans', sans-serif", fontSize: 30, fontWeight: 600 }}>
          PR · {d.pr.exercise ? `${d.pr.exercise} ` : ''}{d.pr.value} kg
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 40, fontWeight: 500, color: CHALK }}>LVL {d.level ?? 1}</span>
          {d.xpEarned > 0 && (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 40, fontWeight: 500, color: GOLD }}>+{d.xpEarned} XP</span>
          )}
        </div>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 36, color: ASH }}>
          Build your masterpiece.
        </span>
      </div>
    </div>
  );
});

export default ShareableCard;
