import { useState } from 'react';
import { Plus, ChevronRight, Trash2, Pencil, Footprints, Droplet } from 'lucide-react';
import { deleteBodyStat, deleteSleep, deleteActivity } from '../utils/healthActions.js';
import PageWrapper from '../components/layout/PageWrapper.jsx';
import VolumeChart from '../components/progress/VolumeChart.jsx';
import TrendChart from '../components/progress/TrendChart.jsx';
import MuscleFrequency from '../components/progress/MuscleFrequency.jsx';
import Heatmap from '../components/progress/Heatmap.jsx';
import BodyStatsForm from '../components/progress/BodyStatsForm.jsx';
import SleepForm from '../components/progress/SleepForm.jsx';
import ActivityForm from '../components/progress/ActivityForm.jsx';
import ExercisePicker from '../components/workout/ExercisePicker.jsx';
import {
  useWeeklyVolume, useMuscleFrequency, useWorkoutDays,
  useExerciseVolume, useExerciseMaxWeight, useBodyStats, useSleepLogs,
  useActivityHistory,
} from '../hooks/useProgress.js';
import useSettingsStore from '../store/settingsStore.js';
import { toDisplay, unitLabel } from '../utils/units.js';

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
  const unit = useSettingsStore((s) => s.unit);
  const weeklyRaw = useWeeklyVolume(8);
  const weekly = weeklyRaw.map((d) => ({ label: d.label, volume: Math.round(toDisplay(d.volume, unit)) }));
  const muscles = useMuscleFrequency();
  const days = useWorkoutDays();
  return (
    <>
      <Section title="Weekly volume (8 weeks)"><VolumeChart data={weekly} unit={unitLabel(unit)} /></Section>
      <Section title="Muscle focus"><MuscleFrequency data={muscles} /></Section>
      <Section title="Training calendar"><Heatmap days={days} /></Section>
    </>
  );
}

function ByExercise() {
  const unit = useSettingsStore((s) => s.unit);
  const [picker, setPicker] = useState(false);
  const [selected, setSelected] = useState(null);
  const volumeRaw = useExerciseVolume(selected?.id);
  const maxWeightRaw = useExerciseMaxWeight(selected?.id);
  const volume = volumeRaw.map((d) => ({ label: d.label, volume: Math.round(toDisplay(d.volume, unit)) }));
  const maxWeight = maxWeightRaw.map((d) => ({ label: d.label, value: toDisplay(d.value, unit) }));

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
          <Section title="Max weight"><TrendChart data={maxWeight} unit={unitLabel(unit)} empty="No sets logged yet." /></Section>
          <Section title="Volume per session"><VolumeChart data={volume} unit={unitLabel(unit)} /></Section>
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
  const [actForm, setActForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const unit = useSettingsStore((s) => s.unit);
  const stats = useBodyStats();
  const sleep = useSleepLogs();
  const activity = useActivityHistory();
  const activityDesc = [...activity].reverse();

  const latest = stats[0];
  const weightTrend = stats.filter((s) => s.weight != null).reverse().map((s) => ({ label: s.date.slice(5), value: toDisplay(s.weight, unit) }));
  const sleepTrend = sleep.filter((s) => s.quality > 0).reverse().map((s) => ({ label: s.date.slice(5), value: s.quality }));
  const stepTrend = activity.filter((a) => a.steps > 0).slice(-14).map((a) => ({ label: a.date.slice(5), value: a.steps }));
  const waterTrend = activity.filter((a) => a.water > 0).slice(-14).map((a) => ({ label: a.date.slice(5), value: a.water }));

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

      <Section title="Body weight"><TrendChart data={weightTrend} unit={unitLabel(unit)} empty="Log your weight to see the trend." /></Section>

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

      <Section title="Daily steps"><TrendChart data={stepTrend} empty="Add steps to see your trend." /></Section>

      <Section title="Water intake (glasses)"><TrendChart data={waterTrend} empty="Log water to track intake." /></Section>

      {/* Activity log */}
      <div className="mb-5 rounded-2xl p-4" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Activity log
          </h3>
          <button
            onClick={() => { setEditEntry(null); setActForm(true); }}
            className="flex items-center gap-1 font-sans text-xs font-medium"
            style={{ color: 'var(--color-gold)' }}
          >
            <Plus size={13} /> Log a day
          </button>
        </div>
        {activityDesc.length === 0 ? (
          <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>No steps or water logged yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {activityDesc.slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--color-ivory)' }}>
                <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{a.date}</span>
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>
                    <Footprints size={12} style={{ color: 'var(--color-gold)' }} />{(a.steps ?? 0).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>
                    <Droplet size={12} style={{ color: 'var(--color-sage)' }} />{a.water ?? 0}
                  </span>
                  <button onClick={() => { setEditEntry(a); setActForm(true); }} aria-label="Edit entry">
                    <Pencil size={13} style={{ color: 'var(--color-ash)' }} />
                  </button>
                  <button onClick={() => deleteActivity(a.id)} aria-label="Delete entry">
                    <Trash2 size={13} style={{ color: 'var(--color-ember)' }} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {stats.length > 0 && (
        <Section title="Body entries">
          <div className="flex flex-col gap-1.5">
            {stats.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--color-ivory)' }}>
                <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{s.date}</span>
                <span className="flex items-center gap-3">
                  {s.weight != null && <span className="font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>{toDisplay(s.weight, unit)} {unitLabel(unit)}</span>}
                  <button onClick={() => deleteBodyStat(s.id)} aria-label="Delete entry">
                    <Trash2 size={13} style={{ color: 'var(--color-ember)' }} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {sleep.length > 0 && (
        <Section title="Sleep entries">
          <div className="flex flex-col gap-1.5">
            {sleep.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--color-ivory)' }}>
                <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{s.date}</span>
                <span className="flex items-center gap-3">
                  <span className="font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>
                    {s.hours != null ? `${s.hours}h` : ''}{s.quality ? ` ★${s.quality}` : ''}
                  </span>
                  <button onClick={() => deleteSleep(s.id)} aria-label="Delete entry">
                    <Trash2 size={13} style={{ color: 'var(--color-ember)' }} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <BodyStatsForm isOpen={statForm} onClose={() => setStatForm(false)} />
      <SleepForm isOpen={sleepForm} onClose={() => setSleepForm(false)} />
      <ActivityForm isOpen={actForm} entry={editEntry} onClose={() => setActForm(false)} />
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
