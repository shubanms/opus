import { useState } from 'react';
import { Dumbbell, Trophy, Weight, Footprints, ListChecks, Layers, Flame, Mountain, Check } from 'lucide-react';
import { useQuests } from '../../hooks/useQuests.js';
import { claimQuest } from '../../utils/questActions.js';
import useSettingsStore from '../../store/settingsStore.js';
import { toDisplay, unitLabel } from '../../utils/units.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';
import Particles from '../fx/Particles.jsx';

const ICONS = {
  dumbbell: Dumbbell, trophy: Trophy, weight: Weight, footprints: Footprints,
  listChecks: ListChecks, layers: Layers, flame: Flame, mountain: Mountain,
};

export default function QuestBoard() {
  const { weekKey, quests } = useQuests();
  const unit = useSettingsStore((s) => s.unit);
  const haptic = useHaptics();
  const [burst, setBurst] = useState(false);

  if (!quests.length) return null;

  async function handleClaim(q) {
    const ok = await claimQuest({ weekKey, questId: q.id, xp: q.xp });
    if (ok) {
      haptic('pr');
      playChime('quest');
      setBurst(true);
      setTimeout(() => setBurst(false), 1300);
    }
  }

  const fmt = (q, v) => (q.volume ? Math.round(toDisplay(v, unit)) : v).toLocaleString();
  const targetText = (q) => (q.volume ? `Lift ${fmt(q, q.target)} ${unitLabel(unit)} total` : q.desc);
  const claimedCount = quests.filter((q) => q.claimed).length;

  return (
    <>
      {burst && <Particles />}
      <div className="rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            This week's quests
          </p>
          <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {claimedCount}/{quests.length}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {quests.map((q) => {
            const Icon = ICONS[q.icon] ?? Dumbbell;
            const claimable = q.done && !q.claimed;
            return (
              <div key={q.id} className="rounded-xl p-3" style={{ background: 'var(--color-ivory)' }}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: q.claimed ? 'var(--color-sage)' : 'var(--color-chalk)' }}
                  >
                    {q.claimed
                      ? <Check size={15} style={{ color: 'var(--color-text-inverse)' }} />
                      : <Icon size={15} style={{ color: 'var(--color-gold)' }} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{q.title}</p>
                    <p className="truncate font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>{targetText(q)}</p>
                  </div>
                  {claimable ? (
                    <button
                      onClick={() => handleClaim(q)}
                      className="shrink-0 rounded-lg px-3 py-1.5 font-sans text-xs font-semibold"
                      style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', animation: 'goldPulse 2.6s var(--opus-ease-out) infinite' }}
                    >
                      +{q.xp} XP
                    </button>
                  ) : (
                    <span
                      className="shrink-0 font-mono text-xs"
                      style={{ color: q.claimed ? 'var(--color-sage)' : 'var(--color-text-secondary)' }}
                    >
                      {q.claimed ? 'Claimed' : `${fmt(q, q.current)}/${fmt(q, q.target)}`}
                    </span>
                  )}
                </div>
                {!q.claimed && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--color-chalk)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.round(q.pct * 100)}%`, background: q.done ? 'var(--color-gold)' : 'var(--color-sage)', transition: 'width 0.8s var(--opus-ease-out)' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {claimedCount === quests.length && (
          <p className="mt-3 text-center font-sans text-xs" style={{ color: 'var(--color-sage)' }}>
            All quests cleared — fresh ones every Monday.
          </p>
        )}
      </div>
    </>
  );
}
