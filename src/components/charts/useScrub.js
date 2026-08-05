import { useCallback, useRef, useState } from 'react';
import { nearestIndex } from '../../utils/chartMath.js';
import { useHaptics } from '../../hooks/useHaptics.js';

/**
 * Drag-to-inspect for a chart, in place of a hover tooltip.
 *
 * Hover tooltips are a desktop idea: on a phone the "hover" is a tap that
 * fires once, so reading a series means poking at it point by point. Here you
 * put a thumb down and drag along the chart, and each point you cross ticks
 * once under your finger.
 *
 * `xs` are the pixel centres of each datum within the plot area.
 */
export function useScrub(xs) {
  const [index, setIndex] = useState(null);
  const last = useRef(null);
  const haptic = useHaptics();

  const track = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const i = nearestIndex(xs, e.clientX - rect.left);
      if (i === null || i === last.current) return;
      last.current = i;
      setIndex(i);
      // Only under a finger. A mouse sweeping the chart buzzing the whole
      // device would be absurd, and desktops rarely have a motor anyway.
      if (e.pointerType !== 'mouse') haptic('tap');
    },
    [xs, haptic]
  );

  const clear = useCallback(() => {
    last.current = null;
    setIndex(null);
  }, []);

  const handlers = {
    onPointerDown: (e) => {
      // Capture so a drag that wanders off the chart — or off the screen edge
      // — keeps scrubbing instead of stopping dead at the boundary.
      e.currentTarget.setPointerCapture?.(e.pointerId);
      track(e);
    },
    onPointerMove: (e) => {
      const held = e.buttons > 0 || e.currentTarget.hasPointerCapture?.(e.pointerId);
      if (e.pointerType === 'mouse' || held) track(e);
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    // Touch releases via pointerup; clearing on leave as well would drop the
    // readout the moment a drag strayed above the plot area.
    onPointerLeave: (e) => {
      if (e.pointerType === 'mouse') clear();
    },
  };

  return { index, handlers };
}
