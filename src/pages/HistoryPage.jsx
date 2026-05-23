import PageWrapper from '../components/layout/PageWrapper.jsx';

export default function HistoryPage() {
  return (
    <PageWrapper title="History" subtitle="Past workouts">
      <p className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Workout history coming in Sprint 4.
      </p>
    </PageWrapper>
  );
}
