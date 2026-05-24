// Magnus — the OPUS training companion. Pure logic (name, animation mapping,
// contextual dialogue) so it's node-testable; the 3D/render/sound lives in the
// components. Clip names match the RobotExpressive.glb animation set.

export const MASCOT_NAME = 'Magnus';

// Animation clips available on the model (RobotExpressive).
export const CLIP = {
  idle: 'Idle',
  wave: 'Wave',
  cheer: 'ThumbsUp',
  dance: 'Dance',
  flex: 'Punch',
  jump: 'Jump',
  yes: 'Yes',
  no: 'No',
};

const HYPE_CLIPS = [CLIP.cheer, CLIP.dance, CLIP.flex, CLIP.jump, CLIP.yes];

const choose = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)] ?? arr[0];

const LINES = {
  firstMeet: [
    `Hi — I'm ${MASCOT_NAME}, your training companion. Tap me anytime.`,
    `${MASCOT_NAME} online. Let's build your masterpiece.`,
  ],
  hype: [
    "Now THAT'S a rep.",
    'One more set. I can wait.',
    'Magnum opus in progress.',
    'Steel sharpens steel.',
    "I ran the numbers — you've got this.",
    'Champions are built on the boring days.',
    "Less talking, more lifting. (I can't lift. Tragic.)",
  ],
  rest: [
    'Rest is part of the work. Recover like you mean it.',
    'Muscles grow on rest days. Science. I checked.',
  ],
};

// Returns a single dialogue string for the given context.
// kind: 'greet' | 'hype' | 'firstMeet' | 'rest'
export function pickLine({ kind = 'greet', streak = 0, hour = 12, rng = Math.random } = {}) {
  if (kind === 'firstMeet') return choose(LINES.firstMeet, rng);
  if (kind === 'hype') return choose(LINES.hype, rng);
  if (kind === 'rest') return choose(LINES.rest, rng);

  // greet — context-aware candidates (streak first, then time of day).
  const candidates = [];
  if (streak >= 2) candidates.push(`Day ${streak} of the streak — let's keep the forge lit.`);
  if (hour < 12) candidates.push("Morning, champion. The iron's cold — let's fix that.");
  else if (hour >= 18) candidates.push('Late session? Respect. Let it count.');
  candidates.push('Back again. Good — greatness is a habit.');
  return choose(candidates, rng);
}

// Which animation clip fits a dialogue/event kind.
export function clipForKind(kind, rng = Math.random) {
  if (kind === 'greet' || kind === 'firstMeet') return CLIP.wave;
  if (kind === 'rest') return CLIP.yes;
  if (kind === 'hype') return choose(HYPE_CLIPS, rng);
  return CLIP.idle;
}
