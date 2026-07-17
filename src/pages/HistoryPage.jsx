import { useState } from 'react';
import { List, CalendarDays } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper.jsx';
import WorkoutCard from '../components/workout/WorkoutCard.jsx';
import MonthCalendar from '../components/progress/MonthCalendar.jsx';
import { useWorkouts } from '../hooks/useWorkout.js';

export default function HistoryPage() {
  const workouts = useWorkouts();
  const [view, setView] = useState('list');
  const [day, setDay] = useState(null);

  const days = new Set(workouts.map((w) => w.date));
  const dayWorkouts = day ? workouts.filter((w) => w.date === day) : [];

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

  const Tab = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setView(id)}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 font-sans text-sm font-medium transition-colors"
      style={{
        background: view === id ? 'var(--color-gold)' : 'transparent',
        color: view === id ? 'var(--color-obsidian)' : 'var(--color-text-secondary)',
      }}
    >
      <Icon size={15} />
      {label}
    </button>
  );

  return (
    <PageWrapper title="History" subtitle="Past workouts">
      <div className="mb-4 flex gap-1 rounded-xl p-1" style={{ background: 'var(--color-ivory)' }}>
        <Tab id="list" icon={List} label="List" />
        <Tab id="calendar" icon={CalendarDays} label="Calendar" />
      </div>

      {view === 'list' ? (
        <div className="pb-6">
          {workouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} />
          ))}
        </div>
      ) : (
        <div className="pb-6">
          <MonthCalendar days={days} selected={day} onSelect={setDay} />
          {day && (
            <div className="mt-4">
              {dayWorkouts.length > 0 ? (
                dayWorkouts.map((w) => <WorkoutCard key={w.id} workout={w} />)
              ) : (
                <p className="py-6 text-center font-sans text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  No workout logged on this day
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
