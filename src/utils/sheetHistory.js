// Back closes the sheet, not the page.
//
// On Android the system Back gesture is a history traversal. With no history
// entry of its own, an open bottom sheet could not intercept it: Back unmounted
// the whole page underneath — discarding, say, a half-built routine — while the
// sheet's own close button sat unused. So each open sheet pushes one history
// entry (same URL, marked) and closes when a Back takes the app off it.
//
// The hard part is everything else that moves history, and the rules that keep
// it honest:
//
// 1. Closing a sheet any other way (its button, the scrim, a drag, Esc) takes
//    its entry back off, or the next Back would "do nothing" — it would only
//    pop an entry nobody can see. That `history.back()` is ours, so the
//    popstate it causes must be ignored rather than read as the user's Back.
//    It waits out the sheet's exit first (rules 2 and 3 are why).
// 2. Navigating from inside a sheet — a button that closes it and goes
//    somewhere, often only after an `await` — must not be undone by rule 1.
//    A push made while standing on a sheet's entry (open, or closing) replaces
//    that entry instead, so the destination takes the sheet's place and one
//    Back from there returns to the page the sheet was over.
// 3. A sheet that opens as another closes (a second confirm, or React's
//    StrictMode remount) takes over the closing sheet's entry.
// 4. Sheets nest (a confirm over a sheet). Back closes only the top one, and an
//    entry left behind by a sheet that closed out of order is stepped over.
//
// Not pure — it drives `window.history` — but `win` is injected, so the tests
// can run it against a fake session history.

const MARK = 'opusSheet';
/** How long a closed sheet keeps its entry: about its exit animation. */
const RELEASE_DELAY_MS = 300;
/** If a traversal we started never reports back, stop waiting for it. */
const TRAVERSAL_TIMEOUT_MS = 1000;

export function createSheetHistory(win) {
  let seq = 0;
  /** Open sheets, oldest first. */
  const live = [];
  /** Sheets closed by their owner whose entry has not been taken off yet. */
  let closing = [];
  /** Traversals we started and have not yet seen the popstate for. */
  let pending = [];
  /** Sheets opened while one of our traversals was in flight. */
  let waiting = [];
  let nativePush = null;

  const hist = () => win.history;
  const markOf = (state) => (state && state[MARK] != null ? state[MARK] : null);
  const isLive = (id) => id != null && live.some((e) => e.id === id && e.pushed && !e.popped);
  const isClosing = (id) => id != null && closing.some((e) => e.id === id);

  function install() {
    if (nativePush) return;
    const h = hist();
    nativePush = h.pushState.bind(h);
    // Rule 2. Only ever a push made while standing on a sheet's entry; a push
    // from anywhere else is untouched.
    h.pushState = function pushState(state, unused, url) {
      const here = markOf(h.state);
      if (isLive(here) || isClosing(here)) return h.replaceState(state, unused, url);
      return nativePush(state, unused, url);
    };
    win.addEventListener('popstate', onPop);
  }

  function push(entry) {
    nativePush({ ...(hist().state ?? {}), [MARK]: entry.id }, '');
    entry.pushed = true;
  }

  function flushWaiting() {
    const list = waiting;
    waiting = [];
    for (const entry of list) if (entry.open && !entry.pushed) push(entry);
  }

  function traverse(delta, leaving = null) {
    const op = { leaving };
    pending.push(op);
    // A traversal that never lands (it should not happen, but a browser is
    // free to drop one) must not leave every future sheet waiting forever.
    win.setTimeout(() => {
      if (!pending.includes(op)) return;
      pending = pending.filter((p) => p !== op);
      if (!pending.length) flushWaiting();
    }, TRAVERSAL_TIMEOUT_MS);
    if (delta < 0) hist().back();
    else hist().forward();
  }

  function onPop(event) {
    const landed = markOf(event?.state ?? hist().state);

    if (pending.length) {
      // Decide before letting waiting sheets push: if this landing needs one
      // more step, they must push from where that step ends, not from here.
      const op = pending.shift();
      if (op.leaving != null && landed === op.leaving) {
        // Our Back landed on the very entry it was leaving: a navigation pushed
        // on top of it before the traversal ran. Go where that navigation went.
        traverse(+1);
        return;
      }
      if (landed != null && !isLive(landed)) {
        traverse(-1); // a stale sheet entry
        return;
      }
      if (!pending.length) flushWaiting();
      return;
    }

    if (!live.length && landed == null) return; // ordinary page navigation

    // The user's own Back: close every sheet above the entry we landed on.
    for (let i = live.length - 1; i >= 0; i -= 1) {
      const entry = live[i];
      if (entry.id === landed) break;
      if (!entry.pushed) continue;
      live.splice(i, 1);
      entry.popped = true;
      entry.close();
      // A sheet whose owner ignored the close (a save in progress, say) is
      // still on screen; give it an entry again so the next Back still works.
      win.setTimeout(() => {
        if (!entry.open) return;
        entry.popped = false;
        entry.pushed = false;
        live.push(entry);
        if (pending.length) waiting.push(entry);
        else push(entry);
      }, 50);
    }
    if (landed != null && !isLive(landed)) traverse(-1); // landed on a stale entry
  }

  /**
   * A sheet opened. `close` is called when Back should close it. Returns the
   * handle whose `release()` must be called however the sheet ends up closing.
   */
  function open(close) {
    install();
    const entry = { id: ++seq, open: true, pushed: false, popped: false, close };
    live.push(entry);

    const handle = {
      id: entry.id,
      release() {
        if (!entry.open) return;
        entry.open = false;
        const i = live.indexOf(entry);
        if (i !== -1) live.splice(i, 1);
        waiting = waiting.filter((e) => e !== entry);
        if (entry.popped || !entry.pushed) return;
        // Rule 1, after the exit — and only if it is still the entry we are
        // standing on. If a navigation replaced it, or a sheet above it (or
        // one that took it over) is open, it is left alone.
        closing.push(entry);
        win.setTimeout(() => {
          if (!closing.includes(entry)) return; // taken over by a new sheet
          closing = closing.filter((e) => e !== entry);
          if (markOf(hist().state) === entry.id) traverse(-1, entry.id);
        }, RELEASE_DELAY_MS);
      },
    };

    // Rule 3: standing on a sheet's entry that is on its way out — take it.
    const here = markOf(hist().state);
    const handover = closing.find((e) => e.id === here);
    if (handover && !pending.length) {
      closing = closing.filter((e) => e !== handover);
      hist().replaceState({ ...(hist().state ?? {}), [MARK]: entry.id }, '');
      entry.pushed = true;
      return handle;
    }

    if (pending.length) waiting.push(entry);
    else push(entry);
    return handle;
  }

  return { open, MARK };
}
