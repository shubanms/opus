import PageWrapper from '../components/layout/PageWrapper.jsx';
import WorkoutCard from '../components/workout/WorkoutCard.jsx';
import { useWorkouts } from '../hooks/useWorkout.js';

export default function HistoryPage() {
  const workouts = useWorkouts();

  if (workouts.length === 0) {
    return (
      <PageWrapper title="History" subtitle="Past workouts">
        <div className="mt-20 text-center">
          <p className="font-display text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            No workouts yet
          </p>
          <p className="mt-2 font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Complete your first session to see it here
          </p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="History" subtitle="Past workouts">
      <div className="pb-6">
        {workouts.map((w) => (
          <WorkoutCard key={w.id} workout={w} />
        ))}
      </div>
    </PageWrapper>
  );
}
