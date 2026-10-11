import { Dumbbell, User, Zap, Settings, ChevronRight, Star } from 'lucide-react';

const EQUIP_ICON = {
  barbell:    Dumbbell,
  dumbbell:   Dumbbell,
  bodyweight: User,
  cable:      Zap,
  machine:    Settings,
};

const MUSCLE_HUE = {
  chest: '#E0553B', triceps: '#E0553B', 'front-deltoids': '#E0553B',
  biceps: '#D2AE5A', forearm: '#D2AE5A',
  'upper-back': '#9DA67A', 'lower-back': '#9DA67A', trapezius: '#9DA67A', 'back-deltoids': '#9DA67A',
  quadriceps: '#8F877B', hamstring: '#8F877B', gluteal: '#8F877B', calves: '#8F877B',
  abs: '#D2AE5A', obliques: '#D2AE5A',
};

const DIFFICULTY_COLOR = {
  beginner:     '#9DA67A',
  intermediate: '#D2AE5A',
  advanced:     '#E0553B',
};

export default function ExerciseCard({ exercise, onTap, selected = false, showArrow = false }) {
  const Icon = EQUIP_ICON[exercise.equipment] ?? Dumbbell;
  const hue = MUSCLE_HUE[exercise.muscleGroup] ?? '#8F877B';
  const diffColor = DIFFICULTY_COLOR[exercise.difficulty] ?? '#8F877B';

  return (
    <button
      type="button"
      onClick={onTap}
      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left"
      style={{
        background: selected ? 'var(--color-stone)' : 'var(--color-ivory)',
        transition: 'background var(--dur-micro)',
      }}
    >
      <div className="relative shrink-0">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: `${hue}22` }}
        >
          <Icon size={18} style={{ color: hue }} />
        </div>
        {exercise.color && (
          <span
            className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full"
            style={{ background: exercise.color, border: '2px solid var(--color-ivory)' }}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className="flex items-center gap-1.5 truncate font-sans text-sm font-medium"
          style={{ color: selected ? 'var(--color-text-inverse)' : 'var(--color-text-primary)' }}
        >
          {exercise.favorite && <Star size={12} fill="var(--color-gold)" style={{ color: 'var(--color-gold)', flexShrink: 0 }} />}
          <span className="truncate">{exercise.name}</span>
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          <p
            className="truncate font-sans text-xs capitalize"
            style={{ color: selected ? 'var(--color-ash)' : 'var(--color-text-secondary)' }}
          >
            {exercise.muscleGroup.replace(/-/g, ' ')} · {exercise.equipment}
          </p>
          {exercise.difficulty && (
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 font-sans text-xs capitalize"
              style={{ background: `${diffColor}22`, color: diffColor }}
            >
              {exercise.difficulty}
            </span>
          )}
        </div>
      </div>

      {showArrow && (
        <ChevronRight size={16} style={{ color: 'var(--color-ash)', flexShrink: 0 }} />
      )}
    </button>
  );
}
