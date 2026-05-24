import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { getXPProgress, getRankLabel } from '../../utils/rpg.js';
import { useCharacterStats } from '../../hooks/useRPG.js';
import TitleBadge from './TitleBadge.jsx';
import XPBar from './XPBar.jsx';

const GOLD = '#C9A84C';
const ASH = '#8A8780';

export default function CharacterCard({ profile }) {
  const stats = useCharacterStats();
  const totalXp = profile?.totalXp ?? 0;
  const { level } = getXPProgress(totalXp);
  const title = getRankLabel(totalXp);

  return (
    <div
      className="rounded-2xl px-4 pb-4 pt-5"
      style={{ background: 'var(--color-stone)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-3xl font-semibold" style={{ color: 'var(--color-text-inverse)' }}>
            Lv. {level}
          </p>
          <div className="mt-1">
            <TitleBadge title={title} />
          </div>
        </div>
      </div>

      <div className="mt-2">
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={stats} outerRadius="72%">
            <PolarGrid stroke={ASH} strokeOpacity={0.3} />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: ASH, fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
            />
            <Radar dataKey="value" stroke={GOLD} fill={GOLD} fillOpacity={0.45} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2">
        <XPBar totalXp={totalXp} />
      </div>
    </div>
  );
}
