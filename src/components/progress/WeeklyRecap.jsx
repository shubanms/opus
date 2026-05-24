import { X, Dumbbell, Zap, Trophy, Layers } from 'lucide-react';
import { useWeeklyRecap } from '../../hooks/useWeeklyRecap.js';
import { useRPG } from '../../hooks/useRPG.js';
import useSettingsStore from '../../store/settingsStore.js';
import { fmtVolume } from '../../utils/units.js';
import ShareButton from '../share/ShareButton.jsx';
import RecapCard from '../share/RecapCard.jsx';
import CountUp from '../fx/CountUp.jsx';

function Stat({ icon: Icon, value, label, countTo, effects }) {
  return (
    <div className="flex-1">
      <Icon size={14} style={{ color: 'var(--color-gold)' }} />
      <p className="mt-1 font-mono text-lg font-semibold" style={{ color: 'var(--color-text-inverse)' }}>
        {countTo != null && effects ? <CountUp value={countTo} /> : value}
      </p>
      <p className="font-sans text-[11px]" style={{ color: 'var(--color-ash)' }}>{label}</p>
    </div>
  );
}

export default function WeeklyRecap({ dismissible = true }) {
  const recap = useWeeklyRecap();
  const { profile } = useRPG();
  const unit = useSettingsStore((s) => s.unit);
  const effects = useSettingsStore((s) => s.effects);
  const dismissedWeek = useSettingsStore((s) => s.recapDismissedWeek);
  const setDismissed = useSettingsStore((s) => s.setRecapDismissedWeek);

  if (!recap.hasData) return null;
  if (dismissible && dismissedWeek === recap.weekKey) return null;

  const shareData = {
    name: profile?.name || 'Athlete',
    sessions: recap.sessions,
    volumeKg: recap.volumeKg,
    unit,
    sets: recap.sets,
    prs: recap.prCount,
    xp: recap.xp,
    topLift: recap.topLift,
  };

  return (
    <div className="mb-6 rounded-2xl p-4" style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-stone)' }}>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-gold)' }}>
          Your week so far
        </p>
        {dismissible && (
          <button onClick={() => setDismissed(recap.weekKey)} aria-label="Dismiss recap">
            <X size={15} style={{ color: 'var(--color-ash)' }} />
          </button>
        )}
      </div>

      <div className="flex">
        <Stat icon={Dumbbell} value={recap.sessions} countTo={recap.sessions} effects={effects} label="Sessions" />
        <Stat icon={Layers} value={fmtVolume(recap.volumeKg, unit)} label="Volume" />
        <Stat icon={Trophy} value={recap.prCount} countTo={recap.prCount} effects={effects} label="PRs" />
        <Stat icon={Zap} value={recap.xp.toLocaleString()} countTo={recap.xp} effects={effects} label="XP" />
      </div>

      {recap.topLift && (
        <p className="mt-3 font-sans text-xs" style={{ color: 'var(--color-ash)' }}>
          Top lift this week — <span style={{ color: 'var(--color-text-inverse)' }}>{recap.topLift}</span>
        </p>
      )}

      <ShareButton
        data={shareData}
        CardComponent={RecapCard}
        filename="opus-week.png"
        label="Share my week"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 font-sans text-sm font-semibold"
        style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
      />
    </div>
  );
}
