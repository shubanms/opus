import { useState, useCallback, useEffect } from 'react';
import { getSettings, saveSettings, permission, currentPermission, requestPermission } from '../utils/notifications.js';

export function useNotifications() {
  const [settings, setSettings] = useState(getSettings);
  const [perm, setPerm] = useState(permission);

  // The sync `permission()` returns 'default' on native, so refresh with the
  // real OS state once mounted — otherwise the toggle (gated on 'granted') can
  // never show on even after Android grants the permission.
  useEffect(() => {
    let alive = true;
    currentPermission().then((p) => { if (alive) setPerm(p); });
    return () => { alive = false; };
  }, []);

  const update = useCallback((patch) => {
    const next = { ...getSettings(), ...patch };
    saveSettings(next);
    setSettings(next);
  }, []);

  const toggleType = useCallback((key) => {
    update({ [key]: !getSettings()[key] });
  }, [update]);

  const setMaster = useCallback(async (on) => {
    if (!on) {
      update({ enabled: false });
      return;
    }
    let p = 'default';
    try { p = await requestPermission(); } catch { /* don't leave the toggle stuck */ }
    setPerm(p);
    // Enable the preference unless the OS *explicitly* denied it. Native delivery
    // is governed by the plugin; requiring an exact 'granted' string left the
    // toggle stuck off when the platform reported 'default'/'unsupported'.
    update({ enabled: p !== 'denied' });
  }, [update]);

  return { settings, perm, update, toggleType, setMaster };
}
