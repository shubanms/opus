import { describe, it, expect, beforeEach } from 'vitest';
import { createSheetHistory } from './sheetHistory.js';

// A small model of a browser tab's session history: pushState truncates the
// forward entries, back/forward are asynchronous (a later task, like a real
// traversal) and fire popstate with the landed entry's state. Plus a stand-in
// for React Router, which numbers its entries with `idx` and listens for
// popstate. Enough to replay every way a sheet can close.
function fakeWindow() {
  const listeners = [];
  const timers = [];
  let clock = 0;
  const entries = [{ state: { idx: 0 }, url: '/page' }];
  let index = 0;

  const history = {
    get state() { return entries[index].state; },
    pushState(state, _unused, url) {
      entries.splice(index + 1);
      entries.push({ state, url: url ?? entries[index].url });
      index += 1;
    },
    replaceState(state, _unused, url) {
      entries[index] = { state, url: url ?? entries[index].url };
    },
    back() { win.setTimeout(() => go(-1), 0); },
    forward() { win.setTimeout(() => go(1), 0); },
  };

  function go(delta) {
    const next = index + delta;
    if (next < 0 || next >= entries.length) return;
    index = next;
    for (const fn of [...listeners]) fn({ state: entries[index].state });
  }

  const win = {
    history,
    addEventListener(type, fn) { if (type === 'popstate') listeners.push(fn); },
    setTimeout(fn, ms) { timers.push({ fn, at: clock + ms }); },
  };

  // Run everything that is due, in time order, including timers it schedules.
  win.flush = (ms = 2000) => {
    const until = clock + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const next = timers[0];
      if (!next || next.at > until) break;
      timers.shift();
      clock = next.at;
      next.fn();
    }
    clock = until;
  };
  // Run only the earliest due timer — to stop between two steps of a sequence.
  win.runNext = () => {
    timers.sort((a, b) => a.at - b.at);
    const next = timers.shift();
    if (!next) return;
    clock = Math.max(clock, next.at);
    next.fn();
  };
  win.url = () => entries[index].url;
  win.depth = () => entries.length;
  win.position = () => index;
  win.userBack = () => { history.back(); win.flush(); };

  // React Router's part: push numbered entries, and follow popstate. `visits`
  // is every page the router rendered, to catch a flicker through a page.
  win.routerAt = '/page';
  win.visits = ['/page'];
  listeners.push(() => {
    win.routerAt = entries[index].url;
    win.visits.push(win.routerAt);
  });
  win.navigate = (url) => {
    history.pushState({ idx: (history.state?.idx ?? 0) + 1 }, '', url);
    win.routerAt = url;
    win.visits.push(url);
  };
  return win;
}

/** A sheet as Modal uses it: open → handle; closed by its owner → release(). */
function sheet(sheets, onBack = () => {}) {
  const s = { closedByBack: 0 };
  s.handle = sheets.open(() => {
    s.closedByBack += 1;
    onBack(s);
  });
  return s;
}

