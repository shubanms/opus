import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookmarkPlus, CheckCircle2, ChevronDown, Clock, Flame, Layers, Pencil, Plus, RotateCcw, Sparkles, Trash2, Trophy, Zap,
} from 'lucide-react';
import { AnimatePresence, m, SPRING, TWEEN } from '../../motion/index.jsx';
import { formatDuration } from '../../utils/duration.js';
import { useWorkoutDetail, useShareData } from '../../hooks/useWorkout.js';
import { deleteWorkout, restoreWorkout } from '../../utils/workoutActions.js';
import { saveWorkoutAsRoutine } from '../../utils/templateActions.js';
import { leavesSessionEmpty } from '../../utils/historyMath.js';
import { deleteWithUndo } from '../../utils/undoable.js';
import { confirmReplaceSession } from '../../utils/sessionGuard.js';
import { fmtVolume, toDisplay } from '../../utils/units.js';
import { avgRest, avgRestAcross, formatRest } from '../../utils/restStats.js';
import { workoutCalories } from '../../utils/calories.js';
import { friendlyDate, shortDate } from '../../utils/dateKey.js';
import { playChime } from '../../utils/sound.js';
import ShareButton from '../share/ShareButton.jsx';
import SetEditSheet from '../history/SetEditSheet.jsx';
import WorkoutDetailsEditor from '../history/WorkoutDetailsEditor.jsx';
import useWorkoutStore from '../../store/workoutStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import useUIStore from '../../store/uiStore.js';

// One past session in History.
//
// Expanded, it leads with what you did — the lifts in the order you did them,
// each set a chip you can tap to correct, with a trophy on the sets that still
// hold a record — then the verdict the app gave it at the time. Renaming,
// re-dating, tags, colour and the note sit behind "Edit details": they are
// edited rarely, and they used to fill the card above the sets.

function setLabel(s, unit) {
  if (s.isCardio) {
    const min = Math.round((s.durationSec || 0) / 60);
    return s.distanceKm ? `${min}′ · ${Number(s.distanceKm).toFixed(1)}km` : `${min} min`;
  }
  return s.weight > 0 ? `${toDisplay(s.weight, unit)}×${s.reps}` : `${s.reps} reps`;
}

function SetChip({ s, unit, onEdit }) {
  const record = s.isRecord;
  const color = s.isWarmup ? 'var(--color-ember)' : record ? 'var(--color-gold)' : 'var(--color-text-primary)';
  return (
    <m.button
      type="button"
      layout
      transition={SPRING.layout}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      whileTap={{ scale: 0.94 }}
      onClick={() => onEdit(s)}
      aria-label={`${s.isWarmup ? 'Warm-up' : 'Set'} ${s.setNumber}: ${setLabel(s, unit)}${record ? ', holds a record' : ''}. Edit`}
      className="flex min-h-[36px] items-center gap-1 rounded-xl px-2 font-mono text-xs"
      style={{
        background: record ? 'var(--accent-wash)' : 'var(--color-ivory)',
        color,
        border: `1px solid ${record ? 'var(--color-gold)' : 'transparent'}`,
      }}
    >
      {s.isWarmup && <Flame size={11} />}
      {record && <Trophy size={11} />}
      {setLabel(s, unit)}
    </m.button>
  );
}

