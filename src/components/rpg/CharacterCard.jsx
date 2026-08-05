import { useEffect } from 'react';
import RadarChart from '../charts/RadarChart.jsx';
import { getXPProgress, getRankLabel, getPrestige, getTitle } from '../../utils/rpg.js';
import { useCharacterStats } from '../../hooks/useRPG.js';
import { useBossStats } from '../../hooks/useBosses.js';
import { cappedLevel } from '../../utils/bosses.js';
import { decayInfo } from '../../utils/decay.js';
import { monthKeyOf, saveSnapshot, getSnapshots, previousSnapshot, mergeRadarSeries } from '../../utils/snapshots.js';
import OpusMark from '../logo/OpusMark.jsx';
import TitleBadge from './TitleBadge.jsx';
import XPBar from './XPBar.jsx';

export default function CharacterCard({ profile }) {
  const stats = useCharacterStats();
  const bossStats = useBossStats();
  const { effectiveXp } = decayInfo(profile ?? {});
  const { level: rawLevel } = getXPProgress(effectiveXp);
  const prestige = getPrestige(effectiveXp);
  const level = bossStats ? cappedLevel(rawLevel, bossStats) : rawLevel;
  const title = prestige > 0 ? getRankLabel(effectiveXp) : getTitle(level);

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
        <XPBar totalXp={effectiveXp} />
      </div>
    </div>
  );
}
