import { useEffect, useState } from 'react';
import { todayKey } from '../utils/dateKey.js';

// Today's local date key, and a re-render when it changes.
//
// "Today" used to be read inside live queries, which only re-run when the data
// changes — so a phone left on Home overnight kept showing yesterday's water
// and steps, and the first "+ Glass" of the morning played the goal fanfare
// for yesterday's total. Pass this key as a dependency to any query that is
// about "today" and it rolls over at midnight, and when the app comes back
// from the background (timers are frozen while it is hidden).
export function useTodayKey() {
  const [key, setKey] = useState(() => todayKey());

  useEffect(() => {
    let timer;
    const refresh = () => setKey(todayKey());
    const schedule = () => {
      clearTimeout(timer);
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      timer = setTimeout(() => { refresh(); schedule(); }, Math.max(1000, next - now));
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') { refresh(); schedule(); }
    };
    schedule();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return key;
}
