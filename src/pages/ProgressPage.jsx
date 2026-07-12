import { useState } from 'react';
import { Plus, ChevronRight, Trash2, Pencil, Footprints, Droplet, Search, ArrowLeft, Trophy, Dumbbell, Layers, Clock, Flame, TrendingUp, TrendingDown } from 'lucide-react';
import { deleteBodyStat, deleteSleep, deleteActivity } from '../utils/healthActions.js';
import { playChime } from '../utils/sound.js';

const del = (fn, id) => { playChime('delete'); fn(id); };
import PageWrapper from '../components/layout/PageWrapper.jsx';
import VolumeChart from '../components/progress/VolumeChart.jsx';
import TrendChart from '../components/progress/TrendChart.jsx';
import MuscleFrequency from '../components/progress/MuscleFrequency.jsx';
import Heatmap from '../components/progress/Heatmap.jsx';
import BodyStatsForm from '../components/progress/BodyStatsForm.jsx';
import SleepForm from '../components/progress/SleepForm.jsx';
import ActivityForm from '../components/progress/ActivityForm.jsx';
import WeeklyRecap from '../components/progress/WeeklyRecap.jsx';
import RecoveryMap, { MUSCLE_LABEL } from '../components/progress/RecoveryMap.jsx';
import PRBadge from '../components/progress/PRBadge.jsx';
import CountUp from '../components/fx/CountUp.jsx';
import ExercisePicker from '../components/workout/ExercisePicker.jsx';
import {
  useWeeklyVolume, useMuscleFrequency, useWorkoutDays,
  useExerciseVolume, useExerciseMaxWeight, useExerciseOneRepMax, useBodyStats, useSleepLogs,
  useActivityHistory, useLifetimeStats, useAllPRs, useTopExercises, usePRs,
} from '../hooks/useProgress.js';
import { useRPG } from '../hooks/useRPG.js';
import useSettingsStore from '../store/settingsStore.js';
import { toDisplay, unitLabel, fmtVolume } from '../utils/units.js';

const TABS = ['Overview', 'By Exercise', 'Body'];

const PR_LABEL = { weight: 'Best weight', reps: 'Best reps', volume: 'Best volume' };

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

function KpiTile({ icon: Icon, label, value, countTo, effects, format }) {
  return (
    <div className="rounded-2xl p-3" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
      <Icon size={14} style={{ color: 'var(--color-gold)' }} />
      <p className="mt-1.5 font-mono text-2xl font-semibold leading-none" style={{ color: 'var(--color-text-primary)' }}>
        {countTo != null && effects ? <CountUp value={countTo} format={format} /> : value}
      </p>
      <p className="mt-1 font-sans text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
    </div>
  );
}

function PrRow({ pr, unit, onClick }) {
  const El = onClick ? 'button' : 'div';
  return (
    <El
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left"
      style={{ background: 'var(--color-ivory)' }}
    >
      <Trophy size={14} style={{ color: 'var(--color-gold)' }} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{pr.exerciseName}</p>
        <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>{PR_LABEL[pr.type] ?? pr.type}</p>
      </div>
      <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {pr.type === 'reps' ? `${pr.value} reps` : `${toDisplay(pr.value, unit)} ${unitLabel(unit)}`}
      </span>
    </El>
  );
}

