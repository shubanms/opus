import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus, ChevronRight, ChevronDown, Trash2, Pencil, Footprints, Droplet, Search, ArrowLeft, Trophy, Dumbbell,
  Layers, Clock, Flame, TrendingUp, TrendingDown, Minus, Moon, Ruler,
} from 'lucide-react';
import { deleteBodyStat, deleteSleep, deleteActivity, restoreEntry } from '../utils/healthActions.js';
import { deleteWithUndo } from '../utils/undoable.js';
import { useStreak } from '../hooks/useStreak.js';
import { useTodayKey } from '../hooks/useTodayKey.js';
import PageWrapper from '../components/layout/PageWrapper.jsx';
import VolumeChart from '../components/charts/VolumeChart.jsx';
import TrendChart from '../components/charts/TrendChart.jsx';
import MuscleFrequency from '../components/progress/MuscleFrequency.jsx';
import WeeklyMuscleTargets from '../components/progress/WeeklyMuscleTargets.jsx';
import Heatmap from '../components/progress/Heatmap.jsx';
import MonthCalendar from '../components/progress/MonthCalendar.jsx';
import WorkoutCard from '../components/workout/WorkoutCard.jsx';
import BodyStatsForm from '../components/progress/BodyStatsForm.jsx';
import SleepForm from '../components/progress/SleepForm.jsx';
import ActivityForm from '../components/progress/ActivityForm.jsx';
import WeeklyRecap from '../components/progress/WeeklyRecap.jsx';
import RecoveryMap, { MUSCLE_LABEL } from '../components/progress/RecoveryMap.jsx';
import ProgressPhotos from '../components/progress/ProgressPhotos.jsx';
import PRBadge from '../components/progress/PRBadge.jsx';
import CountUp from '../components/fx/CountUp.jsx';
import ExercisePicker from '../components/workout/ExercisePicker.jsx';
import {
  useWeeklyVolume, useMuscleFrequency, useWorkoutDays,
  useExerciseVolume, useExerciseMaxWeight, useExerciseOneRepMax, useExerciseBestOneRepMax, useBodyStats, useSleepLogs,
  useActivityHistory, useLifetimeStats, useAllPRs, useTopExercises, usePRs,
} from '../hooks/useProgress.js';
import { useWorkouts } from '../hooks/useWorkout.js';
import { workoutCalories } from '../utils/calories.js';
import { weeklyTotals, weekToDate } from '../utils/weeks.js';
import { friendlyDate, shortDate, todayKey } from '../utils/dateKey.js';
import { MEASUREMENTS, latestByField, latestPerDay, lengthToDisplay, lengthUnit, rollingAverage, weightTrend } from '../utils/health.js';
import { E1RM_MAX_REPS } from '../utils/oneRepMax.js';
import { compactNumber } from '../utils/chartMath.js';
import { m, itemVariants, listVariants, useReducedMotion } from '../motion/index.jsx';
import useSettingsStore from '../store/settingsStore.js';
import { toDisplay, unitLabel, fmtVolume, fmtWeight } from '../utils/units.js';

const TABS = ['Overview', 'By Exercise', 'Body'];

// The tab you were on, per device. A convenience, so it lives in localStorage
// and every access is guarded — private mode and blocked storage throw.
const TAB_KEY = 'opus_progress_tab';
function rememberedTab() {
  try {
    const t = localStorage.getItem(TAB_KEY);
    return TABS.includes(t) ? t : 'Overview';
  } catch {
    return 'Overview';
  }
}
function rememberTab(t) {
  try {
    localStorage.setItem(TAB_KEY, t);
  } catch {
    /* storage unavailable: the tab just won't be remembered */
  }
}

const PR_LABEL = { weight: 'Best weight', reps: 'Best reps', volume: 'Best volume' };

function prValue(pr, unit) {
  if (pr.type === 'reps') return `${pr.value} reps`;
  // Volume is a big number and rounds; a weight record is exact to the plate
  // (102.5 is not 103).
  return pr.type === 'volume' ? fmtVolume(pr.value, unit) : fmtWeight(pr.value, unit);
}

