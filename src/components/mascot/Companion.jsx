import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import RobotModel from './RobotModel.jsx';
import { useRPG } from '../../hooks/useRPG.js';
import useSettingsStore from '../../store/settingsStore.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';
import { useStreak } from '../../hooks/useStreak.js';
import { CLIP, MASCOT_NAME, ambientClip, clipForKind, pickLine } from '../../utils/mascot.js';

const MET_KEY = 'opus_mascot_met';
const wasMet = () => { try { return localStorage.getItem(MET_KEY) === '1'; } catch { return true; } };
const markMet = () => { try { localStorage.setItem(MET_KEY, '1'); } catch { /* ignore */ } };

export default function Companion({ autoGreet = true, size = 164, bubbleWidth = 260 }) {
  const { profile } = useRPG();
  const effects = useSettingsStore((s) => s.effects);
  const haptic = useHaptics();

  const reducedMotion = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
  const animate = effects && !reducedMotion;

  // `gesture` increments so RobotModel replays a clip even if the name repeats.
  const [{ clip, gesture }, setGesture] = useState({ clip: CLIP.idle, gesture: 0 });
  const [line, setLine] = useState('');
  const hideRef = useRef();

  const play = useCallback((nextClip) => {
    if (animate) setGesture((g) => ({ clip: nextClip, gesture: g.gesture + 1 }));
  }, [animate]);

  // Derived out here so the callback depends on a stable number rather than
  // the whole profile object, which changes identity on every live-query tick.
  const streak = useStreak().count;

  const say = useCallback((kind) => {
    const hour = new Date().getHours();
    setLine(pickLine({ kind, streak, hour }));
    play(clipForKind(kind));
    clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => setLine(''), 5200);
  }, [streak, play]);

  // Greeting on mount (Home only). Intro the very first time ever.
  useEffect(() => {
    if (!autoGreet) return;
    const t = setTimeout(() => { say(wasMet() ? 'greet' : 'firstMeet'); markMet(); }, 650);
    return () => { clearTimeout(t); clearTimeout(hideRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Idle-break: every 9–15s Magnus does a little gesture on his own.
  useEffect(() => {
    if (!animate) return;
    let timer;
    const loop = () => {
      timer = setTimeout(() => { play(ambientClip()); loop(); }, 9000 + Math.random() * 6000);
    };
    loop();
    return () => clearTimeout(timer);
  }, [animate, play]);

  const onTap = useCallback(() => {
    haptic('tap');
    playChime('success');
    say('hype');
  }, [haptic, say]);

  return (
    // Magnus and his line sit side by side, like a chat. The bubble used to be
    // absolutely positioned above him, which reserved a tall empty band on Home
    // whether or not he was speaking — and inside a narrow tile it wrapped into
    // a column that covered him completely.
    <div className="flex items-center gap-2">
      {/* 3D companion */}
      <button
        onClick={onTap}
        aria-label={`Talk to ${MASCOT_NAME}`}
        className="shrink-0 cursor-pointer"
        style={{ height: size, width: size, background: 'transparent', touchAction: 'manipulation' }}
      >
        <Canvas
          camera={{ fov: 32, position: [0, 0, 5.8] }}
          dpr={[1, 1.5]}
          frameloop={animate ? 'always' : 'demand'}
          gl={{ alpha: true, antialias: true }}
          style={{ background: 'transparent' }}
        >
          <hemisphereLight args={[0xffffff, 0x2a2440, 1.15]} />
          <directionalLight position={[3, 6, 5]} intensity={2.2} color="#e6ecff" />
          <directionalLight position={[-4, 3, -4]} intensity={1.4} color="#8B7DFF" />
          <Suspense fallback={null}>
            <RobotModel clip={clip} gesture={gesture} still={!animate} />
          </Suspense>
        </Canvas>
      </button>

      {/* His line. Always rendered so the row keeps a stable height and the
          layout doesn't jump each time he speaks. */}
      <div
        className="pointer-events-none min-w-0 flex-1"
        style={{
          opacity: line ? 1 : 0,
          transform: line ? 'none' : 'translateX(-4px)',
          transition:
            'opacity var(--dur-standard) var(--opus-ease-out), transform var(--dur-standard) var(--opus-ease-out)',
        }}
      >
        <div
          style={{
            maxWidth: bubbleWidth,
            background: 'var(--color-obsidian)',
            color: 'var(--color-text-inverse)',
            border: '1px solid var(--color-gold)',
            boxShadow: 'var(--elev-2)',
          }}
          className="rounded-2xl px-3 py-2 font-sans text-xs leading-snug"
        >
          <span className="font-semibold" style={{ color: 'var(--color-gold)' }}>{MASCOT_NAME}:</span> {line}
        </div>
      </div>
    </div>
  );
}
