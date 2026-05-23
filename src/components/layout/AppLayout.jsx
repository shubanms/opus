import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav.jsx';

export default function AppLayout() {
  return (
    <div className="min-h-full" style={{ background: 'var(--color-chalk)' }}>
      <main className="mx-auto w-full max-w-md pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
