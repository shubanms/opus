import { forwardRef } from 'react';
import { DEFAULT_THEME } from './themes.js';

// 1080×1080 profile share card: level, title, character stats, totals.
const ProfileCard = forwardRef(function ProfileCard({ data, theme = DEFAULT_THEME }, ref) {
  const d = data ?? {};
  const { bg, text, sub, accent } = theme;
  const stats = d.stats ?? [];
  const prestige = Math.min(d.prestige ?? 0, 5);

  const tile = (value, label) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 56, fontWeight: 500, color: text, lineHeight: 1 }}>{value}</div>
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
          {prestige > 0 && (
            <div style={{ display: 'flex', gap: 8, marginLeft: 4 }}>
              {Array.from({ length: prestige }, (_, i) => (
                <div key={i} style={{ width: 16, height: 16, background: accent, transform: 'rotate(45deg)' }} />
              ))}
            </div>
          )}
        </div>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 30, fontWeight: 600, color: text }}>{d.name || 'ATHLETE'}</span>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 40, fontWeight: 500, color: accent, letterSpacing: 2 }}>LEVEL {d.level ?? 1}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 104, fontWeight: 700, color: text, lineHeight: 1.02, marginTop: 6 }}>{d.title || 'First Rep'}</div>
      </div>

      <div style={{ height: 4, marginTop: 44, marginBottom: 44, background: `linear-gradient(90deg, ${accent}, rgba(0,0,0,0))` }} />

      {/* Character stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {stats.map((s) => (
          <div key={s.axis} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span style={{ width: 280, fontFamily: "'DM Sans', sans-serif", fontSize: 28, color: sub }}>{s.axis}</span>
            <div style={{ flex: 1, height: 16, borderRadius: 9999, background: 'rgba(138,135,128,0.25)', overflow: 'hidden' }}>
              <div style={{ width: `${s.value}%`, height: '100%', background: accent, borderRadius: 9999 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex' }}>
        {tile(d.workouts ?? 0, 'Workouts')}
        {tile(d.streak ?? 0, 'Day streak')}
        {tile((d.totalXp ?? 0).toLocaleString(), 'Total XP')}
      </div>

      <div style={{ marginTop: 56, textAlign: 'right' }}>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 36, color: sub }}>Build your masterpiece.</span>
      </div>
    </div>
  );
});

export default ProfileCard;