export default function WorkoutCard({ workout }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(null); // SetEditSheet target
  const [details, setDetails] = useState(false);
  const navigate = useNavigate();
  const repeatWorkout = useWorkoutStore((s) => s.repeatWorkout);
  const unit = useSettingsStore((s) => s.unit);

  const detail = useWorkoutDetail(expanded ? workout.id : null);
  const shareData = useShareData(expanded ? workout.id : null);
  const tags = workout.tags ?? [];
  const kcal = workoutCalories(workout);
  const closedLoop = Boolean(workout.closedAdvice);
  const VerdictIcon = closedLoop ? CheckCircle2 : Sparkles;
  const sessionLabel = `${workout.name || 'Workout'} · ${shortDate(workout.date)}`;
  const allSets = detail.flatMap((ex) => ex.sets);
  const editSet = (ex) => (set) =>
    setEditing({ mode: 'edit', set, exercise: ex, sessionLabel, lastOfSession: leavesSessionEmpty(set, allSets) });

  async function handleRepeat(e) {
    e.stopPropagation();
    // Repeating used to overwrite a session in progress without asking.
    if (!(await confirmReplaceSession(`“${workout.name || 'Workout'}” again`))) return;
    await repeatWorkout(workout.id);
    navigate('/workout');
  }

  async function handleDelete(e) {
    e.stopPropagation();
    await deleteWithUndo({
      // "Push · 28 Sep deleted" — with several sessions of the same name, a
      // bare "Push deleted" did not say which one the Undo would bring back.
      label: sessionLabel,
      remove: () => deleteWorkout(workout.id),
      restore: restoreWorkout,
    });
  }

  async function handleSaveRoutine() {
    const name = await useUIStore.getState().prompt({
      title: 'Save as routine',
      message: 'The lifts in this session, with its sets, reps and top weights as targets.',
      placeholder: 'Routine name',
      defaultValue: workout.name || 'Routine',
    });
    if (name == null) return;
    // `autoKey: null` — a routine saved from history is always a new one. An
    // auto-key match would silently overwrite whichever routine shared it.
    const saved = await saveWorkoutAsRoutine({
      name: name.trim() || workout.name || 'Routine',
      autoKey: null,
      workout: { exercises: detail.map((ex) => ({ exerciseId: ex.exerciseId, sets: ex.sets })) },
    });
    if (!saved) return;
    playChime('success');
    useUIStore.getState().showToast(`Saved “${saved}” to Routines`, {
      type: 'success',
      action: { label: 'View', onAction: () => navigate('/templates') },
    });
  }

  const meta = 'flex items-center gap-1.5 font-sans text-xs';

  return (
    <div
      className="glass mb-2 rounded-2xl px-4 py-3"
      style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}
    >
      <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="w-full text-left">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-sans text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {workout.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: workout.color }} />}
              <span className="truncate">{workout.name}</span>
            </p>
            {tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {tags.map((t) => (
                  <span key={t} className="rounded-full px-2 py-0.5 font-sans text-[10px] font-medium" style={{ background: 'var(--color-ivory)', color: 'var(--color-gold)' }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {workout.xpEarned > 0 && (
              <span className="flex items-center gap-1 font-mono text-sm font-medium" style={{ color: 'var(--color-gold)' }}>
                <Zap size={13} />+{workout.xpEarned}
              </span>
            )}
            <ChevronDown
              size={16}
              style={{ color: 'var(--color-ash)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}
            />
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-sans text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {friendlyDate(workout.date)}
          </span>
          <span className={meta} style={{ color: 'var(--color-text-secondary)' }}>
            <Clock size={12} />
            {formatDuration(workout.duration)}
          </span>
          <span className={meta} style={{ color: 'var(--color-text-secondary)' }}>
            <Layers size={12} />
            {workout.totalSets} sets
          </span>
          {workout.totalVolume > 0 && (
            <span className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {fmtVolume(workout.totalVolume, unit)}
            </span>
          )}
          {kcal > 0 && (
            <span className={meta} style={{ color: 'var(--color-ember)' }}>
              <Flame size={12} />
              {kcal} kcal
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <m.div
          className="mt-3 border-t pt-3"
          style={{ borderColor: 'var(--color-ivory)' }}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={TWEEN.standard}
        >
          {/* The lifts, in the order they were done. */}
          {detail.map((ex) => {
            const rest = ex.isCardio ? null : avgRest(ex.sets);
            const lastWorking = [...ex.sets].reverse().find((s) => !s.isWarmup && !s.isCardio) ?? ex.sets.at(-1);
            return (
              <div key={ex.exerciseId} className="mb-3">
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <p className="truncate font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {ex.name}
                  </p>
                  {rest != null && (
                    <span className="shrink-0 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      rest {formatRest(rest)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  <AnimatePresence initial={false}>
                    {ex.sets.map((s) => (
                      <SetChip key={s.id} s={s} unit={unit} onEdit={editSet(ex)} />
                    ))}
                  </AnimatePresence>
                  {!ex.isCardio && (
                    // A dashed "+" at the end of the row — the set you forgot.
                    <button
                      type="button"
                      onClick={() => setEditing({ mode: 'add', workoutId: workout.id, exercise: ex, template: lastWorking })}
                      aria-label={`Add a set to ${ex.name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{ border: '1px dashed var(--color-ash)', color: 'var(--color-text-secondary)' }}
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
                {ex.sets.some((s) => s.note) && (
                  <div className="mt-1">
                    {ex.sets.filter((s) => s.note).map((s) => (
                      <p key={s.id} className="font-sans text-xs italic" style={{ color: 'var(--color-text-secondary)' }}>
                        · {s.note}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* What the app made of it at the time. */}
          {workout.verdict && (
            <div className="mb-3 flex gap-2 rounded-xl px-3 py-2.5" style={{ background: 'var(--color-ivory)' }}>
              <VerdictIcon size={13} className="mt-0.5 shrink-0" style={{ color: closedLoop ? 'var(--color-sage)' : 'var(--color-gold)' }} />
              <p className="font-sans text-xs leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                {workout.verdict}
              </p>
            </div>
          )}
          {workout.notes && (
            <p className="mb-3 font-sans text-xs italic leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              “{workout.notes}”
            </p>
          )}

          <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1">
            <span className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {detail.length} exercise{detail.length === 1 ? '' : 's'}
            </span>
            <span className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {formatDuration(workout.duration)} total
            </span>
            <span className="font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              avg rest {formatRest(avgRestAcross(detail.filter((e) => !e.isCardio).map((e) => e.sets)))}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRepeat}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl font-sans text-sm font-semibold"
              style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
            >
              <RotateCcw size={14} /> Repeat
            </button>
            <button
              type="button"
              onClick={handleSaveRoutine}
              disabled={!detail.length}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl font-sans text-sm font-medium"
              style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
            >
              <BookmarkPlus size={15} /> Save as routine
            </button>
          </div>

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setDetails((v) => !v)}
              aria-expanded={details}
              className="flex h-11 flex-1 items-center gap-2 rounded-xl px-3 font-sans text-sm font-medium"
              style={{ background: 'var(--color-ivory)', color: 'var(--color-text-secondary)' }}
            >
              <Pencil size={14} />
              <span className="flex-1 text-left">Edit details</span>
              <ChevronDown size={15} style={{ transform: details ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
            </button>
            <ShareButton
              data={shareData}
              label=""
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
            />
            <button
              type="button"
              onClick={handleDelete}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'var(--color-ivory)' }}
              aria-label="Delete workout"
            >
              <Trash2 size={15} style={{ color: 'var(--color-ember)' }} />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {details && (
              <m.div
                key="details"
                className="overflow-hidden"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={TWEEN.standard}
              >
                <WorkoutDetailsEditor workout={workout} />
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      )}

      {expanded && <SetEditSheet target={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
