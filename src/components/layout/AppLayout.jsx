import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav.jsx';
import { useRPG } from '../../hooks/useRPG.js';

export default function AppLayout() {
  // Ensures user profile exists in DB on first run.
  useRPG();

  return (
    <div className="min-h-full" style={{ background: 'var(--color-chalk)' }}>
      <main className="mx-auto w-full max-w-md pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
