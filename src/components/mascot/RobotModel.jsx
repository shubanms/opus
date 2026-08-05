import { useEffect, useMemo } from 'react';
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';
import { CLIP } from '../../utils/mascot.js';

const MODEL_URL = `${import.meta.env.BASE_URL}models/robot.glb`;

// The gold RobotExpressive (CC0). useLoader caches the GLTF, so we clone the
// scene per mount (SkeletonUtils keeps the skeleton intact) — otherwise
// re-centering would mutate the shared cached scene and break it on remount
// (the "cut off on navigate-back" bug). `gesture` re-triggers the active clip;
// one-shots fade back to a looping Idle. `still` renders one settled frame.
export default function RobotModel({ clip = CLIP.idle, gesture = 0, still = false }) {
  const gltf = useLoader(GLTFLoader, MODEL_URL);
  const { invalidate } = useThree();

  const scene = useMemo(() => cloneSkinned(gltf.scene), [gltf.scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(scene), [scene]);
  const actions = useMemo(() => {
    const map = {};
    for (const c of gltf.animations) map[c.name] = mixer.clipAction(c);
    return map;
  }, [gltf.animations, mixer]);

  // Center on origin and scale to a consistent height (idempotent on a fresh clone).
  useMemo(() => {
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = 2 / Math.max(size.x, size.y, size.z);
    scene.scale.setScalar(s);
    scene.position.set(-center.x * s, -center.y * s, -center.z * s);
    // Retint to the accent. The GLB ships a gold body baked into its materials,
    // so relighting alone leaves him amber against a violet UI. Materials are
    // cloned first — they're shared with the cached GLTF, and mutating them in
    // place would tint every future mount permanently.
    scene.traverse((o) => {
      if (!o.isMesh) return;
      o.frustumCulled = false;
      // Whether the mesh was multi-material must be captured BEFORE mapping:
      // checking afterwards always sees the array we just built, so a
      // single-material mesh kept a one-element array. Three.js needs matching
      // geometry groups to draw an array material and finds none, so it
      // silently rendered nothing — Magnus disappeared entirely.
      const wasArray = Array.isArray(o.material);
      const tinted = (wasArray ? o.material : [o.material]).map((m) => {
        if (!m?.color) return m;
        const next = m.clone();
        // Preserve each material's own lightness so the model keeps its shading
        // and metal/plastic separation; only the hue is moved onto the accent.
        const hsl = { h: 0, s: 0, l: 0 };
        next.color.getHSL(hsl);
        next.color.setHSL(0.71, hsl.s > 0.08 ? 0.55 : hsl.s, hsl.l);
        return next;
      });
      o.material = wasArray ? tinted : tinted[0];
    });
  }, [scene]);

  useEffect(() => {
    const idle = actions[CLIP.idle];
    if (still) {
      if (idle) { idle.reset().play(); mixer.update(1.6); idle.paused = true; invalidate(); }
      return;
    }
    const target = actions[clip] || idle;
    if (!target) return;
    const oneShot = clip !== CLIP.idle;
    for (const a of Object.values(actions)) if (a !== target) a.fadeOut(0.25);
    target.reset();
    target.setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat, oneShot ? 1 : Number.POSITIVE_INFINITY);
    target.fadeIn(0.25).play();
    let to;
    if (oneShot && idle) {
      to = setTimeout(() => { idle.reset().fadeIn(0.35).play(); }, target.getClip().duration * 1000);
    }
    return () => clearTimeout(to);
  }, [clip, gesture, still, actions, mixer, invalidate]);

  useFrame((_, delta) => { if (!still) mixer.update(delta); });

  return (
    <group rotation={[0, 0.5, 0]} position={[0, -0.12, 0]} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}