function Overview() {
  const unit = useSettingsStore((s) => s.unit);
  const effects = useSettingsStore((s) => s.effects);
  const { profile } = useRPG();
  const lifetime = useLifetimeStats();
  const weeklyRaw = useWeeklyVolume(8);
  const weekly = weeklyRaw.map((d) => ({ label: d.label, volume: Math.round(toDisplay(d.volume, unit)) }));
  const muscles = useMuscleFrequency();
  const days = useWorkoutDays();
  const allPRs = useAllPRs();

  const lastVol = weeklyRaw[weeklyRaw.length - 1]?.volume ?? 0;
  const prevVol = weeklyRaw[weeklyRaw.length - 2]?.volume ?? 0;
  const deltaPct = prevVol > 0 ? Math.round(((lastVol - prevVol) / prevVol) * 100) : null;
  const up = lastVol >= prevVol;

  return (
    <>
      <WeeklyRecap dismissible={false} />

      {/* Lifetime headline numbers */}
      <div className="mb-5 grid grid-cols-3 gap-2.5">
        <KpiTile icon={Dumbbell} label="Workouts" value={lifetime.workouts} countTo={lifetime.workouts} effects={effects} />
        <KpiTile icon={Layers} label="Volume" value={fmtVolume(lifetime.totalVolume, unit)} countTo={lifetime.totalVolume} format={(n) => fmtVolume(n, unit)} effects={effects} />
        <KpiTile icon={Trophy} label="PRs" value={lifetime.prCount} countTo={lifetime.prCount} effects={effects} />
        <KpiTile icon={Flame} label="Streak" value={profile?.streak ?? 0} countTo={profile?.streak ?? 0} effects={effects} />
        <KpiTile icon={Clock} label="Hours" value={Math.round(lifetime.hours)} countTo={Math.round(lifetime.hours)} effects={effects} />
        <KpiTile icon={TrendingUp} label="Sets" value={lifetime.totalSets} countTo={lifetime.totalSets} effects={effects} />
      </div>

      <Section title="Weekly volume (8 weeks)">
        {deltaPct != null && (
          <div className="mb-2 flex items-center gap-1.5 font-sans text-xs font-medium" style={{ color: up ? 'var(--color-sage)' : 'var(--color-ember)' }}>
            {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {up ? '+' : ''}{deltaPct}% vs last week
          </div>
        )}
        <VolumeChart data={weekly} unit={unitLabel(unit)} />
      </Section>

      {allPRs.length > 0 && (
        <Section title="Recent PRs">
          <div className="flex flex-col gap-2">
            {allPRs.slice(0, 4).map((pr) => <PrRow key={pr.id} pr={pr} unit={unit} />)}
          </div>
        </Section>
      )}

      <Section title="Muscle focus"><MuscleFrequency data={muscles} /></Section>
      <Section title="Training calendar"><Heatmap days={days} /></Section>
    </>
  );
}

function ExerciseDetail({ exercise, unit, onBack }) {
  const prs = usePRs(exercise.id);
  const oneRM = useExerciseOneRepMax(exercise.id).map((d) => ({ label: d.label, value: toDisplay(d.value, unit) }));
  const maxWeight = useExerciseMaxWeight(exercise.id).map((d) => ({ label: d.label, value: toDisplay(d.value, unit) }));
  const volume = useExerciseVolume(exercise.id).map((d) => ({ label: d.label, volume: Math.round(toDisplay(d.volume, unit)) }));
  const u = unitLabel(unit);
  const weight = prs.find((p) => p.type === 'weight');
  const reps = prs.find((p) => p.type === 'reps');
  const vol = prs.find((p) => p.type === 'volume');

  return (
    <>
      <button onClick={onBack} className="mb-4 flex items-center gap-1.5 font-sans text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        <ArrowLeft size={15} /> All exercises
      </button>
      <h2 className="mb-4 font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{exercise.name}</h2>

      {(weight || reps || vol) && (
        <div className="mb-5 flex flex-col gap-2">
          {weight && <PRBadge label="Best weight" value={toDisplay(weight.value, unit)} unit={u} />}
          {reps && <PRBadge label="Best reps" value={reps.value} unit="reps" />}
          {vol && <PRBadge label="Best volume" value={toDisplay(vol.value, unit)} unit={u} />}
        </div>
      )}

      <Section title="Estimated 1RM"><TrendChart data={oneRM} unit={u} empty="Log weighted sets to estimate 1RM." /></Section>
      <Section title="Max weight"><TrendChart data={maxWeight} unit={u} empty="No sets logged yet." /></Section>
      <Section title="Volume per session"><VolumeChart data={volume} unit={u} /></Section>
    </>
  );
}

function ByExercise() {
  const unit = useSettingsStore((s) => s.unit);
  const [picker, setPicker] = useState(false);
  const [selected, setSelected] = useState(null);
  const [muscleFilter, setMuscleFilter] = useState(null);
  const muscles = useMuscleFrequency();
  const topEx = useTopExercises(24);
  const allPRs = useAllPRs();

  if (selected) {
    return <ExerciseDetail exercise={selected} unit={unit} onBack={() => setSelected(null)} />;
  }

  const maxCount = muscles.reduce((m, x) => Math.max(m, x.count), 0);
  const mapData = muscles.map((m) => ({
    name: m.muscle,
    muscles: [m.muscle],
    frequency: maxCount ? (m.count >= maxCount * 0.66 ? 3 : m.count >= maxCount * 0.33 ? 2 : 1) : 1,
  }));
  const filtered = muscleFilter ? topEx.filter((e) => e.muscleGroup === muscleFilter) : topEx;

  return (
    <>
      <button
        onClick={() => setPicker(true)}
        className="mb-5 flex w-full items-center gap-2 rounded-2xl px-4 py-3"
        style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
      >
        <Search size={16} style={{ color: 'var(--color-ash)' }} />
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Search all exercises…</span>
      </button>

      {topEx.length > 0 ? (
        <>
          <div className="mb-5">
            <RecoveryMap
              title="Muscle map"
              icon={Dumbbell}
              data={mapData}
              legend={[['#D4622A', 'Most trained'], ['#C9A84C', 'Moderate'], ['#6B8F71', 'Least']]}
              selectedMuscle={muscleFilter}
              onSelect={(m) => setMuscleFilter((prev) => (prev === m ? null : m))}
            />
          </div>

          <Section title={muscleFilter ? `Top ${MUSCLE_LABEL[muscleFilter] ?? ''} lifts` : 'Top exercises'}>
            {filtered.length === 0 ? (
              <p className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>No lifts logged for this muscle yet.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {filtered.slice(0, 10).map((e, i) => (
                  <button
                    key={e.exerciseId}
                    onClick={() => setSelected({ id: e.exerciseId, name: e.name })}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                    style={{ background: 'var(--color-ivory)' }}
                  >
                    <span className="font-mono text-xs font-semibold" style={{ color: 'var(--color-ash)', width: 16 }}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{e.name}</p>
                      <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {e.sets} sets · {MUSCLE_LABEL[e.muscleGroup] ?? e.muscleGroup ?? '—'}
                      </p>
                    </div>
                    <span className="font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>{fmtVolume(e.volume, unit)}</span>
                    <ChevronRight size={15} style={{ color: 'var(--color-ash)' }} />
                  </button>
                ))}
              </div>
            )}
          </Section>

          {allPRs.length > 0 && (
            <Section title="Recent PRs">
              <div className="flex flex-col gap-2">
                {allPRs.slice(0, 4).map((pr) => (
                  <PrRow key={pr.id} pr={pr} unit={unit} onClick={() => setSelected({ id: pr.exerciseId, name: pr.exerciseName })} />
                ))}
              </div>
            </Section>
          )}
        </>
      ) : (
        <div className="mt-10 text-center">
          <p className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>No lifts yet</p>
          <p className="mt-2 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Log a workout, then explore your numbers here.
          </p>
        </div>
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
                  <button onClick={() => del(deleteActivity, a.id)} aria-label="Delete entry">
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
                  <button onClick={() => del(deleteBodyStat, s.id)} aria-label="Delete entry">
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
                  <button onClick={() => del(deleteSleep, s.id)} aria-label="Delete entry">
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
