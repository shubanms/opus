import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Sparkles, CalendarRange } from 'lucide-react';
import { useTemplatesWithExercises } from '../hooks/useTemplates.js';
import { useExercises } from '../hooks/useExercises.js';
import { useWorkouts } from '../hooks/useWorkout.js';
import { deleteTemplate, duplicateTemplate, updateTemplate, renameTemplate } from '../utils/templateActions.js';
import { reshuffleRoutine, makeRng } from '../utils/routineGenerator.js';
import { sessionCounts, isStaleRoutine } from '../utils/staleRoutine.js';
import { playChime } from '../utils/sound.js';
import TemplateCard from '../components/template/TemplateCard.jsx';
import TemplateBuilder from '../components/template/TemplateBuilder.jsx';
import RoutineGeneratorModal from '../components/template/RoutineGeneratorModal.jsx';
import WeekPlannerModal from '../components/template/WeekPlannerModal.jsx';
import WeeklyPlanner from '../components/template/WeeklyPlanner.jsx';
import useUIStore from '../store/uiStore.js';

export default function TemplatesPage() {
  const navigate = useNavigate();
  const templates = useTemplatesWithExercises();
  const allExercises = useExercises();
  const workouts = useWorkouts();
  const counts = sessionCounts(workouts);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  function openNew() {
    setEditing(null);
    setBuilderOpen(true);
  }

  function openEdit(template) {
    setEditing(template);
    setBuilderOpen(true);
  }

  async function handleDelete(template) {
    const ok = await useUIStore.getState().confirm({
      title: 'Delete routine?',
      message: `"${template.name}" will be removed.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (ok) await deleteTemplate(template.id);
  }

  async function handleDuplicate(template) {
    await duplicateTemplate(template.id);
  }

  async function handleRename(template) {
    const name = await useUIStore.getState().prompt({
      title: 'Rename routine',
      placeholder: 'Routine name',
      defaultValue: template.name,
    });
    if (name != null && name.trim() && name.trim() !== template.name) {
      await renameTemplate(template.id, name);
    }
  }

  // One-tap "medium" re-roll from the card: keep the routine's shape, swap ~half.
  async function handleShuffle(template) {
    const slots = template.exercises.map((e) => ({
      exerciseId: e.id,
      muscleGroup: e.muscleGroup,
      difficulty: e.difficulty,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
      targetWeight: e.targetWeight,
    }));
    const next = reshuffleRoutine({ slots, intensity: 'medium', pool: allExercises, rng: makeRng(Date.now()) });
    playChime('start');
    await updateTemplate(template.id, {
      name: template.name,
      dayOfWeek: template.dayOfWeek,
      color: template.color,
      exercises: next.map((s) => ({ exerciseId: s.exerciseId, targetSets: s.targetSets, targetReps: s.targetReps, targetWeight: s.targetWeight })),
    });
  }

  return (
    <div className="anim-fade-slide-up px-5 pb-24 pt-8">
      <button onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2">
        <ArrowLeft size={18} style={{ color: 'var(--color-text-secondary)' }} />
        <span className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>Back</span>
      </button>

      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
            Routines
          </h1>
          <p className="mt-1 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Reusable workout templates
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            onClick={() => setPlanOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-full px-3 font-sans text-xs font-semibold"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          >
            <CalendarRange size={15} style={{ color: 'var(--color-gold)' }} /> Plan week
          </button>
          <button
            onClick={() => setGenOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-full px-3 font-sans text-xs font-semibold"
            style={{ background: 'var(--color-ivory)', color: 'var(--color-text-primary)' }}
          >
            <Sparkles size={15} style={{ color: 'var(--color-gold)' }} /> Auto
          </button>
          <button
            onClick={openNew}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: 'var(--color-gold)' }}
            aria-label="New routine"
          >
            <Plus size={20} style={{ color: 'var(--color-obsidian)' }} strokeWidth={2.5} />
          </button>
        </div>
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
              onClick={() => setGenOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-sans text-sm font-semibold"
              style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
            >
              <Sparkles size={16} /> Auto-generate one for me
            </button>
            <button
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
          <TemplateCard key={t.id} template={t} onEdit={openEdit} onRename={handleRename} onDelete={handleDelete} onDuplicate={handleDuplicate} onShuffle={handleShuffle} stale={isStaleRoutine(t, counts[t.id] ?? 0)} />
        ))
      )}

      <TemplateBuilder
        isOpen={builderOpen}
        onClose={() => setBuilderOpen(false)}
        editing={editing}
      />
      <RoutineGeneratorModal isOpen={genOpen} onClose={() => setGenOpen(false)} />
      <WeekPlannerModal isOpen={planOpen} onClose={() => setPlanOpen(false)} />
    </div>
  );
}
