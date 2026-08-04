import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, TrendingUp, Award, BookOpen, CalendarCheck, Activity, Share2, Palette } from 'lucide-react';
import useSettingsStore from '../../store/settingsStore.js';

const STEPS = [
  { icon: Dumbbell, title: 'Log your workouts', body: 'Tap the center ➕ to start. Add exercises — reorder them or chain supersets — and log sets with the plate calculator, RPE and rest timer. Get interrupted? Your session is saved.' },
  { icon: TrendingUp, title: 'Level up', body: 'Every set earns XP. Climb from First Rep to Magnum Opus and into prestige tiers, and clear weekly quests for bonus XP.' },
  { icon: Award, title: 'Unlock achievements', body: 'Hit milestones to earn trophies. Some are hidden — find them on your Profile.' },
  { icon: BookOpen, title: 'Your exercise library', body: 'Browse, favorite ★, colour-code, and add coaching notes that show every time you train a movement.' },
  { icon: CalendarCheck, title: 'Routines & planning', body: 'Build reusable routines with targets, assign them to weekdays, and get a "today" suggestion on Home.' },
  { icon: Activity, title: 'Track recovery & progress', body: 'See which muscles are fresh on the body map, track steps & water, and chart volume, PRs, estimated 1RM and body metrics.' },
  { icon: Share2, title: 'Show it off', body: 'Share workout, profile, weekly-recap and Wrapped cards — your monthly & yearly stats — straight from the app.' },
  { icon: Palette, title: 'Make it yours', body: 'Sound, effects, dark mode and kg/lbs all live in Settings — and most start off. Open Settings to switch on what you like (you can replay this tour there anytime).' },
];

export default function Tour() {
  const setTourSeen = useSettingsStore((s) => s.setTourSeen);
  const navigate = useNavigate();
  const [i, setI] = useState(0);

  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const Icon = step.icon;

  function finish(goSettings = false) {
    setTourSeen(true);
    if (goSettings) navigate('/settings');
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[75] flex flex-col items-center justify-center px-8"
      style={{ background: 'var(--color-obsidian)' }}
    >
      <button
        onClick={() => finish(false)}
        className="absolute right-5 top-6 font-sans text-sm"
        style={{ color: 'var(--color-ash)' }}
      >
        Skip
      </button>

      <div
        key={i}
        className="anim-fade-slide-up flex flex-col items-center text-center"
        style={{ maxWidth: 320 }}
      >
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: 'var(--color-gold)', animation: 'goldPulse 2.4s var(--opus-ease-out) infinite' }}
        >
          <Icon size={34} style={{ color: 'var(--color-obsidian)' }} />
        </div>
        <h2 className="mt-6 font-display text-3xl font-bold" style={{ color: 'var(--color-text-inverse)' }}>
          {step.title}
        </h2>
        <p className="mt-2 font-sans text-sm leading-relaxed" style={{ color: 'var(--color-ash)' }}>
          {step.body}
        </p>
      </div>

      {/* Progress dots */}
      <div className="mt-8 flex gap-2">
        {STEPS.map((_, idx) => (
          <span
            key={idx}
            className="h-2 rounded-full"
            style={{
              width: idx === i ? 20 : 8,
              background: idx === i ? 'var(--color-gold)' : 'var(--color-stone)',
              transition: 'width var(--dur-standard) var(--opus-ease-out)',
            }}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="mt-8 flex w-full max-w-xs gap-3">
        {last ? (
          <button
            onClick={() => finish(false)}
            className="flex-1 rounded-xl py-3 font-sans text-sm font-medium"
            style={{ background: 'var(--color-stone)', color: 'var(--color-text-inverse)' }}
          >
            Not now
          </button>
        ) : (
          i > 0 && (
            <button
              onClick={() => setI(i - 1)}
              className="flex-1 rounded-xl py-3 font-sans text-sm font-medium"
              style={{ background: 'var(--color-stone)', color: 'var(--color-text-inverse)' }}
            >
              Back
            </button>
          )
        )}
        <button
          onClick={() => (last ? finish(true) : setI(i + 1))}
          className="flex-1 rounded-xl py-3 font-sans text-sm font-semibold"
          style={{ background: 'var(--color-gold)', color: 'var(--color-obsidian)' }}
        >
          {last ? 'Open Settings' : 'Next'}
        </button>
      </div>
    </div>,
    document.body
  );
}