function Section({ id, title, action, children }) {
  return (
    <section
      id={id}
      className="glass mb-5 rounded-2xl p-4"
      style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)', scrollMarginTop: 16 }}
    >
      <div className="mb-3 flex min-h-5 items-center justify-between gap-2">
        <h3 className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A quiet text action for a section header, with a full-height tap target. */
function HeaderLink({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-my-2.5 -mr-2 flex h-10 shrink-0 items-center gap-1 rounded-lg px-2 font-sans text-xs font-medium"
      style={{ color: 'var(--color-gold)' }}
    >
      {children}
    </button>
  );
}

function KpiTile({ icon: Icon, label, value, countTo, effects, format }) {
  return (
    <div className="glass rounded-2xl p-3" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
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
  const date = pr.achievedAt ? friendlyDate(todayKey(new Date(pr.achievedAt))) : '';
  return (
    <El
      {...(onClick ? { type: 'button', onClick } : {})}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left"
      style={{ background: 'var(--color-ivory)' }}
    >
      <Trophy size={14} className="shrink-0" style={{ color: 'var(--color-gold)' }} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{pr.exerciseName}</p>
        <p className="truncate font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {PR_LABEL[pr.type] ?? pr.type}{date ? ` · ${date}` : ''}
        </p>
      </div>
      <span className="shrink-0 font-mono text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {prValue(pr, unit)}
      </span>
      {onClick && <ChevronRight size={15} className="shrink-0" style={{ color: 'var(--color-ash)' }} />}
    </El>
  );
}

/**
 * "This week so far" against last week at the same point (utils/weeks.js).
 * Says nothing when last week had nothing yet — comparing against zero, or a
 * Monday morning against a whole week, is how this used to read −100%.
 */
function WeekComparison({ cmp }) {
  if (!cmp) return null;
  const { pct } = cmp;
  const tone = pct > 0 ? 'var(--color-sage)' : pct < 0 ? 'var(--color-ember)' : 'var(--color-text-secondary)';
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const text = pct === 0 ? 'Level with' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)}% vs`;
  return (
    <div className="mb-2 flex items-center gap-1.5 font-sans text-xs font-medium" style={{ color: tone }} data-testid="week-comparison">
      <Icon size={13} />
      {text} this point last week
    </div>
  );
}

/**
 * Scroll a section into view once, when a link asked for it. Waits for the
 * data above it to land (`ready`) and then a beat more: the recap and the
 * muscle targets grow from nothing as their queries resolve, and scrolling
 * before that lands the section a card-height too high.
 */
function useFocusSection(focus, ready) {
  const reduced = useReducedMotion();
  const done = useRef(false);
  useEffect(() => {
    if (!focus || done.current || !ready) return undefined;
    const t = setTimeout(() => {
      const el = document.getElementById(`progress-${focus}`);
      if (!el) return;
      done.current = true;
      el.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
    }, 300);
    return () => clearTimeout(t);
  }, [focus, ready, reduced]);
}

function Overview({ focus }) {
  const navigate = useNavigate();
  const unit = useSettingsStore((s) => s.unit);
  const effects = useSettingsStore((s) => s.effects);
  const today = useTodayKey();
  // The stored streak goes stale the moment a day passes — derive it.
  const liveStreak = useStreak().count;
  const lifetime = useLifetimeStats();
  const weeklyRaw = useWeeklyVolume(8);
  const weekly = weeklyRaw.map((d) => ({ label: d.label, volume: Math.round(toDisplay(d.volume, unit)) }));
  const muscles = useMuscleFrequency();
  const days = useWorkoutDays();
  const allPRs = useAllPRs();
  const workouts = useWorkouts();
  const [calDay, setCalDay] = useState(null);
  const calDayWorkouts = calDay ? workouts.filter((w) => w.date === calDay) : [];

  useFocusSection(focus, weeklyRaw.length > 0 && (focus !== 'prs' || allPRs.length > 0));

  // Calories: derived per workout (includes pre-cardio history). This-week vs
  // all-time totals + an 8-week trend, bucketed by local Monday like volume.
  const calWeeks = weeklyTotals(workouts, { today, weeks: 8, getValue: workoutCalories })
    .map((b) => ({ label: b.label, volume: Math.round(b.value) }));
  const weekCalories = calWeeks[calWeeks.length - 1]?.volume ?? 0;
  const lifetimeCalories = Math.round(workouts.reduce((a, w) => a + workoutCalories(w), 0));

  const comparison = weekToDate(workouts, { now: new Date() });

  return (
    <>
      <WeeklyRecap />

      {/* Lifetime headline numbers */}
      <div className="mb-5 grid grid-cols-3 gap-2.5">
        <KpiTile icon={Dumbbell} label="Workouts" value={lifetime.workouts} countTo={lifetime.workouts} effects={effects} />
        {/* Compact, with the unit in the label: "202,777 kg" wrapped onto two
            lines in a third of a phone and knocked the row out of line. */}
        <KpiTile
          icon={Layers}
          label={`${unitLabel(unit)} lifted`}
          value={compactNumber(toDisplay(lifetime.totalVolume, unit))}
          countTo={lifetime.totalVolume}
          format={(n) => compactNumber(toDisplay(n, unit))}
          effects={effects}
        />
        <KpiTile icon={Trophy} label="PRs" value={lifetime.prCount} countTo={lifetime.prCount} effects={effects} />
        <KpiTile icon={Flame} label="Streak" value={liveStreak} countTo={liveStreak} effects={effects} />
        <KpiTile icon={Clock} label="Hours" value={Math.round(lifetime.hours)} countTo={Math.round(lifetime.hours)} effects={effects} />
        <KpiTile icon={TrendingUp} label="Sets" value={lifetime.totalSets} countTo={lifetime.totalSets} effects={effects} />
      </div>

      <Section title="This week by muscle">
        <WeeklyMuscleTargets />
      </Section>

      <Section id="progress-volume" title="Weekly volume (8 weeks)">
        <WeekComparison cmp={comparison} />
        <VolumeChart data={weekly} unit={unitLabel(unit)} />
      </Section>

      <Section title="Calories burned">
        <div className="mb-3 grid grid-cols-2 gap-2.5">
          <div className="glass rounded-2xl p-3" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
            <Flame size={14} style={{ color: 'var(--color-ember)' }} />
            <p className="mt-1.5 font-mono text-2xl font-semibold leading-none" style={{ color: 'var(--color-text-primary)' }}>
              {effects ? <CountUp value={weekCalories} /> : weekCalories.toLocaleString()}
            </p>
            <p className="mt-1 font-sans text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>kcal this week</p>
          </div>
          <div className="glass rounded-2xl p-3" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
            <Flame size={14} style={{ color: 'var(--color-ember)' }} />
            <p className="mt-1.5 font-mono text-2xl font-semibold leading-none" style={{ color: 'var(--color-text-primary)' }}>
              {effects ? <CountUp value={lifetimeCalories} /> : lifetimeCalories.toLocaleString()}
            </p>
            <p className="mt-1 font-sans text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>kcal all time</p>
          </div>
        </div>
        <VolumeChart data={calWeeks} unit="kcal" />
        <p className="mt-2 font-sans text-[11px]" style={{ color: 'var(--color-ash)' }}>
          Cardio is calculated; lifting is estimated from session time + bodyweight.
        </p>
      </Section>

      {allPRs.length > 0 && (
        <Section
          id="progress-prs"
          title="Recent PRs"
          action={<HeaderLink onClick={() => navigate('/records')}>All records <ChevronRight size={13} /></HeaderLink>}
        >
          <div className="flex flex-col gap-2">
            {allPRs.slice(0, 4).map((pr) => (
              <PrRow key={pr.id} pr={pr} unit={unit} onClick={() => navigate(`/exercises/${pr.exerciseId}`)} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Muscle focus"><MuscleFrequency data={muscles} /></Section>
      <Section title="Training calendar">
        <MonthCalendar days={days} selected={calDay} onSelect={setCalDay} />
        {calDay && (
          <div className="mt-3">
            {calDayWorkouts.length > 0 ? (
              calDayWorkouts.map((w) => <WorkoutCard key={w.id} workout={w} />)
            ) : (
              <p className="py-4 text-center font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                No workout logged on {friendlyDate(calDay)}
              </p>
            )}
          </div>
        )}
      </Section>
      <Section title="Consistency (last 12 weeks)"><Heatmap days={days} /></Section>
    </>
  );
}

function ExerciseDetail({ exercise, unit, onBack }) {
  const prs = usePRs(exercise.id);
  const oneRM = useExerciseOneRepMax(exercise.id).map((d) => ({ label: d.label, value: toDisplay(d.value, unit) }));
  const bestOneRM = useExerciseBestOneRepMax(exercise.id);
  const maxWeight = useExerciseMaxWeight(exercise.id).map((d) => ({ label: d.label, value: toDisplay(d.value, unit) }));
  const volume = useExerciseVolume(exercise.id).map((d) => ({ label: d.label, volume: Math.round(toDisplay(d.volume, unit)) }));
  const u = unitLabel(unit);
  const weight = prs.find((p) => p.type === 'weight');
  const reps = prs.find((p) => p.type === 'reps');
  const vol = prs.find((p) => p.type === 'volume');

  return (
    <>
      <button type="button" onClick={onBack} className="mb-4 flex h-10 items-center gap-1.5 font-sans text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        <ArrowLeft size={15} /> All exercises
      </button>
      <h2 className="mb-4 font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{exercise.name}</h2>

      {(weight || reps || vol) && (
        <div className="mb-5 flex flex-col gap-2">
          {weight && <PRBadge label="Best weight" value={fmtWeight(weight.value, unit)} unit="" />}
          {reps && <PRBadge label="Best reps" value={reps.value} unit="reps" />}
          {vol && <PRBadge label="Best volume" value={fmtVolume(vol.value, unit)} unit="" />}
        </div>
      )}

      <Section title="Estimated 1RM">
        {bestOneRM && (
          <p className="mb-2 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="font-mono text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {fmtWeight(bestOneRM.value, unit)}
            </span>{' '}
            all-time best — {fmtWeight(bestOneRM.weight, unit)} × {bestOneRM.reps}
            {bestOneRM.date ? `, ${friendlyDate(bestOneRM.date)}` : ''}
          </p>
        )}
        <TrendChart data={oneRM} unit={u} empty="Log weighted sets to estimate 1RM." />
        <p className="mt-2 font-sans text-[11px]" style={{ color: 'var(--color-ash)' }}>
          Epley estimate from your best set of 1–{E1RM_MAX_REPS} reps each session.
        </p>
      </Section>
      <Section title="Max weight"><TrendChart data={maxWeight} unit={u} empty="No sets logged yet." /></Section>
      <Section title="Volume per session"><VolumeChart data={volume} unit={u} /></Section>
    </>
  );
}

/** The figure a ranked exercise is best described by. */
function exerciseFigure(e, unit) {
  if (e.kind === 'cardio') {
    const min = Math.round(e.seconds / 60);
    return min > 0 ? `${min.toLocaleString()} min` : `${e.sets} ${e.sets === 1 ? 'session' : 'sessions'}`;
  }
  // Bodyweight lifts are counted in reps, not "0 kg" of added weight.
  if (e.kind === 'bodyweight') return `${e.reps.toLocaleString()} reps`;
  return fmtVolume(e.volume, unit);
}

function ByExercise() {
  const navigate = useNavigate();
  const unit = useSettingsStore((s) => s.unit);
  const [picker, setPicker] = useState(false);
  const [selected, setSelected] = useState(null);
  const [muscleFilter, setMuscleFilter] = useState(null);
  const muscles = useMuscleFrequency();
  const ranked = useTopExercises();
  const allPRs = useAllPRs();

  if (selected) {
    return <ExerciseDetail exercise={selected} unit={unit} onBack={() => setSelected(null)} />;
  }

  const maxCount = muscles.reduce((mx, x) => Math.max(mx, x.count), 0);
  const mapData = muscles.map((mu) => ({
    name: mu.muscle,
    muscles: [mu.muscle],
    frequency: maxCount ? (mu.count >= maxCount * 0.66 ? 3 : mu.count >= maxCount * 0.33 ? 2 : 1) : 1,
  }));
  // Filter, then cut to ten — not the other way round, or a muscle whose lifts
  // rank below the cut reads as untrained.
  const filtered = (muscleFilter ? ranked.filter((e) => e.muscleGroup === muscleFilter) : ranked).slice(0, 10);

  return (
    <>
      <button
        type="button"
        onClick={() => setPicker(true)}
        className="mb-5 flex w-full items-center gap-2 rounded-2xl px-4 py-3"
        style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
      >
        <Search size={16} style={{ color: 'var(--color-ash)' }} />
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Search all exercises…</span>
      </button>

      {ranked.length > 0 ? (
        <>
          <div className="mb-5">
            <RecoveryMap
              title="Muscle map"
              icon={Dumbbell}
              data={mapData}
              legend={[['#FF8FA3', 'Most trained'], ['#8B7DFF', 'Moderate'], ['#4FD8C4', 'Least']]}
              selectedMuscle={muscleFilter}
              onSelect={(mu) => setMuscleFilter((prev) => (prev === mu ? null : mu))}
            />
          </div>

          <Section title={muscleFilter ? `Top ${MUSCLE_LABEL[muscleFilter] ?? ''} lifts` : 'Top exercises'}>
            {filtered.length === 0 ? (
              <p className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>No lifts logged for this muscle yet.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {filtered.map((e, i) => (
                  <button
                    type="button"
                    key={e.exerciseId}
                    onClick={() => setSelected({ id: e.exerciseId, name: e.name })}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left"
                    style={{ background: 'var(--color-ivory)' }}
                  >
                    <span className="shrink-0 font-mono text-xs font-semibold" style={{ color: 'var(--color-ash)', width: 16 }}>{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{e.name}</p>
                      <p className="truncate font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {e.sets} {e.sets === 1 ? 'set' : 'sets'} · {e.kind === 'cardio' ? 'Cardio' : MUSCLE_LABEL[e.muscleGroup] ?? e.muscleGroup ?? '—'}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm" style={{ color: 'var(--color-text-primary)' }}>{exerciseFigure(e, unit)}</span>
                    <ChevronRight size={15} className="shrink-0" style={{ color: 'var(--color-ash)' }} />
                  </button>
                ))}
              </div>
            )}
          </Section>

          {allPRs.length > 0 && (
            <Section
              title="Recent PRs"
              action={<HeaderLink onClick={() => navigate('/records')}>All records <ChevronRight size={13} /></HeaderLink>}
            >
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

/** A 40 px square icon button — the size a thumb can hit on the first try. */
function IconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
    >
      {children}
    </button>
  );
}

/**
 * A dated log: newest first, the first `limit` rows with a "Show all" for the
 * rest. Every row can be edited (opens its day in the form) and deleted (with
 * Undo). These used to stop at the newest six or ten while the chart above
 * plotted everything — so a typo'd 800 kg from last month spiked the chart
 * with no way to reach the entry and fix it.
 */
function EntryList({ title, rows, limit = 6, summary, onEdit, onDelete, empty, action }) {
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, limit);
  return (
    <Section title={title} action={action}>
      {rows.length === 0 ? (
        <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>{empty}</p>
      ) : (
        <m.div className="flex flex-col gap-1.5" variants={listVariants} initial="initial" animate="animate">
          {shown.map((r) => (
            <m.div
              key={r.id}
              variants={itemVariants}
              layout="position"
              className="flex items-center gap-2 rounded-xl py-0.5 pl-3 pr-0.5"
              style={{ background: 'var(--color-ivory)' }}
            >
              <span className="w-[4.5rem] shrink-0 truncate font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {friendlyDate(r.date)}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-3 truncate font-mono text-xs" style={{ color: 'var(--color-text-primary)' }}>
                {summary(r)}
              </span>
              <IconButton label={`Edit ${friendlyDate(r.date)}`} onClick={() => onEdit(r)}>
                <Pencil size={15} style={{ color: 'var(--color-ash)' }} />
              </IconButton>
              <IconButton label={`Delete ${friendlyDate(r.date)}`} onClick={() => onDelete(r)}>
                <Trash2 size={15} style={{ color: 'var(--color-ember)' }} />
              </IconButton>
            </m.div>
          ))}
        </m.div>
      )}
      {rows.length > limit && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="mt-2 flex h-10 w-full items-center justify-center gap-1 rounded-lg font-sans text-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {all ? 'Show less' : `Show all ${rows.length}`}
          <ChevronDown size={13} style={{ transform: all ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
        </button>
      )}
    </Section>
  );
}

/**
 * "−1.4 kg in 30 days": did the weight go down, and over how long. Measured
 * on the 7-day average, so one salty dinner can't flip the answer.
 */
function WeightHeadline({ trend, unit }) {
  if (!trend) return null;
  const delta = toDisplay(trend.delta, unit);
  const steady = Math.abs(delta) < 0.05;
  const Icon = steady ? Minus : delta < 0 ? TrendingDown : TrendingUp;
  const amount = Math.abs(delta).toFixed(1);
  return (
    <div className="mb-3 flex flex-wrap items-baseline gap-x-2" data-testid="weight-trend">
      <span className="flex items-center gap-1.5 font-mono text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        <Icon size={16} style={{ color: 'var(--color-gold)', alignSelf: 'center' }} />
        {steady ? 'Steady' : `${delta < 0 ? '−' : '+'}${amount} ${unitLabel(unit)}`}
      </span>
      <span className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        in {trend.days} days
      </span>
    </div>
  );
}

/** What the two weight series are. */
function WeightLegend() {
  return (
    <div className="mt-2 flex items-center gap-4 font-sans text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
      <span className="flex items-center gap-1.5">
        <span className="h-[3px] w-4 rounded-full" style={{ background: 'var(--grad-accent)' }} />
        7-day average
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-[5px] w-[5px] rounded-full" style={{ background: 'var(--color-gold)', opacity: 0.7 }} />
        Weigh-ins
      </span>
    </div>
  );
}

const MEAS_LABEL = { chest: 'Chest', waist: 'Waist', hips: 'Hips', arms: 'Arms', thighs: 'Thighs', bodyFat: 'Body fat' };

function Body() {
  // Which sheet is open, and on which day. `kind` clears on close while the
  // date stays, so the sheet keeps its content through the exit animation.
  const [sheet, setSheet] = useState({ kind: null, date: null });
  const open = (kind, date = todayKey()) => setSheet({ kind, date });
  const close = () => setSheet((s) => ({ ...s, kind: null }));
  const unit = useSettingsStore((s) => s.unit);
  const stats = useBodyStats();
  const sleep = useSleepLogs();
  const activity = useActivityHistory();
  const activityDesc = [...activity].reverse();

  // Positive only — a pre-validation "-80" must not drag the line through zero.
  // One weigh-in per day: a day with two rows would plot as a spike.
  const weightPoints = latestPerDay(stats.filter((s) => s.weight > 0)).map((s) => ({ date: s.date, value: s.weight }));
  const weightTrendData = rollingAverage(weightPoints, 7).map((p) => ({
    label: shortDate(p.date),
    value: toDisplay(p.value, unit),
    avg: toDisplay(p.avg, unit),
  }));
  const trend = weightTrend(weightPoints);
  const latest = latestByField(stats, [...MEASUREMENTS, 'bodyFat']);
  const hasMeasurements = Object.values(latest).some(Boolean);

  const sleepTrend = sleep.filter((s) => s.quality > 0).reverse().map((s) => ({ label: shortDate(s.date), value: s.quality }));
  const stepTrend = activity.filter((a) => a.steps > 0).slice(-14).map((a) => ({ label: shortDate(a.date), value: a.steps }));
  const waterTrend = activity.filter((a) => a.water > 0).slice(-14).map((a) => ({ label: shortDate(a.date), value: a.water }));

  const remove = (label, fn) => deleteWithUndo({ label, remove: fn, restore: restoreEntry });

  const measText = (key, v) =>
    key === 'bodyFat' ? `${v.toFixed(1)}%` : `${lengthToDisplay(v, unit)} ${lengthUnit(unit)}`;

  return (
    <>
      <div className="mb-5 flex gap-2">
        <button type="button" onClick={() => open('body')} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-semibold" style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}>
          <Plus size={15} /> Body stats
        </button>
        <button type="button" onClick={() => open('sleep')} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-sans text-sm font-medium" style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}>
          <Plus size={15} /> Sleep
        </button>
      </div>

      <Section title="Body weight">
        <WeightHeadline trend={trend} unit={unit} />
        <TrendChart data={weightTrendData} unit={unitLabel(unit)} empty="Log your weight to see the trend." />
        {weightTrendData.length > 1 && <WeightLegend />}
      </Section>

      {hasMeasurements && (
        <Section title="Latest measurements">
          <div className="grid grid-cols-3 gap-3">
            {[...MEASUREMENTS, 'bodyFat'].map((key) => (
              <div key={key} className="text-center">
                <p className="font-mono text-base font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {latest[key] ? measText(key, latest[key].value) : '—'}
                </p>
                <p className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>{MEAS_LABEL[key]}</p>
                {latest[key] && (
                  <p className="font-sans text-[10px]" style={{ color: 'var(--color-ash)' }}>{friendlyDate(latest[key].date)}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Sleep quality"><TrendChart data={sleepTrend} empty="Log sleep to track quality." /></Section>

      <Section title="Daily steps"><TrendChart data={stepTrend} empty="Add steps to see your trend." /></Section>

      <Section title="Water intake (glasses)"><TrendChart data={waterTrend} empty="Log water to track intake." /></Section>

      <EntryList
        title="Activity log"
        rows={activityDesc}
        limit={10}
        empty="No steps or water logged yet."
        action={<HeaderLink onClick={() => open('activity')}><Plus size={13} /> Log a day</HeaderLink>}
        summary={(a) => (
          <>
            <span className="flex items-center gap-1"><Footprints size={12} style={{ color: 'var(--color-gold)' }} />{(a.steps ?? 0).toLocaleString()}</span>
            <span className="flex items-center gap-1"><Droplet size={12} style={{ color: 'var(--color-sage)' }} />{a.water ?? 0}</span>
          </>
        )}
        onEdit={(a) => open('activity', a.date)}
        onDelete={(a) => remove('Activity entry', () => deleteActivity(a.id))}
      />

      {stats.length > 0 && (
        <EntryList
          title="Body entries"
          rows={stats}
          summary={(s) => {
            const measured = MEASUREMENTS.filter((k) => s[k] != null).length;
            return (
              <>
                {s.weight != null && <span>{fmtWeight(s.weight, unit)}</span>}
                {s.bodyFat != null && <span>{Number(s.bodyFat).toFixed(1)}%</span>}
                {measured > 0 && (
                  <span
                    className="flex items-center gap-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                    title={`${measured} ${measured === 1 ? 'measurement' : 'measurements'}`}
                  >
                    <Ruler size={12} style={{ color: 'var(--color-sage)' }} />{measured}
                  </span>
                )}
              </>
            );
          }}
          onEdit={(s) => open('body', s.date)}
          onDelete={(s) => remove('Body entry', () => deleteBodyStat(s.id))}
        />
      )}

      {sleep.length > 0 && (
        <EntryList
          title="Sleep entries"
          rows={sleep}
          summary={(s) => (
            <>
              {s.hours != null && <span className="flex items-center gap-1"><Moon size={12} style={{ color: 'var(--color-gold)' }} />{s.hours}h</span>}
              {s.quality > 0 && <span>{'★'.repeat(s.quality)}</span>}
            </>
          )}
          onEdit={(s) => open('sleep', s.date)}
          onDelete={(s) => remove('Sleep entry', () => deleteSleep(s.id))}
        />
      )}

      <ProgressPhotos />

      <BodyStatsForm isOpen={sheet.kind === 'body'} date={sheet.date} onClose={close} />
      <SleepForm isOpen={sheet.kind === 'sleep'} date={sheet.date} onClose={close} />
      <ActivityForm isOpen={sheet.kind === 'activity'} date={sheet.date} onClose={close} />
    </>
  );
}

export default function ProgressPage() {
  const location = useLocation();
  const navigate = useNavigate();
  // A link can ask for a tab (and a section to scroll to) — Home's tiles do.
  // Otherwise you come back to the tab you left.
  const requested = TABS.includes(location.state?.tab) ? location.state.tab : null;
  const [tab, setTabState] = useState(() => requested ?? rememberedTab());
  const [focus] = useState(() => location.state?.focus ?? null);

  // Consume the request: a reload or a back-navigation shouldn't replay the
  // jump, and an explicit tab counts as the one you're now on.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once, on arrival
  useEffect(() => {
    if (requested) rememberTab(requested);
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, []);

  function setTab(t) {
    setTabState(t);
    rememberTab(t);
  }

  return (
    <PageWrapper title="Progress" subtitle="Charts & stats">
      {/* Plain buttons with aria-pressed, like every other segmented control
          here — the E2E route sweep finds these tabs as buttons by name. */}
      <div className="mb-5 flex gap-1 rounded-xl p-1" style={{ background: 'var(--color-ivory)' }}>
        {TABS.map((t) => (
          <button
            type="button"
            aria-pressed={tab === t}
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

      {tab === 'Overview' && <Overview focus={focus} />}
      {tab === 'By Exercise' && <ByExercise />}
      {tab === 'Body' && <Body />}
    </PageWrapper>
  );
}
