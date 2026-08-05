import { useState } from 'react';
import { CalendarRange, Sparkles } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import Particles from '../fx/Particles.jsx';
import { useExercises } from '../../hooks/useExercises.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { createTemplate } from '../../utils/templateActions.js';
import { makeRng } from '../../utils/routineGenerator.js';
import { planWeek, SPLIT_LIST, REST_PREFS } from '../../utils/weekPlanner.js';
import { playChime } from '../../utils/sound.js';

const LEVELS = ['beginner', 'intermediate', 'advanced'];
const MINUTES = [30, 45, 60, 75, 90];
const REST_LABEL = { short: 'Short', standard: 'Standard', long: 'Long' };
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// weekPlanner uses 1=Mon … 7=Sun; the app stores 0=Sun … 6=Sat.
const toAppDow = (d) => (d === 7 ? 0 : d);

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--color-ivory)' }}>
      {options.map((o) => {
        const v = typeof o === 'object' ? o.v : o;
        const l = typeof o === 'object' ? o.l : cap(o);
        return (
          <button
            key={v}
            onClick={() => onChange(v)}
            className="flex-1 rounded-lg py-2 font-sans text-xs font-medium"
            style={{ background: value === v ? 'var(--color-chalk)' : 'transparent', color: value === v ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

export default function WeekPlannerModal({ isOpen, onClose }) {
  const allExercises = useExercises();
  const haptic = useHaptics();
  const [splitKey, setSplitKey] = useState('ppl');
  const [days, setDays] = useState(6);
  const [level, setLevel] = useState('intermediate');
  const [minutes, setMinutes] = useState(60);
  const [rest, setRest] = useState('standard');
  const [week, setWeek] = useState(null);
  const [burst, setBurst] = useState(false);
  const [saving, setSaving] = useState(false);

  const split = SPLIT_LIST.find((s) => s.key === splitKey);
  const exById = Object.fromEntries(allExercises.map((e) => [e.id, e]));

  function pickSplit(key) {
    const s = SPLIT_LIST.find((x) => x.key === key);
    setSplitKey(key);
    if (s && !s.days.includes(days)) setDays(s.days[s.days.length - 1]);
    setWeek(null);
  }

  function generate() {
    if (!allExercises.length) return;
    const w = planWeek({ split: splitKey, days, level, sessionMinutes: minutes, rest, exercises: allExercises, rng: makeRng(Date.now()) });
    setWeek(w);
    haptic('success');
    playChime('start');
    setBurst(true);
    setTimeout(() => setBurst(false), 1200);
  }

  async function saveWeek() {
    if (!week?.length || saving) return;
    setSaving(true);
    try {
      for (const day of week) {
        await createTemplate({ name: day.name, dayOfWeek: toAppDow(day.dayOfWeek), autoKey: day.autoKey, exercises: day.exercises });
      }
      haptic('success');
      playChime('success');
      close();
    } finally {
      setSaving(false);
    }
  }

  function close() { setWeek(null); onClose(); }

  return (
    <Modal isOpen={isOpen} onClose={close} title="Plan my week">
      {burst && <Particles count={20} />}

      <p className="mb-3 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        Auto-build a <b style={{ color: 'var(--color-text-primary)' }}>custom</b> week from your split, days, level and time — OPUS generates the exercises for you. (For ready-made named programs like 5×5 or PPL, use <b style={{ color: 'var(--color-text-primary)' }}>Programs</b> instead.)
      </p>
      <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Choose a split</p>
      <div className="flex flex-col gap-2">
        {SPLIT_LIST.map((s) => {
          const on = s.key === splitKey;
          return (
            <button
              key={s.key}
              onClick={() => pickSplit(s.key)}
              className="rounded-xl border px-4 py-3 text-left"
              style={{ borderColor: on ? 'var(--color-gold)' : 'transparent', background: on ? 'var(--color-gold-soft, rgba(139, 125, 255,0.12))' : 'var(--color-ivory)' }}
            >
              <div className="flex items-center justify-between">
                <span className="font-sans text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{s.label}</span>
                <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{s.days.join('/')} days</span>
              </div>
              <p className="mt-0.5 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>{s.blurb}</p>
            </button>
          );
        })}
      </div>

      <p className="mb-2 mt-4 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Days per week</p>
      <Segmented options={split.days.map((d) => ({ v: d, l: `${d} days` }))} value={days} onChange={(v) => { setDays(v); setWeek(null); }} />

      <p className="mb-2 mt-4 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Experience</p>
      <Segmented options={LEVELS} value={level} onChange={(v) => { setLevel(v); setWeek(null); }} />

      <p className="mb-2 mt-4 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Time per session</p>
      <Segmented options={MINUTES.map((m) => ({ v: m, l: `${m}m` }))} value={minutes} onChange={(v) => { setMinutes(v); setWeek(null); }} />

      <p className="mb-2 mt-4 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>Rest between sets</p>
      <Segmented options={REST_PREFS.map((r) => ({ v: r, l: REST_LABEL[r] }))} value={rest} onChange={(v) => { setRest(v); setWeek(null); }} />

      <button
        onClick={generate}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-semibold"
        style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
      >
        <Sparkles size={16} /> {week ? 'Re-generate week' : 'Generate week'}
      </button>

      {week && (
        <div className="mt-4 flex flex-col gap-3">
          {week.map((day, i) => (
            <div key={i} className="rounded-xl p-3" style={{ background: 'var(--color-ivory)' }}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-sans text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {DOW[toAppDow(day.dayOfWeek)]} · {day.name}
                </span>
                <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{day.exercises.length} lifts</span>
              </div>
              <div className="flex flex-col gap-1">
                {day.exercises.map((s) => (
                  <div key={s.exerciseId} className="flex items-center justify-between">
                    <span className="truncate font-sans text-xs" style={{ color: 'var(--color-text-primary)' }}>{exById[s.exerciseId]?.name ?? 'Exercise'}</span>
                    <span className="ml-2 shrink-0 font-mono text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{s.targetSets}×{s.targetReps} · {s.targetRest}s</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={saveWeek}
            disabled={saving}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-semibold"
            style={{ background: 'var(--color-obsidian)', color: 'var(--color-text-inverse)', opacity: saving ? 0.5 : 1 }}
          >
            <CalendarRange size={16} /> Save week ({week.length} routines)
          </button>
          <p className="text-center font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Each day is saved as an editable routine you can fine-tune or shuffle.
          </p>
        </div>
      )}
    </Modal>
  );
}