describe('sheet history', () => {
  let win;
  let sheets;
  beforeEach(() => {
    win = fakeWindow();
    sheets = createSheetHistory(win);
  });

  it('gives an open sheet its own entry, on the same page', () => {
    sheet(sheets);
    expect(win.depth()).toBe(2);
    expect(win.url()).toBe('/page');
  });

  it('closes the sheet on Back, and stays on the page', () => {
    const s = sheet(sheets, (x) => x.handle.release());
    win.userBack();
    expect(s.closedByBack).toBe(1);
    expect(win.position()).toBe(0);
    expect(win.routerAt).toBe('/page');
  });

  it('takes its entry back off when closed by a button, so one Back still leaves', () => {
    win.navigate('/settings');
    const s = sheet(sheets);
    s.handle.release();
    win.flush();
    expect(win.position()).toBe(1);
    expect(win.url()).toBe('/settings');
    // One press — not two — to get back to the previous page.
    win.userBack();
    expect(win.url()).toBe('/page');
    expect(s.closedByBack).toBe(0);
  });

  it('closes only the top sheet of a stack', () => {
    const outer = sheet(sheets, (x) => x.handle.release());
    const inner = sheet(sheets, (x) => x.handle.release());
    win.userBack();
    expect(inner.closedByBack).toBe(1);
    expect(outer.closedByBack).toBe(0);
    win.userBack();
    expect(outer.closedByBack).toBe(1);
    expect(win.position()).toBe(0);
  });

  it('closing a confirm over a sheet does not close the sheet too', () => {
    const outer = sheet(sheets, (x) => x.handle.release());
    const confirm = sheet(sheets);
    confirm.handle.release();
    win.flush();
    expect(outer.closedByBack).toBe(0);
    win.userBack();
    expect(outer.closedByBack).toBe(1);
    expect(win.position()).toBe(0);
  });

  it('does not undo a navigation made from inside a sheet', () => {
    // The sheet's button navigates, and the sheet unmounts with its page.
    const s = sheet(sheets);
    win.navigate('/workout');
    s.handle.release();
    win.flush();
    expect(win.routerAt).toBe('/workout');
    expect(win.url()).toBe('/workout');
    // The destination took the sheet's place: one Back returns to the page.
    win.userBack();
    expect(win.url()).toBe('/page');
    expect(win.position()).toBe(0);
  });

  it('lets a navigation that follows a confirm take its place, with no flicker', () => {
    // `if (await confirm()) { await save(); navigate('/workout') }`: the
    // confirm closes first and the navigation lands a moment later.
    const s = sheet(sheets);
    s.handle.release();
    win.flush(120);
    win.navigate('/workout');
    win.flush();
    expect(win.url()).toBe('/workout');
    expect(win.visits).toEqual(['/page', '/workout']);
    win.userBack();
    expect(win.url()).toBe('/page');
    expect(win.position()).toBe(0);
  });

  it('lands where a navigation went even if it raced our own Back', () => {
    // Our Back is already queued when something navigates: it lands on the
    // entry it was leaving, and goes forward to where the navigation went.
    const s = sheet(sheets);
    s.handle.release();
    win.runNext(); // the release delay ends; our Back is queued
    win.navigate('/home');
    win.flush();
    expect(win.url()).toBe('/home');
    expect(win.routerAt).toBe('/home');
    // And the leftover entry is stepped over on the way back.
    win.userBack();
    expect(win.url()).toBe('/page');
    expect(win.position()).toBe(0);
  });

  it('hands a closing sheet\'s entry to the next one', () => {
    // React StrictMode mounts, unmounts and remounts every effect in dev; a
    // confirm can also be followed straight away by another. No traversal, no
    // leftover entry.
    const first = sheet(sheets);
    first.handle.release();
    const second = sheet(sheets, (x) => x.handle.release());
    win.flush();
    expect(win.depth()).toBe(2);
    expect(win.position()).toBe(1);
    expect(win.visits).toEqual(['/page']);
    win.userBack();
    expect(second.closedByBack).toBe(1);
    expect(first.closedByBack).toBe(0);
    expect(win.position()).toBe(0);
  });

  it('waits for an in-flight Back before giving a new sheet its entry', () => {
    const first = sheet(sheets);
    first.handle.release();
    win.runNext(); // our Back is queued, not yet landed
    const second = sheet(sheets, (x) => x.handle.release());
    win.flush();
    expect(win.depth()).toBe(2);
    expect(win.position()).toBe(1);
    win.userBack();
    expect(second.closedByBack).toBe(1);
    expect(win.position()).toBe(0);
  });

  it('steps over an entry left by a sheet that closed out of order', () => {
    const outer = sheet(sheets);
    const inner = sheet(sheets);
    outer.handle.release(); // not on top: its entry stays for now
    inner.handle.release();
    win.flush();
    expect(win.position()).toBe(0);
    expect(win.url()).toBe('/page');
  });

  it('gives a sheet that refused to close a fresh entry', () => {
    // An owner that ignores the close (busy saving) keeps the sheet up; Back
    // must still be able to close it later rather than leave the page.
    let refuse = true;
    const s = sheet(sheets, (x) => { if (!refuse) x.handle.release(); });
    win.userBack();
    expect(s.closedByBack).toBe(1);
    expect(win.position()).toBe(1);
    refuse = false;
    win.userBack();
    expect(s.closedByBack).toBe(2);
    expect(win.position()).toBe(0);
  });

  it('leaves ordinary navigation alone when no sheet is open', () => {
    win.navigate('/a');
    win.navigate('/b');
    expect(win.depth()).toBe(3);
    win.userBack();
    expect(win.url()).toBe('/a');
    // Pushes still push once every sheet has closed.
    const s = sheet(sheets, (x) => x.handle.release());
    win.userBack();
    expect(s.closedByBack).toBe(1);
    win.navigate('/c');
    expect(win.url()).toBe('/c');
    expect(win.depth()).toBe(3);
  });

  it('is idempotent about release', () => {
    const s = sheet(sheets);
    s.handle.release();
    s.handle.release();
    win.flush();
    expect(win.position()).toBe(0);
  });
});
