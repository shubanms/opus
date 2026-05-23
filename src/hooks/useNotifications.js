import { useState, useCallback } from 'react';
import { getSettings, saveSettings, permission, requestPermission } from '../utils/notifications.js';

export function useNotifications() {
  const [settings, setSettings] = useState(getSettings);
  const [perm, setPerm] = useState(permission);

  const update = useCallback((patch) => {
    const next = { ...getSettings(), ...patch };
    saveSettings(next);
    setSettings(next);
  }, []);

  const toggleType = useCallback((key) => {
    update({ [key]: !getSettings()[key] });
  }, [update]);

  const setMaster = useCallback(async (on) => {
    if (on) {
      const p = await requestPermission();
      setPerm(p);
      update({ enabled: p === 'granted' });
    } else {
      update({ enabled: false });
    }
  }, [update]);

  return { settings, perm, update, toggleType, setMaster };
}
