import { useEffect, useState } from 'react';
import { installState, promptInstall, subscribeInstall } from '../utils/installPrompt.js';

// `{ canInstall, installed, install }` — see utils/installPrompt.js for why the
// app offers its own install button at all.
export function useInstallPrompt() {
  const [state, setState] = useState(installState);
  useEffect(() => subscribeInstall(() => setState(installState())), []);
  return { ...state, install: promptInstall };
}
