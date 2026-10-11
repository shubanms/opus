import { useEffect } from 'react';
import RadarChart from '../charts/RadarChart.jsx';
import { useCharacterStats } from '../../hooks/useRPG.js';
import { monthKeyOf, saveSnapshot, getSnapshots, previousSnapshot, mergeRadarSeries } from '../../utils/snapshots.js';
import '../../styles/ink-you.css';

/**
 * The character radar (five axes, this month over last month's dashed shape).
 * Keeps this month's snapshot fresh as a side effect. Level, title and XP live
 * in the hero above it, from the one shield-aware useEffectiveXp.
 */
export default function CharacterCard({ className = '' }) {
  const stats = useCharacterStats();

  // Keep this month's snapshot fresh; overlay the most recent prior month.
  useEffect(() => {
    if (stats.length) saveSnapshot(stats);
  }, [stats]);
  const prev = previousSnapshot(getSnapshots(), monthKeyOf());
  const radarData = mergeRadarSeries(stats, prev);

  return (
    <div className={`you-radar ${className}`}>
      <RadarChart data={radarData} />
    </div>
  );
}
