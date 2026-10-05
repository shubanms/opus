import { useEffect, useRef } from 'react';
import { createSheetHistory } from '../utils/sheetHistory.js';

// One manager for the whole app: sheets nest, and only something that sees
// every open sheet can tell which one a Back belongs to. See utils/sheetHistory.
let sheets = null;
function manager() {
  if (!sheets && typeof window !== 'undefined' && window.history?.pushState) {
    sheets = createSheetHistory(window);
  }
  return sheets;
}

/**
 * Close an overlay with the system Back gesture instead of leaving the page.
 *
 * `onClose` is read when Back happens, not when the overlay opened, so callers
 * can pass an inline function. However the overlay closes, `isOpen` going
 * false is what tidies the history up — so callers need nothing else.
 */
export function useBackToClose(isOpen, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;
    const m = manager();
    if (!m) return undefined;
    const handle = m.open(() => closeRef.current?.());
    return () => handle.release();
  }, [isOpen]);
}
