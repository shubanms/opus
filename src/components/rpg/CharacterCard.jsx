import { useEffect } from 'react';
import RadarChart from '../charts/RadarChart.jsx';
import { useCharacterStats } from '../../hooks/useRPG.js';
import { useEffectiveXp } from '../../hooks/useEffectiveXp.js';
import { monthKeyOf, saveSnapshot, getSnapshots, previousSnapshot, mergeRadarSeries } from '../../utils/snapshots.js';
import OpusMark from '../logo/OpusMark.jsx';
import TitleBadge from './TitleBadge.jsx';
import XPBar from './XPBar.jsx';

export default function CharacterCard({ profile }) {
  const stats = useCharacterStats();
  // The same level, title and XP as everywhere else: shield-aware and capped
  // at an uncleared boss gate. The card used to say "Lv. 20" above a bar that
  // said "Level 23", and to keep charging an XP penalty a rest token had waived.
  const { effectiveXp, level, prestige, title } = useEffectiveXp(profile);

  // Keep this month's snapshot fresh; overlay the most recent prior month.
  useEffect(() => {
    if (stats.length) saveSnapshot(stats);
  }, [stats]);
  const prev = previousSnapshot(getSnapshots(), monthKeyOf());
  const radarData = mergeRadarSeries(stats, prev);

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
        <RadarChart data={radarData} />
      </div>

      <div className="mt-2">
        <XPBar totalXp={effectiveXp} level={level} />
      </div>
    </div>
  );
}
