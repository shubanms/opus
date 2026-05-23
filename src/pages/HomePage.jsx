import PageWrapper from '../components/layout/PageWrapper.jsx';

export default function HomePage() {
  return (
    <PageWrapper title="OPUS" subtitle="Build your masterpiece.">
      <p className="font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Dashboard coming in a later sprint.
      </p>
    </PageWrapper>
  );
}
