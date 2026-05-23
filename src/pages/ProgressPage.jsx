import { useState } from 'react';
import { Plus, ChevronRight } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper.jsx';
import VolumeChart from '../components/progress/VolumeChart.jsx';
import TrendChart from '../components/progress/TrendChart.jsx';
import MuscleFrequency from '../components/progress/MuscleFrequency.jsx';
import Heatmap from '../components/progress/Heatmap.jsx';
import BodyStatsForm from '../components/progress/BodyStatsForm.jsx';
import SleepForm from '../components/progress/SleepForm.jsx';
import ExercisePicker from '../components/workout/ExercisePicker.jsx';
import {
  useWeeklyVolume, useMuscleFrequency, useWorkoutDays,
  useExerciseVolume, useExerciseMaxWeight, useBodyStats, useSleepLogs,
} from '../hooks/useProgress.js';

const TABS = ['Overview', 'By Exercise', 'Body'];

function Section({ title, children }) {
  return (
    <div className="mb-5 rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
      <h3 className="mb-3 font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Overview() {
  const weekly = useWeeklyVolume(8);
  const muscles = useMuscleFrequency();
  const days = useWorkoutDays();
  return (
    <>
      <Section title="Weekly volume (8 weeks)"><VolumeChart data={weekly} /></Section>
      <Section title="Muscle focus"><MuscleFrequency data={muscles} /></Section>
      <Section title="Training calendar"><Heatmap days={days} /></Section>
    </>
  );
}

function ByExercise() {
  const [picker, setPicker] = useState(false);
  const [selected, setSelected] = useState(null);
  const volume = useExerciseVolume(selected?.id);
  const maxWeight = useExerciseMaxWeight(selected?.id);

  return (
    <>
      <button
        onClick={() => setPicker(true)}
        className="mb-5 flex w-full items-center justify-between rounded-2xl px-4 py-3"
        style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
      >
        <span className="font-sans text-sm font-medium" style={{ color: selected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
          {selected ? selected.name : 'Choose an exercise'}
        </span>
        <ChevronRight size={16} style={{ color: 'var(--color-ash)' }} />
      </button>

      {selected && (
        <>
          <Section title="Max weight"><TrendChart data={maxWeight} unit="kg" empty="No sets logged yet." /></Section>
          <Section title="Volume per session"><VolumeChart data={volume} /></Section>
        </>
      )}

      <ExercisePicker
        isOpen={picker}
        onClose={() => setPicker(false)}
        onSelect={(ex) => setSelected({ id: ex.id, name: ex.name })}
      />
    </>
  );
}

function Body() {
  const [statForm, setStatForm] = useState(false);
  const [sleepForm, setSleepForm] = useState(false);
  const stats = useBodyStats();
  const sleep = useSleepLogs();

  const latest = stats[0];
  const weightTrend = stats.filter((s) => s.weight != null).reverse().map((s) => ({ label: s.date.slice(5), value: s.weight }));
  const sleepTrend = sleep.filter((s) => s.quality > 0).reverse().map((s) => ({ label: s.date.slice(5), value: s.quality }));

  const MEAS = [
    { key: 'chest', label: 'Chest' }, { key: 'waist', label: 'Waist' }, { key: 'hips', label: 'Hips' },
    { key: 'arms', label: 'Arms' }, { key: 'thighs', label: 'Thighs' }, { key: 'bodyFat', label: 'Body fat' },
  ];

  return (
    <>
      <div className="mb-5 flex gap-2">
        <button onClick={() => setStatForm(true)} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-semibold" style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}>
          <Plus size={15} /> Body stats
        </button>
        <button onClick={() => setSleepForm(true)} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-medium" style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}>
          <Plus size={15} /> Sleep
        </button>
      </div>

      <Section title="Body weight"><TrendChart data={weightTrend} unit="kg" empty="Log your weight to see the trend." /></Section>

      {latest && (
        <Section title="Latest measurements">
          <div className="grid grid-cols-3 gap-3">
            {MEAS.map((m) => (
              <div key={m.key} className="text-center">
                <p className="font-mono text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {latest[m.key] != null ? latest[m.key] : '—'}
                </p>
                <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>{m.label}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Sleep quality"><TrendChart data={sleepTrend} empty="Log sleep to track quality." /></Section>

      <BodyStatsForm isOpen={statForm} onClose={() => setStatForm(false)} />
      <SleepForm isOpen={sleepForm} onClose={() => setSleepForm(false)} />
    </>
  );
}

export default function ProgressPage() {
  const [tab, setTab] = useState('Overview');

  return (
    <PageWrapper title="Progress" subtitle="Charts & stats">
      <div className="mb-5 flex gap-1 rounded-xl p-1" style={{ background: 'var(--color-ivory)' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 rounded-lg py-2 font-sans text-xs font-medium"
            style={{
              background: tab === t ? 'var(--color-chalk)' : 'transparent',
              color: tab === t ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <Overview />}
      {tab === 'By Exercise' && <ByExercise />}
      {tab === 'Body' && <Body />}
    </PageWrapper>
  );
}
