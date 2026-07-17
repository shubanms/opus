import { useState } from 'react';
import { Dumbbell, Check } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Particles from '../fx/Particles.jsx';
import { PROGRAMS } from '../../utils/programs.js';
import { installProgram } from '../../utils/templateActions.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';
import useUIStore from '../../store/uiStore.js';

export default function ProgramsModal({ isOpen, onClose }) {
  const haptic = useHaptics();
  const [burst, setBurst] = useState(null);
  const [installing, setInstalling] = useState(null);

  async function install(program) {
    setInstalling(program.id);
    try {
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
        Proven training templates — installing adds them as routines you can edit or delete. Progression is switched on, so targets advance as you train.
      </p>
      <div className="flex flex-col gap-3">
        {PROGRAMS.map((p) => (
          <div key={p.id} className="rounded-2xl p-4" style={{ background: 'var(--color-ivory)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{p.name}</h3>
              <span className="rounded-full px-2 py-0.5 font-mono text-[10px] uppercase" style={{ background: 'var(--color-chalk)', color: 'var(--color-ash)' }}>{p.level}</span>
            </div>
            <p className="mt-1 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>{p.desc}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.schedule.map((d) => (
                <span key={d.name} className="rounded-full px-2 py-0.5 font-sans text-[11px]" style={{ background: 'var(--color-chalk)', color: 'var(--color-text-primary)' }}>
                  {d.name} · {d.exercises.length}
                </span>
              ))}
            </div>
            <button
              onClick={() => install(p)}
              disabled={installing === p.id}
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
