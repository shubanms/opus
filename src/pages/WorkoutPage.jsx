import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, RotateCcw } from 'lucide-react';
import useWorkoutStore from '../store/workoutStore.js';
import { m, SPRING } from '../motion/index.jsx';
import ExerciseSection from '../components/workout/ExerciseSection.jsx';
import ExercisePicker from '../components/workout/ExercisePicker.jsx';
import RestTimer from '../components/workout/RestTimer.jsx';
import EndWorkoutModal from '../components/workout/EndWorkoutModal.jsx';
import TemplateCard from '../components/template/TemplateCard.jsx';
import { useExercise } from '../hooks/useExercises.js';
import { useTemplatesWithExercises } from '../hooks/useTemplates.js';
import { useHaptics } from '../hooks/useHaptics.js';
import useSettingsStore from '../store/settingsStore.js';
import { maybePromptPermission, notifyPR } from '../utils/notifications.js';
import { saveWorkoutAsRoutine, advanceProgression } from '../utils/templateActions.js';
import { playChime } from '../utils/sound.js';
import { supersetRuns, noRestIds } from '../utils/supersets.js';
import { sessionIron } from '../utils/economy.js';
import { db } from '../db/db.js';
import useUIStore from '../store/uiStore.js';
import useCinematicStore from '../store/cinematicStore.js';

