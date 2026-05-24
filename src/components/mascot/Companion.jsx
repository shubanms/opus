import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import RobotModel from './RobotModel.jsx';
import { useRPG } from '../../hooks/useRPG.js';
import useSettingsStore from '../../store/settingsStore.js';
import { useHaptics } from '../../hooks/useHaptics.js';
import { playChime } from '../../utils/sound.js';
import { CLIP, MASCOT_NAME, clipForKind, pickLine } from '../../utils/mascot.js';

const MET_KEY = 'opus_mascot_met';
const wasMet = () => { try { return localStorage.getItem(MET_KEY) === '1'; } catch { return true; } };
const markMet = () => { try { localStorage.setItem(MET_KEY, '1'); } catch { /* ignore */ } };

export default function Companion() {
  const { profile } = useRPG();
  const effects = useSettingsStore((s) => s.effects);
  const haptic = useHaptics();

  const reducedMotion = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
  const animate = effects && !reducedMotion;

  const [clip, setClip] = useState(CLIP.idle);
  const [line, setLine] = useState('');
  const hideRef = useRef();
  const resetRef = useRef();

  const say = useCallback((kind) => {
    const streak = profile?.streak ?? 0;
    const hour = new Date().getHours();
    setLine(pickLine({ kind, streak, hour }));
    if (animate) setClip(clipForKind(kind));
    clearTimeout(hideRef.current);
    clearTimeout(resetRef.current);
    hideRef.current = setTimeout(() => setLine(''), 5200);
    if (animate) resetRef.current = setTimeout(() => setClip(CLIP.idle), 4200);
  }, [profile?.streak, animate]);

  // Greeting on first mount (intro the first time ever).
  useEffect(() => {
    const t = setTimeout(() => {
      say(wasMet() ? 'greet' : 'firstMeet');
      markMet();
    }, 650);
    return () => { clearTimeout(t); clearTimeout(hideRef.current); clearTimeout(resetRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTap = useCallback(() => {
    haptic('tap');
    playChime('success');
    say('hype');
  }, [haptic, say]);

  return (
    <div className="relative mb-5 flex flex-col items-center">
      {/* Speech bubble */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2"
        style={{
          opacity: line ? 1 : 0,
          transform: `translate(-50%, ${line ? '0' : '6px'})`,
          transition: 'opacity var(--dur-standard) var(--ease-out), transform var(--dur-standard) var(--ease-out)',
        }}
      >
        <div
          className="max-w-[260px] rounded-2xl px-3.5 py-2 text-center font-sans text-xs"
          style={{ background: 'var(--color-obsidian)', color: 'var(--color-text-inverse)', border: '1px solid var(--color-gold)', boxShadow: '0 6px 20px rgba(0,0,0,0.25)' }}
        >
          <span className="font-semibold" style={{ color: 'var(--color-gold)' }}>{MASCOT_NAME}:</span> {line}
        </div>
      </div>

      {/* 3D companion */}
      <button
        onClick={onTap}
        aria-label={`Talk to ${MASCOT_NAME}`}
        className="mt-10 h-[164px] w-[164px] cursor-pointer"
        style={{ background: 'transparent', touchAction: 'manipulation' }}
      >
        <Canvas
          camera={{ fov: 32, position: [0, 0, 5.8] }}
          dpr={[1, 1.5]}
          frameloop={animate ? 'always' : 'demand'}
          gl={{ alpha: true, antialias: true }}
          style={{ background: 'transparent' }}
        >
          <hemisphereLight args={[0xffffff, 0x4a4438, 1.1]} />
          <directionalLight position={[3, 6, 5]} intensity={2.2} color="#fff2d6" />
          <directionalLight position={[-4, 3, -4]} intensity={1.4} color="#c9a84c" />
          <Suspense fallback={null}>
            <RobotModel clip={clip} still={!animate} />
          </Suspense>
        </Canvas>
      </button>
    </div>
  );
}
