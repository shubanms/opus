import { useEffect, useState } from 'react';
import { resolveSky } from '../../utils/theme.js';
import useSettingsStore from '../../store/settingsStore.js';

/** The sky Home paints: the setting, or the clock (re-checked each minute while visible). */
export default function useSky() {
  const sky = useSettingsStore((s) => s.sky);
  const [resolved, setResolved] = useState(() => resolveSky(sky));
  useEffect(() => {
    setResolved(resolveSky(sky));
    if (sky !== 'auto') return undefined;
    const tick = () => {
      if (document.visibilityState === 'visible') setResolved(resolveSky('auto'));
    };
    const id = setInterval(tick, 60000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [sky]);
  return resolved;
}
