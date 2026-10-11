import { useEffect, useRef, useState } from 'react';
import { todayKey } from '../utils/dateKey.js';
import { buildPatch, carryOver } from '../utils/health.js';
import { getEntry, logActivity, logBodyStat, logSleep } from '../utils/healthActions.js';

const WRITERS = { body: logBodyStat, sleep: logSleep, activity: logActivity };

// State for a "one row per day" form: body stats, sleep, activity.
//
// The form is a view of a single day. It opens on that day's row (today's, or
// the one whose pencil was tapped), and picking another date shows that day's
// row instead — which is also how an old entry gets corrected. Saving writes
// only the fields that changed (utils/health.js buildPatch), so nothing you
// left alone is overwritten.
//
// Errors are held back until a field loses focus or a save is attempted:
// typing "1" on the way to "100" is not a mistake yet.
export function useDayEntry({ kind, isOpen, initialDate, fields, unit = 'kg' }) {
  const [date, setDateState] = useState(initialDate ?? todayKey());
  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  // undefined = just opened, nothing typed that could be carried over.
  const originalRef = useRef(undefined);

  // Each opening starts clean on the requested day.
  useEffect(() => {
    if (!isOpen) return;
    originalRef.current = undefined;
    setForm({});
    setTouched({});
    setSubmitted(false);
    setLoaded(false);
    setDateState(initialDate ?? todayKey());
  }, [isOpen, initialDate]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `fields` is a module constant at every call site
  useEffect(() => {
    if (!isOpen || !date) return undefined;
    let alive = true;
    getEntry(kind, date).then((row) => {
      if (!alive) return;
      const prevOriginal = originalRef.current;
      setForm((prev) => carryOver(prev, prevOriginal, row, fields, unit));
      originalRef.current = row ?? null;
      setOriginal(row ?? null);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [isOpen, date, kind, unit]);

  const { patch, errors, changed } = buildPatch(original, form, fields, unit);
  const visibleErrors = Object.fromEntries(
    Object.entries(errors).filter(([f]) => submitted || touched[f])
  );

  return {
    date,
    // An emptied date input reports '' — keep the day we have. Nothing can be
    // logged for a day that hasn't happened; `max` stops the picker, but a
    // typed date isn't held to it.
    setDate: (d) => {
      if (d && d <= todayKey()) setDateState(d);
    },
    original,
    loaded,
    form,
    setField: (f, v) => setForm((prev) => ({ ...prev, [f]: v })),
    touch: (f) => setTouched((t) => ({ ...t, [f]: true })),
    errors: visibleErrors,
    hasErrors: Object.keys(errors).length > 0,
    changed,
    /** Writes the patch; resolves true when saved, false when blocked by errors. */
    async save() {
      if (Object.keys(errors).length) {
        setSubmitted(true);
        return false;
      }
      if (!changed) return true;
      await WRITERS[kind]({ date, ...patch });
      return true;
    },
  };
}
