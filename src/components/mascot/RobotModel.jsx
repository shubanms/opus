import { useEffect, useMemo } from 'react';
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { CLIP } from '../../utils/mascot.js';

const MODEL_URL = `${import.meta.env.BASE_URL}models/robot.glb`;

// The gold RobotExpressive (CC0). Normalizes/centers the model, plays the
// requested clip, and falls back to a looping Idle for one-shot reactions.
// `still` renders a single settled idle frame (reduced-motion / effects off).
export default function RobotModel({ clip = CLIP.idle, still = false }) {
  const gltf = useLoader(GLTFLoader, MODEL_URL);
  const { invalidate } = useThree();
  const mixer = useMemo(() => new THREE.AnimationMixer(gltf.scene), [gltf.scene]);
  const actions = useMemo(() => {
    const map = {};
    for (const c of gltf.animations) map[c.name] = mixer.clipAction(c);
    return map;
  }, [gltf.animations, mixer]);

  // Center on origin and scale to a consistent height. Measure at scale 1
  // (matrices updated) then derive the scaled offset — avoids stale-matrix clip.
  useMemo(() => {
    gltf.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = 2 / Math.max(size.x, size.y, size.z);
    gltf.scene.scale.setScalar(s);
    gltf.scene.position.set(-center.x * s, -center.y * s, -center.z * s);
    gltf.scene.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  }, [gltf.scene]);

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
    target.setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat, oneShot ? 1 : Infinity);
    target.clampWhenFinished = false;
    target.fadeIn(0.25).play();
    let to;
    if (oneShot && idle) {
      to = setTimeout(() => { idle.reset().fadeIn(0.3).play(); }, target.getClip().duration * 1000);
    }
    return () => clearTimeout(to);
  }, [clip, still, actions, mixer, invalidate]);

  useFrame((_, delta) => { if (!still) mixer.update(delta); });

  return (
    <group rotation={[0, 0.5, 0]} position={[0, -0.12, 0]}>
      <primitive object={gltf.scene} />
    </group>
  );
}
