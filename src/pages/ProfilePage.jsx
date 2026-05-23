import PageWrapper from '../components/layout/PageWrapper.jsx';
import OpusMark from '../components/logo/OpusMark.jsx';

export default function ProfilePage() {
  return (
    <PageWrapper title="Profile" subtitle="Your character">
      <div className="flex justify-center py-6">
        <OpusMark size={140} dark />
      </div>
      <p className="text-center font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        RPG character card coming in Sprint 6.
      </p>
    </PageWrapper>
  );
}
