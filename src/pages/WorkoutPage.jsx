import PageWrapper from '../components/layout/PageWrapper.jsx';

export default function WorkoutPage() {
  return (
    <PageWrapper title="Workout" subtitle="Active session">
      <p className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Workout logging coming in Sprint 4.
      </p>
    </PageWrapper>
  );
}
