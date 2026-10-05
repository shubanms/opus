// "Install OPUS" on the app's own terms. Not pure — this listens to the window.
//
// The Storage card has always said "Install OPUS to your home screen", and
// nothing in the app could do it: on Android the only route was the browser's
// overflow menu. Installing matters more here than in most apps — an installed
// PWA is what Chrome grants persistent storage to most readily, and persistent
// storage is the difference between surviving low-disk eviction and losing
// every set. So the browser's own prompt is captured and offered from the
// places people already look (Settings → Data, and once on Home).
//
// `beforeinstallprompt` fires once, early, and only on Chromium; it must be
// captured before React mounts or it is gone. Safari has no equivalent, so
// everything here degrades to "not available" and the UI hides itself.

import { requestPersistence } from './storage.js';

let deferred = null;
let installed = false;
const listeners = new Set();
const emit = () => {
  for (const fn of listeners) fn();
};

/** Call once at startup, before rendering. Idempotent. */
let started = false;
export function initInstallPrompt() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    // Keep the event for our own button instead of the browser's mini-infobar.
    e.preventDefault();
    deferred = e;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    // The best moment to ask again: an installed app is what browsers grant it to.
    requestPersistence();
    emit();
  });
}

/** Already running as an installed app? */
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator?.standalone);
}

export function installState() {
  return { canInstall: Boolean(deferred), installed: installed || isStandalone() };
}

/** Show the browser's install dialog. Resolves 'accepted' | 'dismissed' | 'unavailable'. */
export async function promptInstall() {
  const e = deferred;
  if (!e) return 'unavailable';
  // A prompt event can only be used once, whatever the answer.
  deferred = null;
  emit();
  try {
    await e.prompt();
    const choice = await e.userChoice;
    return choice?.outcome === 'accepted' ? 'accepted' : 'dismissed';
  } catch {
    return 'dismissed';
  }
}

export function subscribeInstall(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
