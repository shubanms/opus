// What a tap on the anatomy model filters by. Pure + unit-tested.
//
// react-body-highlighter draws more regions than the app has muscle groups:
// head, neck, knees, the adductors/abductors and the soleus. A tap on any of
// them passed the raw name straight through as a filter, and the Exercises
// page answered "0 exercises · knees". Each region now maps to the group that
// actually trains it, or to nothing (a tap on the head selects nothing).

const REGION_TO_GROUP = {
  'left-soleus': 'calves',
  'right-soleus': 'calves',
  adductor: 'gluteal',
  abductors: 'gluteal',
};

const NOT_A_MUSCLE = new Set(['head', 'neck', 'knees']);

/** The 15 groups the catalogue uses — the only things a filter may be. */
export const MUSCLE_GROUPS = [
  'chest', 'triceps', 'biceps', 'front-deltoids', 'back-deltoids',
  'upper-back', 'lower-back', 'trapezius', 'abs', 'obliques',
  'quadriceps', 'hamstring', 'gluteal', 'calves', 'forearm',
];

/** The muscle group a body-map region selects, or null for "ignore this tap". */
export function groupForRegion(region) {
  if (!region || NOT_A_MUSCLE.has(region)) return null;
  const group = REGION_TO_GROUP[region] ?? region;
  return MUSCLE_GROUPS.includes(group) ? group : null;
}

/**
 * Every region to light up for a selected group — the group plus the regions
 * that map onto it. The front view has no gluteal region: tapping the inner
 * thigh selected Glutes and nothing on the body lit up.
 */
export function regionsForGroup(group) {
  if (!group) return [];
  return [group, ...Object.keys(REGION_TO_GROUP).filter((r) => REGION_TO_GROUP[r] === group)];
}
