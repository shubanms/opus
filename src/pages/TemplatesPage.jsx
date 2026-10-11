import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, CalendarRange, BookOpen } from 'lucide-react';
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
import RoutineSlip from '../components/template/RoutineSlip.jsx';
import { Chip, InkButton } from '../components/ink/index.js';
import '../styles/ink-journal.css';
import TemplateBuilder from '../components/template/TemplateBuilder.jsx';
import RoutineGeneratorModal from '../components/template/RoutineGeneratorModal.jsx';
import WeekPlannerModal from '../components/template/WeekPlannerModal.jsx';
import WeeklyPlanner from '../components/template/WeeklyPlanner.jsx';
import ProgramsModal from '../components/template/ProgramsModal.jsx';
import useUIStore from '../store/uiStore.js';
import useWorkoutStore from '../store/workoutStore.js';
import BackButton from '../components/layout/BackButton.jsx';

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
    <div className="jr-page jr-page--pad">
      <header className="jr-head">
        <div className="jr-head__l">
          <BackButton fallback="/workout" label="" className="" />
          <div className="min-w-0">
            <h1 className="jr-title">Routines</h1>
            <p className="jr-sub">Reusable workout templates</p>
          </div>
        </div>
        <button type="button" onClick={openNew} className="jr-add" aria-label="New routine">
          <Plus size={20} strokeWidth={2} />
        </button>
      </header>

      {/* Action chips — their own edge-to-edge scrollable row so they never
          push the page wider than the screen. */}
      <div className="jr-tags scrollbar-hide">
        <Chip onClick={() => setProgramsOpen(true)}>
          <BookOpen size={15} /> Programs
        </Chip>
        <Chip onClick={() => setPlanOpen(true)}>
          <CalendarRange size={15} /> Plan week
        </Chip>
        <Chip onClick={() => setGenOpen(true)}>
          <Sparkles size={15} /> Auto
        </Chip>
      </div>

      {templates.length > 0 && <WeeklyPlanner templates={templates} />}

      {templates.length === 0 ? (
        <div className="jr-none">
          <p className="jr-none__t">No routines yet</p>
          <p className="jr-none__b">Build a routine to start workouts in one tap.</p>
          <InkButton variant="primary" onClick={() => setGenOpen(true)}>
            <Sparkles size={16} /> Auto-generate one for me
          </InkButton>
          <button type="button" onClick={openNew} className="jr-link">
            or build it yourself
          </button>
        </div>
      ) : (
        <div className="jr-stack">
          {templates.map((t) => (
            <RoutineSlip
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
          ))}
        </div>
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
