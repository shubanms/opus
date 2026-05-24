import { useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { getXPProgress, getRankLabel, getPrestige } from '../../utils/rpg.js';
import { useCharacterStats } from '../../hooks/useRPG.js';
import { monthKeyOf, saveSnapshot, getSnapshots, previousSnapshot, mergeRadarSeries } from '../../utils/snapshots.js';
import OpusMark from '../logo/OpusMark.jsx';
import TitleBadge from './TitleBadge.jsx';
import XPBar from './XPBar.jsx';

const GOLD = '#C9A84C';
const ASH = '#8A8780';

export default function CharacterCard({ profile }) {
  const stats = useCharacterStats();
  const totalXp = profile?.totalXp ?? 0;
  const { level } = getXPProgress(totalXp);
  const prestige = getPrestige(totalXp);
  const title = getRankLabel(totalXp);

  // Keep this month's snapshot fresh; overlay the most recent prior month.
  useEffect(() => {
    if (stats.length) saveSnapshot(stats);
  }, [stats]);
  const prev = previousSnapshot(getSnapshots(), monthKeyOf());
  const radarData = mergeRadarSeries(stats, prev);
  const showHistory = !!prev;

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
        <OpusMark size={72} level={level} prestige={prestige} />
      </div>

      <div className="mt-2">
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={radarData} outerRadius="72%">
            <PolarGrid stroke={ASH} strokeOpacity={0.3} />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fill: ASH, fontSize: 11, fontFamily: 'DM Sans, sans-serif' }}
            />
            {showHistory && (
              <Radar dataKey="valuePrev" stroke={ASH} fill={ASH} fillOpacity={0.12} strokeDasharray="4 4" />
            )}
            <Radar dataKey="value" stroke={GOLD} fill={GOLD} fillOpacity={0.45} />
          </RadarChart>
        </ResponsiveContainer>
        {showHistory && (
          <div className="-mt-1 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1.5 font-sans text-[11px]" style={{ color: 'var(--color-ash)' }}>
              <span style={{ width: 10, height: 3, borderRadius: 2, background: GOLD }} /> Now
            </span>
            <span className="flex items-center gap-1.5 font-sans text-[11px]" style={{ color: 'var(--color-ash)' }}>
              <span style={{ width: 10, height: 0, borderTop: `2px dashed ${ASH}` }} /> Last month
            </span>
          </div>
        )}
      </div>

      <div className="mt-2">
        <XPBar totalXp={totalXp} />
      </div>
    </div>
  );
}
