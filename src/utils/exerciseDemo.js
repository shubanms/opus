// The "How to do it" picture, from wger's public API. Best-effort and quiet:
// offline, not found, or wger down all mean "no picture", never an error.
//
// The old lookup was `exercise/search/?term=`, which wger has removed (404), so
// no picture ever loaded. Its fallback, `exerciseimage/?exercise_base=`, is a
// filter the API silently ignores — it answers with ALL 378 images, so had it
// been reached it would have shown some other exercise. What works (checked
// against the live API, Oct 2026):
//
//   exercise-translation/?name=<exact name>  → results[].exercise (an id)
//   exercisealias/?alias=<exact name>        → .translation → that translation's exercise
//   exerciseimage/?exercise=<id>&is_main=True → results[].image
//
// The name filter is exact and case-sensitive and `language` is ignored, so a
// couple of spellings are tried (wger mostly names things in the plural:
// "Lateral Raises", "Deadlifts"), and every answer is checked against the id
// that was asked for — an ignored filter must never put a stranger's picture
// on the page. The pure parts are unit-tested.

export const WGER_API = 'https://wger.de/api/v2';

// Catalogue names whose wger spelling differs by more than a plural.
const WGER_SPELLING = {
  'Pull-Up': 'Pull-ups',
  'Chin-Up': 'Chin-ups',
  'Sit-Up': 'Sit-ups',
};

/** The exact names to try, best first, de-duplicated. */
export function demoNameCandidates(name) {
  const base = String(name ?? '').replace(/\s+/g, ' ').trim().replace(/\.$/, '');
  if (!base) return [];
  const out = [];
  const add = (n) => { if (n && !out.includes(n)) out.push(n); };
  add(WGER_SPELLING[base]);
  add(base);
  if (!/s$/i.test(base)) add(`${base}s`);
  return out;
}

/** The exercise id an exact-name translation lookup points at (English preferred). */
export function pickTranslationExercise(results, name) {
  const exact = (results ?? []).filter((r) => r && r.name === name && Number.isInteger(r.exercise));
  const hit = exact.find((r) => r.language === 2) ?? exact[0];
  return hit ? hit.exercise : null;
}

/** The translation id an alias lookup points at — only for an alias that really is `name`. */
export function pickAliasTranslation(results, name) {
  const hit = (results ?? []).find((r) => r && r.alias === name && Number.isInteger(r.translation));
  return hit ? hit.translation : null;
}

/** The main image URL for exercise `id` — ignoring any row that belongs to another exercise. */
export function pickMainImage(results, id) {
  const own = (results ?? []).filter((r) => r && r.exercise === id && r.image);
  const main = own.find((r) => r.is_main) ?? own[0];
  if (!main) return null;
  return main.image.startsWith('/') ? `https://wger.de${main.image}` : main.image;
}

// Same exercise, same answer, for the life of the page: the detail page
// re-renders and gets revisited. Only definite answers are kept.
const cache = new Map();

// A 404 is an answer ("no such thing"); anything else non-OK is wger having a
// bad moment, which must not be remembered as "no picture".
async function getJson(url, signal) {
  const res = await fetch(url, { signal });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`wger ${res.status}`);
  return res.json();
}

async function exerciseIdFor(name, signal) {
  for (const candidate of demoNameCandidates(name)) {
    const t = await getJson(`${WGER_API}/exercise-translation/?name=${encodeURIComponent(candidate)}&format=json`, signal);
    const id = pickTranslationExercise(t?.results, candidate);
    if (id != null) return id;
  }
  // Last resort: wger's alias list ("Deadlift" is an alias of "Deadlifts").
  const a = await getJson(`${WGER_API}/exercisealias/?alias=${encodeURIComponent(name)}&format=json`, signal);
  const translationId = pickAliasTranslation(a?.results, name);
  if (translationId == null) return null;
  const tr = await getJson(`${WGER_API}/exercise-translation/${translationId}/?format=json`, signal);
  return Number.isInteger(tr?.exercise) ? tr.exercise : null;
}

/**
 * A demo image URL for an exercise name, or null. Never throws (an aborted
 * lookup resolves null too). Not pure — this goes to the network.
 */
export async function findDemoImage(name, { signal } = {}) {
  const key = String(name ?? '').replace(/\s+/g, ' ').trim();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key);
  try {
    const id = await exerciseIdFor(key, signal);
    let url = null;
    if (id != null) {
      const im = await getJson(`${WGER_API}/exerciseimage/?exercise=${id}&is_main=True&format=json`, signal);
      url = pickMainImage(im?.results, id);
    }
    cache.set(key, url);
    return url;
  } catch {
    // Offline, aborted, blocked or wger down — no picture, and not cached, so
    // it can still load once the connection is back.
    return null;
  }
}
