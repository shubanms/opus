import useUIStore from '../../store/uiStore.js';
import { weekdayConflicts, describeConflicts } from '../../utils/routineDays.js';

/**
 * Ask before a new week (Plan week, a program) takes days that routines
 * already have. Resolves true to go ahead — immediately when the days are
 * free. The routines it displaces are kept, only their day is cleared, and
 * the dialog says so, because "replace" alone reads like "delete".
 *
 * Installing used to add the new routines next to the old ones on the same
 * days, where the older routine kept winning — the new program never showed —
 * and installing twice doubled every calendar event.
 */
export async function confirmReplaceWeek(templates, days, what = 'This') {
  const conflicts = weekdayConflicts(templates, days);
  if (!conflicts.length) return true;
  const one = conflicts.length === 1;
  return useUIStore.getState().confirm({
    title: 'Replace your current week?',
    message: `${describeConflicts(conflicts)} ${one ? 'is' : 'are'} already planned. ${what} takes ${one ? 'that day' : 'those days'}; your current routines stay in your list, just off the plan.`,
    confirmLabel: 'Replace',
    cancelLabel: 'Keep my week',
  });
}
