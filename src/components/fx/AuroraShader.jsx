import { useEffect, useState } from 'react';
import { MeshGradient } from '@paper-design/shaders-react';

/**
 * The live aurora. Lazily imported by AuroraBackdrop, so the WebGL library is
 * its own chunk and never sits in the critical path.
 *
 * Colour stops come from the Aurora palette; `speed` and `distortion` come from
 * the player's progression via utils/ambient.sceneParams, so the backdrop is
 * livelier the deeper into the game you are — the same signal that drove the
 * old CSS aura.
 */
export default function AuroraShader({ speed = 0.15, distortion = 0.8, dark }) {
  // Pause whenever the tab isn't visible. A full-screen fragment shader running
  // behind a backgrounded PWA is pure battery cost for something nobody sees.
  const [visible, setVisible] = useState(
    typeof document === 'undefined' || document.visibilityState === 'visible'
  );

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  const colors = dark
    ? ['#0b1020', '#2a1f6b', '#0f5f5c', '#3a1740']
    : ['#f4f6fd', '#c9c1ff', '#a8ecdf', '#ffd2dc'];

  return (
    <MeshGradient
      style={{ width: '100%', height: '100%' }}
      colors={colors}
      distortion={distortion}
      swirl={0.55}
      speed={visible ? speed : 0}
    />
  );
}
