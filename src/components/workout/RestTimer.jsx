import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Minus, Plus, Check, Timer } from 'lucide-react';
import useWorkoutStore from '../../store/workoutStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import useUIStore from '../../store/uiStore.js';
import { useRestClock } from '../../hooks/useRestClock.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { AnimatePresence, m, SPRING, TWEEN, useReducedMotion } from '../../motion/index.jsx';
import { REST_PRESETS, formatRest, presetLabel } from '../../utils/restClock.js';

/**
 * The rest between sets, pinned just above the bottom nav.
 *
 * It used to be a card inserted at the top of the workout page — off screen
 * by the time you were logging your fourth exercise — counting interval ticks
 * in page state, so a locked phone stretched it and leaving the tab lost it.
 * It now reads the session's stored deadline (see utils/restClock.js), stays
 * where your thumb is, and the nav's session pill carries the countdown on
 * every other tab.
 *
 * Calm on purpose: a fill that drains, a gentle pulse in the last ten seconds,
 * one chime at zero (fired once, app-wide, by `useRestAlarm`), and a brief
 * "go" before it slides away.
 */
export default function RestTimer({ nextName = null }) {
  const { rest, remaining, progress, done } = useRestClock(250);
  const adjust = useWorkoutStore((s) => s.adjustRest);
  const startRest = useWorkoutStore((s) => s.startRest);
  const clearRest = useWorkoutStore((s) => s.clearRest);
  const setDefault = useSettingsStore((s) => s.setRestDuration);
  const effects = useSettingsStore((s) => s.effects);
  const reduced = useReducedMotion();
  const haptic = useHaptics();
  const [presetsOpen, setPresetsOpen] = useState(false);
  // Toasts land in the same strip of screen. While one is up (an Undo, say)
  // the bar steps aside rather than sitting half under it — the countdown is
  // still in the nav pill — and slides back when the toast goes.
  const toastUp = useUIStore((s) => s.toasts.length > 0);

  const urgent = !done && remaining <= 10;
  const pulse = urgent && effects && !reduced;
  const tone = done ? 'var(--color-sage)' : urgent ? 'var(--color-ember)' : 'var(--color-gold)';

  function choosePreset(secs) {
    // A preset restarts the rest at that length and becomes your default —
    // the old card did the same, it was just three scrolls away.
    startRest(secs);
    setDefault(secs);
    setPresetsOpen(false);
    haptic('tap');
  }

  return createPortal(
    <AnimatePresence>
      {rest && !toastUp && (
        <m.div
          key="rest"
          role="timer"
          aria-live="off"
          aria-label={done ? 'Rest over' : `Rest, ${formatRest(remaining)} left`}
          className="fixed inset-x-0 z-40 mx-auto w-full max-w-md px-4"
          style={{ bottom: 'calc(96px + env(safe-area-inset-bottom))' }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24, transition: TWEEN.standard }}
          transition={SPRING.sheet}
        >
          <AnimatePresence initial={false}>
            {presetsOpen && !done && (
              <m.div
                key="presets"
                className="glass glass-strong mb-2 flex gap-2 rounded-2xl p-2"
                style={{ boxShadow: 'var(--elev-2)' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={TWEEN.standard}
              >
                {REST_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => choosePreset(p)}
                    aria-label={`Rest ${presetLabel(p)} and make it the default`}
                    className="h-10 flex-1 rounded-xl font-mono text-sm font-semibold"
                    style={{
                      background: rest.duration === p ? 'var(--color-gold)' : 'var(--color-ivory)',
                      color: rest.duration === p ? 'var(--color-obsidian)' : 'var(--color-text-secondary)',
                    }}
                  >
                    {presetLabel(p)}
                  </button>
                ))}
              </m.div>
            )}
          </AnimatePresence>

          <div
            className="glass glass-strong relative flex h-14 items-center gap-1 overflow-hidden rounded-2xl pl-1 pr-1.5"
            style={{
              boxShadow: 'var(--elev-3)',
              border: `1px solid ${done ? 'var(--color-sage)' : 'var(--glass-line)'}`,
            }}
          >
            {/* The fill drains toward zero. A transform, not a width, so it
                stays on the compositor. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-full origin-left"
              style={{
                transform: `scaleX(${done ? 1 : progress})`,
                background: done ? 'var(--color-sage)' : 'var(--accent-wash)',
                opacity: done ? 0.22 : 1,
                transition: effects ? 'transform 260ms linear, background-color 300ms, opacity 300ms' : 'none',
              }}
            />

            <button
              type="button"
              onClick={() => setPresetsOpen((v) => !v)}
              aria-expanded={presetsOpen}
              aria-label={presetsOpen ? 'Hide rest presets' : 'Rest presets'}
              className="relative flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-xl pl-2.5 text-left"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: done ? 'var(--color-sage)' : 'var(--color-ivory)',
                  animation: pulse ? 'timerPulse 1s var(--opus-ease-out) infinite' : 'none',
                }}
              >
                {done ? (
                  <Check size={16} strokeWidth={3} style={{ color: 'var(--color-obsidian)' }} />
                ) : (
                  <Timer size={15} style={{ color: tone }} />
                )}
              </span>
              <span className="min-w-0">
                <span
                  className="block font-mono text-xl font-semibold leading-none tabular-nums"
                  style={{ color: done ? 'var(--color-sage)' : urgent ? 'var(--color-ember)' : 'var(--color-text-primary)' }}
                >
                  {done ? 'Go' : formatRest(remaining)}
                </span>
                <span className="mt-0.5 block truncate font-sans text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {done ? 'Rest over — next set' : nextName ? `Rest · next: ${nextName}` : 'Rest'}
                </span>
              </span>
            </button>

            {!done && (
              <>
                <button
                  type="button"
                  onClick={() => { adjust(-15); haptic('tap'); }}
                  className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-[11px] font-semibold"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-label="Minus 15 seconds"
                >
                  <Minus size={12} />15
                </button>
                <button
                  type="button"
                  onClick={() => { adjust(15); haptic('tap'); }}
                  className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-[11px] font-semibold"
                  style={{ color: 'var(--color-text-secondary)' }}
                  aria-label="Plus 15 seconds"
                >
                  <Plus size={12} />15
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => clearRest()}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'var(--color-ivory)' }}
              aria-label={done ? 'Dismiss' : 'Skip rest'}
            >
              <X size={16} style={{ color: 'var(--color-ash)' }} />
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
