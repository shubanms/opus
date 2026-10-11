import { useState } from 'react';
import { Dumbbell, TrendingUp } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Particles from '../fx/Particles.jsx';
import { PROGRAMS, programDays } from '../../utils/programs.js';
import { installProgram } from '../../utils/templateActions.js';
import { stepLabel } from '../../utils/progression.js';
import { DAY_SHORT } from '../../utils/routineDays.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';
import useUIStore from '../../store/uiStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import { confirmReplaceWeek } from './confirmReplaceWeek.js';

// What the progression engine will actually do with this program, in the
// user's unit — the card's description stays unit-free.
function progressionLine(program, unit) {
  const { mode, weightStep, deloadAfterMisses } = program.progression;
  const own = new Map();
  for (const day of program.schedule) {
    for (const e of day.exercises) {
      if (e.step != null && e.step !== weightStep) own.set(e.name, e.step);
    }
  }
  const byStep = {};
  for (const [name, step] of own) (byStep[stepLabel(step, unit)] ??= []).push(name);
  const extra = Object.entries(byStep).map(([label, names]) => `${label} ${names.join(', ')}`);
  const rule = mode === 'linear' ? `deload after ${deloadAfterMisses} misses` : 'holds on a miss';
  return [`Auto ${stepLabel(weightStep, unit)}`, ...extra, rule].join(' · ');
}

export default function ProgramsModal({ isOpen, onClose, templates = [] }) {
  const haptic = useHaptics();
  const unit = useSettingsStore((s) => s.unit);
  const [burst, setBurst] = useState(null);
  const [installing, setInstalling] = useState(null);

  async function install(program) {
    if (installing) return;
    setInstalling(program.id);
    try {
      if (!(await confirmReplaceWeek(templates, programDays(program), program.name))) return;
      const n = await installProgram(program.id);
      haptic('pr'); playChime('quest'); setBurst(Date.now()); setTimeout(() => setBurst(null), 1300);
      useUIStore.getState().showToast(`Added "${program.name}" — ${n} routine${n === 1 ? '' : 's'}`, { type: 'success' });
      onClose();
    } catch (e) {
      console.error('Install program failed:', e);
      useUIStore.getState().showToast('Could not install that program', { type: 'error' });
    } finally {
      setInstalling(null);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Programs">
      {burst && <Particles key={burst} count={22} />}
      <p className="mb-3 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        <b style={{ color: 'var(--color-text-primary)' }}>Ready-made, named</b> programs (5×5, GZCLP, PPL…) — installing adds them as routines you can edit or delete, with progression switched on so targets advance as you train. (For a <b style={{ color: 'var(--color-text-primary)' }}>custom</b> auto-generated week, use <b style={{ color: 'var(--color-text-primary)' }}>Plan week</b> instead.)
      </p>
      <div className="flex flex-col gap-3">
        {PROGRAMS.map((p) => (
          <div key={p.id} className="rounded-2xl p-4" style={{ background: 'var(--color-ivory)' }}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{p.name}</h3>
              <span className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase" style={{ background: 'var(--color-chalk)', color: 'var(--color-ash)' }}>{p.level}</span>
            </div>
            <p className="mt-1 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>{p.desc}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.schedule.map((d) => (
                <span key={d.name} className="rounded-full px-2 py-0.5 font-sans text-[11px]" style={{ background: 'var(--color-chalk)', color: 'var(--color-text-primary)' }}>
                  {DAY_SHORT[d.dayOfWeek]} · {d.name} · {d.exercises.length}
                </span>
              ))}
            </div>
            <p className="mt-2 flex items-start gap-1 font-sans text-[11px]" style={{ color: 'var(--color-ash)' }}>
              <TrendingUp size={12} className="mt-px shrink-0" style={{ color: 'var(--color-gold)' }} /> {progressionLine(p, unit)}
            </p>
            <button
              type="button"
              onClick={() => install(p)}
              disabled={installing != null}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 font-sans text-sm font-semibold"
              style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)', opacity: installing === p.id ? 0.6 : 1 }}
            >
              <Dumbbell size={14} /> {installing === p.id ? 'Adding…' : `Add ${p.daysPerWeek}-day program`}
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
