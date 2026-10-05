// Which routine owns which weekday. Pure + unit-tested.
//
// A weekday holds one routine. Nothing used to enforce that: the builder, the
// generator, Plan week and Programs all wrote `dayOfWeek` without clearing it
// elsewhere, and every reader picked a different winner — the weekly grid and
// Home's "today" showed the OLDEST routine, so a freshly installed program never
// appeared, while the calendar export happily wrote both. Writes now clear the
// day on other routines (templateActions); for rows written before that, every
// reader resolves a shared day the same way, through here: the newest wins.

/** 0=Sun … 6=Sat, as `Date.getDay()` and the `templates.dayOfWeek` column. */
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Display order: the training week starts on Monday. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const isDay = (d) => Number.isInteger(d) && d >= 0 && d <= 6;
const newer = (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0) || (a.id ?? 0) - (b.id ?? 0);

/** The routine shown for weekday `dow`: the newest one assigned to it, or null. */
export function routineForDay(templates, dow) {
  let best = null;
  for (const t of templates ?? []) {
    if (t?.dayOfWeek === dow && (!best || newer(t, best) > 0)) best = t;
  }
  return best;
}

/** { [dow]: routine } with one routine per assigned weekday. */
export function planByDay(templates) {
  const out = {};
  for (const t of templates ?? []) {
    if (!isDay(t?.dayOfWeek)) continue;
    const cur = out[t.dayOfWeek];
    if (!cur || newer(t, cur) > 0) out[t.dayOfWeek] = t;
  }
  return out;
}

/** Does this routine actually own the weekday it carries (not shadowed by a newer one)? */
export function ownsItsDay(template, templates) {
  if (!isDay(template?.dayOfWeek)) return false;
  return routineForDay(templates, template.dayOfWeek)?.id === template.id;
}

/**
 * Routines already sitting on any of `days`, Monday first — what installing a
 * week over them would take those days from. `exclude` ids are ignored (the
 * routine being edited). Returns [{ dayOfWeek, template }], one per day.
 */
export function weekdayConflicts(templates, days, { exclude = [] } = {}) {
  const skip = new Set(exclude);
  const wanted = new Set((days ?? []).filter(isDay));
  const owners = planByDay((templates ?? []).filter((t) => !skip.has(t.id)));
  return WEEK_ORDER.filter((d) => wanted.has(d) && owners[d]).map((d) => ({ dayOfWeek: d, template: owners[d] }));
}

/** "Mon (Push), Wed (Pull)" — the conflicts, the way the confirm dialog says them. */
export function describeConflicts(conflicts) {
  return (conflicts ?? [])
    .map(({ dayOfWeek, template }) => `${DAY_SHORT[dayOfWeek]} (${template?.name || 'Routine'})`)
    .join(', ');
}
