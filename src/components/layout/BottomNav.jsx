import { NavLink } from 'react-router-dom';
import { Home, BarChart3, Plus, Dumbbell, User } from 'lucide-react';

const tabs = [
  { to: '/home', label: 'Home', Icon: Home },
  { to: '/progress', label: 'Progress', Icon: BarChart3 },
  { to: '/workout', label: 'Workout', Icon: Plus, center: true },
  { to: '/exercises', label: 'Exercises', Icon: Dumbbell },
  { to: '/profile', label: 'Profile', Icon: User },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 items-center justify-around"
      style={{
        background: 'var(--color-obsidian)',
        paddingTop: 'var(--space-3)',
        paddingBottom: 'calc(var(--space-3) + env(safe-area-inset-bottom))',
        borderTopLeftRadius: 'var(--opus-radius-xl)',
        borderTopRightRadius: 'var(--opus-radius-xl)',
      }}
    >
      {tabs.map(({ to, label, Icon, center }) =>
        center ? (
          <NavLink key={to} to={to} aria-label={label} className="-mt-6">
            {() => (
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
              >
                <Icon size={26} strokeWidth={2.5} />
              </span>
            )}
          </NavLink>
        ) : (
          <NavLink key={to} to={to} aria-label={label} className="flex flex-col items-center gap-1">
            {({ isActive }) => (
              <>
                <Icon
                  size={22}
                  style={{
                    color: isActive ? 'var(--color-gold)' : 'var(--color-ash)',
                    transform: isActive ? 'translateY(-2px) scale(1.12)' : 'none',
                    transition: 'transform var(--dur-standard) var(--opus-ease-out), color var(--dur-standard)',
                  }}
                />
                <span
                  className="font-sans text-[10px]"
                  style={{ color: isActive ? 'var(--color-text-inverse)' : 'var(--color-ash)' }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        )
      )}
    </nav>
  );
}
