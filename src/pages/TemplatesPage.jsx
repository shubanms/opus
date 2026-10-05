import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Sparkles, CalendarRange, BookOpen } from 'lucide-react';
import { useTemplatesWithExercises } from '../hooks/useTemplates.js';
import { useExercises } from '../hooks/useExercises.js';
import { useWorkouts } from '../hooks/useWorkout.js';
import { deleteTemplate, restoreTemplate, duplicateTemplate, updateTemplate, renameTemplate } from '../utils/templateActions.js';
import { deleteWithUndo } from '../utils/undoable.js';
import { reshuffleRoutine, makeRng } from '../utils/routineGenerator.js';
import { sessionCounts, isStaleRoutine } from '../utils/staleRoutine.js';
import { ownsItsDay } from '../utils/routineDays.js';
import { confirmReplaceSession } from '../utils/sessionGuard.js';
import { playChime } from '../utils/sound.js';
import TemplateCard from '../components/template/TemplateCard.jsx';
import TemplateBuilder from '../components/template/TemplateBuilder.jsx';
import RoutineGeneratorModal from '../components/template/RoutineGeneratorModal.jsx';
import WeekPlannerModal from '../components/template/WeekPlannerModal.jsx';
import WeeklyPlanner from '../components/template/WeeklyPlanner.jsx';
import ProgramsModal from '../components/template/ProgramsModal.jsx';
import useUIStore from '../store/uiStore.js';
import useWorkoutStore from '../store/workoutStore.js';

// A routine row as updateTemplate takes it — every field, so a shuffle can't
// quietly drop rest times, miss counts or per-lift steps.
const toRow = (e) => ({
  exerciseId: e.id,
  targetSets: e.targetSets,
  targetReps: e.targetReps,
  targetWeight: e.targetWeight,
  targetRest: e.targetRest,
  misses: e.misses,
  weightStep: e.weightStep,
});

export default function TemplatesPage() {
  const navigate = useNavigate();
  const templates = useTemplatesWithExercises();
  const allExercises = useExercises();
  const workouts = useWorkouts();
  const counts = sessionCounts(workouts);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [programsOpen, setProgramsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  // Routines with a write in flight. A double-tap on Shuffle or Duplicate ran
  // the write twice (two copies; a shuffle of a shuffle).
  const [busy, setBusy] = useState(() => new Set());
  const inFlight = useRef(new Set());

  async function guarded(id, fn) {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);
    setBusy(new Set(inFlight.current));
    try {
      await fn();
    } finally {
      inFlight.current.delete(id);
      setBusy(new Set(inFlight.current));
    }
  }

  function openNew() {
    setEditing(null);
    setBuilderOpen(true);
  }

  function openEdit(template) {
    setEditing(template);
    setBuilderOpen(true);
  }

  async function handleStart(template) {
    if (!(await confirmReplaceSession(`“${template.name || 'Routine'}”`))) return;
    playChime('start');
    useWorkoutStore.getState().startFromTemplate(template);
    navigate('/workout');
  }

  async function handleDelete(template) {
    await deleteWithUndo({
      label: template.name || 'Routine',
      remove: () => deleteTemplate(template.id),
      restore: restoreTemplate,
    });
  }

  function handleDuplicate(template) {
    return guarded(template.id, async () => {
      await duplicateTemplate(template.id);
      useUIStore.getState().showToast(`Copied as “${template.name} copy”`, { type: 'success' });
    });
  }

  async function handleRename(template) {
    const name = await useUIStore.getState().prompt({
      title: 'Rename routine',
      placeholder: 'Routine name',
      defaultValue: template.name,
    });
    if (name?.trim() && name.trim() !== template.name) {
      await renameTemplate(template.id, name);
    }
  }

  // One-tap "medium" re-roll from the card: keep the routine's shape, swap ~half.
  function handleShuffle(template) {
    return guarded(template.id, async () => {
      const slots = template.exercises.map((e) => ({ ...toRow(e), muscleGroup: e.muscleGroup, difficulty: e.difficulty }));
      const next = reshuffleRoutine({ slots, intensity: 'medium', pool: allExercises, rng: makeRng(Date.now()) });
      playChime('start');
      await updateTemplate(template.id, {
        name: template.name,
        dayOfWeek: template.dayOfWeek,
        color: template.color,
        exercises: next.map(({ muscleGroup: _m, difficulty: _d, ...row }) => row),
      });
    });
  }

  return (
    <div className="px-5 pb-24 pt-8">
      <button type="button" onClick={() => navigate(-1)} className="mb-5 flex min-h-10 items-center gap-2 pr-3">
        <ArrowLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Back</span>
      </button>

      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-4xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
            Routines
          </h1>
          <p className="mt-1 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Reusable workout templates
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--color-gold)' }}
          aria-label="New routine"
        >
          <Plus size={20} style={{ color: 'var(--color-obsidian)' }} strokeWidth={2.5} />
        </button>
      </div>

      {/* Action pills — their own edge-to-edge scrollable row so they never
          push the page wider than the screen. */}
      <div className="no-scrollbar -mx-5 mb-6 flex gap-2 overflow-x-auto px-5 pb-1">
        <button
          type="button"
          onClick={() => setProgramsOpen(true)}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 font-sans text-xs font-semibold"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        >
          <BookOpen size={15} style={{ color: 'var(--color-gold)' }} /> Programs
        </button>
        <button
          type="button"
          onClick={() => setPlanOpen(true)}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 font-sans text-xs font-semibold"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        >
          <CalendarRange size={15} style={{ color: 'var(--color-gold)' }} /> Plan week
        </button>
        <button
          type="button"
          onClick={() => setGenOpen(true)}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 font-sans text-xs font-semibold"
          style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
        >
          <Sparkles size={15} style={{ color: 'var(--color-gold)' }} /> Auto
        </button>
      </div>

      {templates.length > 0 && <WeeklyPlanner templates={templates} />}

      {templates.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            No routines yet
          </p>
          <p className="mt-2 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Build a routine to start workouts in one tap.
          </p>
          <div className="mt-5 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setGenOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-sans text-sm font-semibold"
              style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
            >
              <Sparkles size={16} /> Auto-generate one for me
            </button>
            <button
              type="button"
              onClick={openNew}
              className="font-sans text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              or build it yourself
            </button>
          </div>
        </div>
      ) : (
        templates.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            onStart={handleStart}
            onEdit={openEdit}
            onRename={handleRename}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onShuffle={handleShuffle}
            busy={busy.has(t.id)}
            showDay={ownsItsDay(t, templates)}
            stale={isStaleRoutine(t, counts[t.id] ?? 0)}
          />
        ))
      )}

      <TemplateBuilder
        isOpen={builderOpen}
        onClose={() => setBuilderOpen(false)}
        editing={editing}
        templates={templates}
      />
      <RoutineGeneratorModal isOpen={genOpen} onClose={() => setGenOpen(false)} templates={templates} />
      <ProgramsModal isOpen={programsOpen} onClose={() => setProgramsOpen(false)} templates={templates} />
      <WeekPlannerModal isOpen={planOpen} onClose={() => setPlanOpen(false)} templates={templates} />
    </div>
  );
}
