import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/logo/LoadingScreen.jsx';
import useSettingsStore from '../store/settingsStore.js';
import { playIntro } from '../utils/sound.js';

/**
 * How long the cold-start sequence holds, as [fade starts, route changes] ms.
 *
 * It used to be 4.4 s on every launch, unconditionally — including with
 * Effects off and with the OS asking for reduced motion, where nothing on the
 * splash moves and it is simply a wait. Now:
 *   - first run: the whole sequence (mark, wordmark, tagline) — it is the
 *     app's first impression and worth the time;
 *   - later launches: it ends once the tagline has landed;
 *   - nothing animating: a beat, then in.
 * And any tap skips it.
 */
function splashTiming({ effects, reduced, firstRun }) {
  if (!effects || reduced) return [450, 1000];
  if (firstRun) return [3800, 4400];
  return [2600, 3200];
}

export default function LoadingPage() {
  const navigate = useNavigate();
  const [fadingOut, setFadingOut] = useState(false);
  const left = useRef(false);
  const timers = useRef([]);

  function leave(fadeIn, goIn) {
    if (left.current) return;
    timers.current.forEach(clearTimeout);
    timers.current = [
      setTimeout(() => setFadingOut(true), fadeIn),
      setTimeout(() => {
        left.current = true;
        navigate('/home', { replace: true });
      }, goIn),
    ];
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per cold start; `leave` only reads refs and the stable navigate.
  useEffect(() => {
    const { sound, themeOnOpen, effects, onboarded } = useSettingsStore.getState();
    if (sound && themeOnOpen) playIntro();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const [fadeAt, goAt] = splashTiming({ effects, reduced, firstRun: !onboarded });
    leave(fadeAt, goAt);
    return () => timers.current.forEach(clearTimeout);
  }, []);

  return (
    <>
      <LoadingScreen fadingOut={fadingOut} />
      {/* The whole screen is the skip button: a tap anywhere goes straight in. */}
      <button
        type="button"
        aria-label="Skip intro"
        onClick={() => leave(0, 280)}
        className="fixed inset-0 z-[51] h-full w-full cursor-default"
        style={{ background: 'transparent' }}
      />
    </>
  );
}
