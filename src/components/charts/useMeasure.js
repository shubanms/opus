import { useEffect, useState } from 'react';

/**
 * Width of an element, tracked live.
 *
 * Returns a callback ref rather than a ref object on purpose: charts live
 * inside collapsible sections and tab panels, so the node arrives after the
 * first render, and a callback ref re-runs the effect when it does. A
 * `useRef` here silently measures nothing in exactly those cases.
 */
export function useMeasure() {
  const [node, setNode] = useState(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!node) return undefined;
    setWidth(node.clientWidth);

    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      // Ignore 0 — a hidden tab panel reports it, and rebuilding every scale
      // against a zero range on the way out is pure waste.
      if (w) setWidth(w);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [node]);

  return [setNode, width];
}
