// The motion spec. One place, so components stop inventing their own curves.
//
// Mirrors the duration/easing tokens in styles/tokens.css — CSS transitions and
// Motion animations must agree, or a card that fades via CSS and moves via
// Motion arrives in two beats.

/** Springs, by how much overshoot the gesture should carry. */
export const SPRING = {
  /** Sheets and drawers — settles firmly, no wobble. */
  sheet: { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 },
  /** Layout shifts (reordering a list) — quick and neutral. */
  layout: { type: 'spring', stiffness: 520, damping: 42, mass: 0.8 },
  /** Celebratory pops — a little overshoot is the point. */
  pop: { type: 'spring', stiffness: 600, damping: 20, mass: 0.7 },
};

/** Tweens, for opacity and other visual (non-physical) properties. */
export const TWEEN = {
  micro: { duration: 0.14, ease: [0.22, 1, 0.36, 1] },
  standard: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
  enter: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
};

/** Page enter. Deliberately no exit — see MotionProvider. */
export const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: TWEEN.enter },
};

/** Staggered list entry. Apply `listVariants` to the container, `itemVariants`
 *  to each child. Capped so a 70-item exercise list doesn't ripple for 4s. */
export const listVariants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
};

export const itemVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: TWEEN.standard },
};

/** Bottom sheet + its backdrop. */
export const sheetVariants = {
  initial: { y: '100%' },
  animate: { y: 0, transition: SPRING.sheet },
  exit: { y: '100%', transition: TWEEN.standard },
};

export const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: TWEEN.standard },
  exit: { opacity: 0, transition: TWEEN.micro },
};