function ElapsedTimer({ startedAt }) {
  const [secs, setSecs] = useState(Math.round((Date.now() - startedAt) / 1000));
  useEffect(() => {
    const id = setInterval(() => setSecs(Math.round((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  return (
    <span className="mt-1 block font-mono text-sm" style={{ color: 'var(--color-text-secondary)' }}>
      {h > 0 ? `${h}h ${m % 60}m` : `${m}m`}
    </span>
  );
}

function ExerciseSectionWrapper({ ex, onSetLogged, onRemove, onSwap, canLink, linked, onToggleSuperset, onMoveUp, onMoveDown, canMoveUp, canMoveDown, active, done }) {
  const exerciseData = useExercise(ex.exerciseId);
  const muscleGroup = exerciseData?.muscleGroup ?? null;
  // `layout` makes reordering animate for free: move up/down already rewrites
  // the array, and Motion tweens each section from its old box to its new one
  // instead of the list snapping.
  return (
    <m.div layout transition={SPRING.layout}>
    <ExerciseSection
      exercise={ex}
      muscleGroup={muscleGroup}
      isBodyweight={exerciseData?.equipment === 'bodyweight'}
      isCardio={exerciseData?.equipment === 'cardio'}
      onSetLogged={onSetLogged}
      onRemove={onRemove}
      onSwap={onSwap}
      canLink={canLink}
      linked={linked}
      onToggleSuperset={onToggleSuperset}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      active={active}
      done={done}
    />
    </m.div>
  );
}

export default function WorkoutPage() {
  const { activeWorkout, resumed, dismissResumed, startWorkout, startFromTemplate, addExercise, removeExercise, swapExercise, discardWorkout, completeWorkout, setWorkoutName, setEnergy, setWorkoutNotes, toggleSuperset, moveExercise } = useWorkoutStore();
  const navigate = useNavigate();
  const templates = useTemplatesWithExercises();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [swapId, setSwapId] = useState(null); // exercise being swapped, or null
  const [endOpen, setEndOpen] = useState(false);
  const [showRest, setShowRest] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [restKey, setRestKey] = useState(0);
  const restDuration = useSettingsStore((s) => s.restDuration);
  const setRestDuration = useSettingsStore((s) => s.setRestDuration);
  const nameRef = useRef();
  const haptic = useHaptics();

  // Gentle cue when a session was restored from a lock/reload.
  useEffect(() => {
    if (resumed && activeWorkout) {
      haptic('success');
      playChime('success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumed]);

  const alreadyAdded = activeWorkout?.exercises.map((e) => e.exerciseId) ?? [];

  const exercises = activeWorkout?.exercises ?? [];
  // "Done" only means a target was actually met. An ad-hoc session has no
  // targets, so nothing is dimmed — logging two sets of bench doesn't mean
  // you're finished with bench.
  const isDone = (ex) => {
    const working = ex.sets.filter((x) => !x.isWarmup).length;
    return Boolean(ex.targetSets) && working >= ex.targetSets;
  };
  // "Active" is where you actually are: the exercise you logged to most
  // recently. Before anything is logged, it's the first one that isn't done.
  const lastLogged = exercises.reduce(
    (best, ex) => {
      const t = Math.max(0, ...ex.sets.map((x) => x.completedAt ?? 0));
      return t > best.t ? { t, id: ex.exerciseId } : best;
    },
    { t: 0, id: null },
  );
  const activeId = lastLogged.id ?? exercises.find((ex) => !isDone(ex))?.exerciseId ?? null;
  const runs = supersetRuns(exercises);
  const noRest = noRestIds(exercises);

  function handleSetLogged(exerciseId) {
    setRestKey((k) => k + 1);
    setShowRest(!(exerciseId != null && noRest.has(exerciseId)));
  }

  async function handleSave(xp, routine) {
    const snapshot = activeWorkout; // completeWorkout clears the store — capture first
    let result;
    try {
      result = await completeWorkout(xp);
    } catch (e) {
      // Never fail silently: the session is preserved (completeWorkout only
      // clears the store on success), so surface the error and let the user
      // retry instead of the button appearing to do nothing.
      console.error('Finish workout failed:', e);
      useUIStore.getState().showToast("Couldn't save the workout — your session is safe. Try again.", { type: 'error' });
      return;
    }
    setEndOpen(false);
    if (result?.discarded) return; // empty session — nothing saved or rewarded

    // Iron + rest-token reward feedback. Both are derived from history, so this
    // just surfaces what the finished session added (the user asked to see it).
    try {
      const iron = sessionIron(result?.prCount ?? 0);
      const finishedCount = await db.workouts.count();
      const earnedToken = finishedCount > 0 && finishedCount % 10 === 0; // one token per 10 workouts
      useUIStore.getState().showToast(
        earnedToken ? `◆ +${iron} Iron · 🛡 Rest token earned!` : `◆ +${iron} Iron earned`,
        { type: 'success' },
      );
    } catch (e) {
      console.error('Reward feedback failed (workout still saved):', e);
    }

    // A real dungeon clear gets its own cinematic below. Re-running a dungeon
    // already banked today rewards nothing, so it stays a plain toast — a
    // fanfare for no reward would be a lie.
    if (result?.dungeon?.alreadyCleared) {
      useUIStore.getState().showToast(`⚔ ${result.dungeon.name} — already cleared today`, {
        type: 'success',
      });
    }

    // Advance the routine's targets by its progression scheme (if any).
    if (snapshot?.templateId) {
      try {
        const prog = await advanceProgression(snapshot.templateId, snapshot.exercises);
        if (prog?.count) {
          const verb = prog.mode === 'linear' ? 'progressed' : 'updated';
          useUIStore.getState().showToast(`Routine ${verb}: next targets set for ${prog.count} lift${prog.count > 1 ? 's' : ''}`, { type: 'success' });
        }
      } catch (e) {
        console.error('Progression advance failed (workout still saved):', e);
      }
    }

    // Keep an ad-hoc session as a routine if the user opted in.
    if (routine?.saveRoutine) {
      try {
        const savedName = await saveWorkoutAsRoutine({ ...routine, name: routine.routineName, workout: snapshot });
        if (savedName) useUIStore.getState().showToast(`Saved as "${savedName}"`, { type: 'success' });
      } catch (e) {
        console.error('Save-as-routine failed (workout still saved):', e);
      }
    }

    await maybePromptPermission();
    if (result?.prCount > 0) {
      notifyPR(`You set ${result.prCount} new record${result.prCount === 1 ? '' : 's'} this session.`);
    }
    // Everything worth celebrating goes to one queue, which owns the order and
    // — since none of it can be skipped — the pacing. Each cinematic fires its
    // own sound and haptic, so the only cue left here is the ordinary finish.
    const celebrating = useCinematicStore.getState().celebrate(result);
    if (!celebrating) {
      haptic('success');
      playChime('success');
    }
  }

  if (!activeWorkout) {
    return (
      <>
        <div className="px-5 pb-24 pt-8">
        <h1 className="font-display text-5xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
          Ready?
        </h1>
        <p className="mt-1 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Start fresh or pick a routine
        </p>

        <button
          onClick={() => { playChime('start'); startWorkout(); }}
          className="mt-6 w-full rounded-2xl py-4 font-sans text-base font-semibold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
        >
          Quick start (empty)
        </button>

        <div className="mt-8 mb-3 flex items-center justify-between">
          <h2 className="font-sans text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>
            Your routines
          </h2>
          <button
            onClick={() => navigate('/templates')}
            className="flex items-center gap-1 font-sans text-xs"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Manage <ChevronRight size={12} />
          </button>
        </div>

        {templates.length === 0 ? (
          <button
            onClick={() => navigate('/templates')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl py-5 font-sans text-sm font-medium"
            style={{ border: '1px dashed var(--color-ash)', color: 'var(--color-text-secondary)' }}
          >
            <Plus size={15} /> Create a routine
          </button>
        ) : (
          templates.map((t) => (
            <TemplateCard key={t.id} template={t} onStart={(tpl) => { playChime('start'); startFromTemplate(tpl); }} />
          ))
        )}
        </div>
      </>
    );
  }

  return (
    <div className="px-5 pb-40 pt-8">
      {resumed && (
        <div
          className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2"
          style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-gold)' }}
        >
          <RotateCcw size={14} style={{ color: 'var(--color-gold)' }} />
          <span className="flex-1 font-sans text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Picked up your in-progress workout.
          </span>
          <button onClick={dismissResumed} className="font-sans text-xs font-semibold" style={{ color: 'var(--color-gold)' }}>
            Got it
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div className="flex-1">
          {editingName ? (
            <input
              ref={nameRef}
              autoFocus
              value={activeWorkout.name}
              onChange={(e) => setWorkoutName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
              className="w-full bg-transparent font-display text-3xl font-bold leading-none outline-none"
              style={{ color: 'var(--color-text-primary)' }}
            />
          ) : (
            <button onClick={() => setEditingName(true)} className="text-left">
              <h1 className="font-display text-3xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
                {activeWorkout.name}
              </h1>
            </button>
          )}
          <ElapsedTimer startedAt={activeWorkout.startedAt} />
        </div>
        <div className="ml-4 flex gap-2">
          <button
            onClick={discardWorkout}
            className="rounded-xl px-3 py-2 font-sans text-xs font-medium"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-secondary)' }}
          >
            Discard
          </button>
          <button
            onClick={() => setEndOpen(true)}
            className="rounded-xl px-3 py-2 font-sans text-xs font-semibold"
            style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
          >
            Finish
          </button>
        </div>
      </div>

      {/* Energy check-in */}
      {activeWorkout.energy == null && (
        <div className="glass mb-4 rounded-2xl px-4 py-3" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
          <p className="mb-2 font-sans text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            How's your energy today?
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setEnergy(n)}
                className="flex h-10 flex-1 items-center justify-center rounded-xl font-mono text-sm font-medium"
                style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Rest timer */}
      {showRest && (
        <div className="mb-4">
          <RestTimer
            key={restKey}
            duration={restDuration}
            onComplete={() => setShowRest(false)}
            onSkip={() => setShowRest(false)}
            onSetDefault={setRestDuration}
          />
        </div>
      )}

      {/* Exercise sections (grouped into superset brackets) */}
      {runs.map((run) => {
        const renderEx = (ex) => {
          const idx = exercises.indexOf(ex);
          const linked = idx > 0 && ex.supersetId != null && ex.supersetId === exercises[idx - 1].supersetId;
          return (
            <ExerciseSectionWrapper
              key={ex.exerciseId}
              ex={ex}
              canLink={idx > 0}
              linked={linked}
              onSetLogged={handleSetLogged}
              onRemove={() => removeExercise(ex.exerciseId)}
              onSwap={() => { setSwapId(ex.exerciseId); setPickerOpen(true); }}
              onToggleSuperset={() => toggleSuperset(ex.exerciseId)}
              onMoveUp={() => moveExercise(ex.exerciseId, -1)}
              onMoveDown={() => moveExercise(ex.exerciseId, 1)}
              canMoveUp={idx > 0}
              canMoveDown={idx < exercises.length - 1}
              active={ex.exerciseId === activeId}
              done={isDone(ex)}
            />
          );
        };
        if (run.length < 2) return renderEx(run[0]);
        return (
          <div
            key={`ss-${run[0].exerciseId}`}
            className="mb-4 rounded-2xl py-1 pl-2"
            style={{ borderLeft: '3px solid var(--color-gold)' }}
          >
            <p className="mb-1 pl-2 pt-1 font-sans text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-gold)' }}>
              Superset · {run.length} moves · rest after the last
            </p>
            {run.map(renderEx)}
          </div>
        );
      })}

      {/* Add exercise */}
      <button
        onClick={() => setPickerOpen(true)}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-sans text-sm font-medium"
        style={{ background: 'var(--color-chalk)', border: '1px dashed var(--color-ivory)', color: 'var(--color-text-secondary)' }}
      >
        <Plus size={16} /> Add exercise
      </button>

      {/* Session note */}
      <textarea
        value={activeWorkout.notes ?? ''}
        onChange={(e) => setWorkoutNotes(e.target.value)}
        placeholder="Session notes — how it felt, what to change next time…"
        rows={2}
        className="mt-4 w-full resize-none rounded-2xl px-4 py-3 font-sans text-sm outline-none"
        style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)', color: 'var(--color-text-primary)' }}
      />

      <ExercisePicker
        isOpen={pickerOpen}
        onClose={() => { setPickerOpen(false); setSwapId(null); }}
        onSelect={(ex) => { playChime('tap'); if (swapId) swapExercise(swapId, ex); else addExercise(ex); }}
        alreadyAdded={alreadyAdded}
      />

      <EndWorkoutModal
        isOpen={endOpen}
        activeWorkout={activeWorkout}
        elapsedSecs={Math.round((Date.now() - activeWorkout.startedAt) / 1000)}
        onSave={handleSave}
        onClose={() => setEndOpen(false)}
      />
    </div>
  );
}
