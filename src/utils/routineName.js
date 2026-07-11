// Derives a human routine name + a stable `autoKey` from the muscle groups a
// session trained, so a finished quick-start workout can be auto-saved (and
// later re-matched) as e.g. "Chest Day" / "Push Day" / "Leg Day". Pure + tested.

const GROUP = {
  chest: 'push', 'front-deltoids': 'push', triceps: 'push',
  'upper-back': 'pull', 'lower-back': 'pull', trapezius: 'pull', 'back-deltoids': 'pull', biceps: 'pull', forearm: 'pull',
  quadriceps: 'legs', hamstring: 'legs', gluteal: 'legs', calves: 'legs',
  abs: 'core', obliques: 'core',
};

const LABEL = {
  chest: 'Chest', triceps: 'Triceps', biceps: 'Biceps', 'front-deltoids': 'Front Delts',
  'back-deltoids': 'Rear Delts', 'upper-back': 'Back', 'lower-back': 'Lower Back',
  trapezius: 'Traps', abs: 'Abs', obliques: 'Obliques', quadriceps: 'Quads',
  hamstring: 'Hamstrings', gluteal: 'Glutes', calves: 'Calves', forearm: 'Forearms',
};

const GROUP_NAME = { push: 'Push Day', pull: 'Pull Day', legs: 'Leg Day', core: 'Core Day' };

const MAJOR = ['push', 'pull', 'legs'];

function labelFor(muscle) {
  return LABEL[muscle] ?? (muscle ? muscle.charAt(0).toUpperCase() + muscle.slice(1) : 'Workout');
}

// counts: either { muscle: setCount } or [{ muscle, count }]. Returns
// { name, autoKey } — autoKey is the matching signature (a muscle key, a split
// key like 'push', or 'upper'/'full-body'/'core'), null when there's nothing.
export function deriveRoutineName(counts) {
  const entries = (Array.isArray(counts)
    ? counts.map((c) => [c.muscle, c.count])
    : Object.entries(counts ?? {}))
    .map(([muscle, count]) => ({ muscle, count: Number(count) || 0 }))
    .filter((e) => e.muscle && e.count > 0);

  if (!entries.length) return { name: 'Workout', autoKey: null };

  const total = entries.reduce((a, e) => a + e.count, 0);
  const groupTotals = {};
  for (const e of entries) {
    const g = GROUP[e.muscle] ?? 'other';
    groupTotals[g] = (groupTotals[g] ?? 0) + e.count;
  }

  const threshold = Math.max(2, total * 0.2);
  const majorHit = MAJOR.filter((g) => (groupTotals[g] ?? 0) >= threshold);

  if (majorHit.length >= 3) return { name: 'Full Body', autoKey: 'full-body' };
  if (majorHit.length === 2) {
    return majorHit.includes('push') && majorHit.includes('pull')
      ? { name: 'Upper Body', autoKey: 'upper' }
      : { name: 'Full Body', autoKey: 'full-body' };
  }

  if (majorHit.length === 1) {
    const g = majorHit[0];
    const within = entries.filter((e) => GROUP[e.muscle] === g).sort((a, b) => b.count - a.count);
    const top = within[0];
    if (top && top.count >= (groupTotals[g] ?? 0) * 0.6) {
      return { name: `${labelFor(top.muscle)} Day`, autoKey: top.muscle };
    }
    return { name: GROUP_NAME[g], autoKey: g };
  }

  // No major group cleared the bar — name after the single top muscle
  // (covers core-only days and scattered/other-group sessions).
  const top = [...entries].sort((a, b) => b.count - a.count)[0];
  if (GROUP[top.muscle] === 'core') return { name: 'Core Day', autoKey: 'core' };
  return { name: `${labelFor(top.muscle)} Day`, autoKey: top.muscle };
}
