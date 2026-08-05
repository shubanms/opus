import { Dumbbell, User, Zap, Settings, ChevronRight, Star } from 'lucide-react';

const EQUIP_ICON = {
  barbell:    Dumbbell,
  dumbbell:   Dumbbell,
  bodyweight: User,
  cable:      Zap,
  machine:    Settings,
};

const MUSCLE_HUE = {
  chest: '#FF8FA3', triceps: '#FF8FA3', 'front-deltoids': '#FF8FA3',
  biceps: '#8B7DFF', forearm: '#8B7DFF',
  'upper-back': '#4FD8C4', 'lower-back': '#4FD8C4', trapezius: '#4FD8C4', 'back-deltoids': '#4FD8C4',
  quadriceps: '#7B83A6', hamstring: '#7B83A6', gluteal: '#7B83A6', calves: '#7B83A6',
  abs: '#8B7DFF', obliques: '#8B7DFF',
};

const DIFFICULTY_COLOR = {
  beginner:     '#4FD8C4',
  intermediate: '#8B7DFF',
  advanced:     '#FF8FA3',
};

export default function ExerciseCard({ exercise, onTap, selected = false, showArrow = false }) {
  const Icon = EQUIP_ICON[exercise.equipment] ?? Dumbbell;
  const hue = MUSCLE_HUE[exercise.muscleGroup] ?? '#7B83A6';
  const diffColor = DIFFICULTY_COLOR[exercise.difficulty] ?? '#7B83A6';

  return (
    <button
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
