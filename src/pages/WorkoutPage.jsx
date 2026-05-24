import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, RotateCcw } from 'lucide-react';
import useWorkoutStore from '../store/workoutStore.js';
import ExerciseSection from '../components/workout/ExerciseSection.jsx';
import ExercisePicker from '../components/workout/ExercisePicker.jsx';
import RestTimer from '../components/workout/RestTimer.jsx';
import EndWorkoutModal from '../components/workout/EndWorkoutModal.jsx';
import TemplateCard from '../components/template/TemplateCard.jsx';
import LevelUpScreen from '../components/rpg/LevelUpScreen.jsx';
import AchievementToast from '../components/rpg/AchievementToast.jsx';
import Particles from '../components/fx/Particles.jsx';
import { useExercise } from '../hooks/useExercises.js';
import { useTemplatesWithExercises } from '../hooks/useTemplates.js';
import { useHaptics } from '../hooks/useHaptics.js';
import useSettingsStore from '../store/settingsStore.js';
import { maybePromptPermission, notifyPR } from '../utils/notifications.js';
import { playChime } from '../utils/sound.js';
import { supersetRuns, noRestIds } from '../utils/supersets.js';

function ElapsedTimer({ startedAt }) {
  const [secs, setSecs] = useState(Math.round((Date.now() - startedAt) / 1000));
  useEffect(() => {
    const id = setInterval(() => setSecs(Math.round((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  return (
    <span className="font-mono text-sm" style={{ color: 'var(--color-text-secondary)' }}>
      {h > 0 ? `${h}h ${m % 60}m` : `${m}m`}
    </span>
  );
}

function ExerciseSectionWrapper({ ex, onSetLogged, onRemove, canLink, linked, onToggleSuperset }) {
  const exerciseData = useExercise(ex.exerciseId);
  const muscleGroup = exerciseData?.muscleGroup ?? null;
  return (
    <ExerciseSection
      exercise={ex}
      muscleGroup={muscleGroup}
      isBodyweight={exerciseData?.equipment === 'bodyweight'}
      onSetLogged={onSetLogged}
      onRemove={onRemove}
      canLink={canLink}
      linked={linked}
      onToggleSuperset={onToggleSuperset}
    />
  );
}

export default function WorkoutPage() {
  const { activeWorkout, resumed, dismissResumed, startWorkout, startFromTemplate, addExercise, removeExercise, discardWorkout, completeWorkout, setWorkoutName, setEnergy, setWorkoutNotes, toggleSuperset } = useWorkoutStore();
  const navigate = useNavigate();
  const templates = useTemplatesWithExercises();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [showRest, setShowRest] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [levelUp, setLevelUp] = useState(null);
  const [celebrate, setCelebrate] = useState(false);
  const [unlocked, setUnlocked] = useState(null);
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
  const runs = supersetRuns(exercises);
  const noRest = noRestIds(exercises);

  function handleSetLogged(exerciseId) {
    setRestKey((k) => k + 1);
    setShowRest(!(exerciseId != null && noRest.has(exerciseId)));
  }

  async function handleSave(xp) {
    const result = await completeWorkout(xp);
    setEndOpen(false);
    await maybePromptPermission();
    if (result?.prCount > 0) {
      notifyPR(`You set ${result.prCount} new record${result.prCount === 1 ? '' : 's'} this session.`);
    }
    if (result?.leveledUp) {
      setLevelUp({ level: result.newLevel, title: result.newTitle });
    } else if (result?.prCount > 0) {
      haptic('pr');
      playChime('pr');
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1300);
    } else {
      haptic('success');
      playChime('success');
    }
    if (result?.newAchievements?.length) {
      setUnlocked(result.newAchievements);
    }
  }

  if (!activeWorkout) {
    return (
      <>
        {celebrate && <Particles />}
        {unlocked && <AchievementToast achievements={unlocked} onDismiss={() => setUnlocked(null)} />}
        {levelUp && (
          <LevelUpScreen level={levelUp.level} title={levelUp.title} onDismiss={() => setLevelUp(null)} />
        )}
        <div className="anim-fade-slide-up px-5 pb-24 pt-8">
        <h1 className="font-display text-5xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
          Ready?
        </h1>
        <p className="mt-1 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Start fresh or pick a routine
        </p>

        <button
          onClick={() => startWorkout()}
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
            <TemplateCard key={t.id} template={t} onStart={startFromTemplate} />
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
          className="anim-fade-slide-up mb-4 flex items-center gap-2 rounded-xl px-3 py-2"
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
        <div className="mb-4 rounded-2xl px-4 py-3" style={{ background: 'var(--color-chalk)', border: '1px solid var(--color-ivory)' }}>
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
              onToggleSuperset={() => toggleSuperset(ex.exerciseId)}
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
        onClose={() => setPickerOpen(false)}
        onSelect={addExercise}
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
