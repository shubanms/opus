// What the exercise picker shows first.
//
// It was the catalogue in alphabetical order, ~80 rows, every time — so the
// lift you do every Monday sat wherever its name put it, and the star you gave
// it on the Exercises page did nothing here. A picker is a shortcut to what you
// are about to do, which is almost always something you have done before.
// Pure + unit-tested.

const byName = (a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''));

/**
 * Exercise ids in most-recently-trained order, from sets sorted newest first.
 */
export function recentExerciseIds(setsNewestFirst, limit = 8) {
  const out = [];
  const seen = new Set();
  for (const s of setsNewestFirst ?? []) {
    const id = s?.exerciseId;
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * One flat list: favourites, then recently used, then A–Z. For a search or a
 * filter, where headings would only break up a short result.
 */
export function rankForPicker(exercises, recentIds = []) {
  const rank = new Map((recentIds ?? []).map((id, i) => [id, i]));
  const recency = (e) => (rank.has(e.id) ? rank.get(e.id) : Number.POSITIVE_INFINITY);
  return [...(exercises ?? [])].sort((a, b) => {
    const fav = (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
    if (fav) return fav;
    const r = recency(a) - recency(b);
    if (r) return r;
    return byName(a, b);
  });
}

/**
 * Sections for the empty picker: your favourites, what you trained recently,
 * then the whole catalogue A–Z. The full list stays complete — someone
 * scanning alphabetically for a lift must find it there even if it is also in
 * Recent.
 */
export function pickerSections(exercises, recentIds = []) {
  const list = exercises ?? [];
  const byId = new Map(list.map((e) => [e.id, e]));
  const favourites = rankForPicker(list.filter((e) => e.favorite), recentIds);
  const recent = (recentIds ?? []).map((id) => byId.get(id)).filter((e) => e && !e.favorite);
  return [
    favourites.length ? { key: 'favourites', label: 'Favourites', items: favourites } : null,
    recent.length ? { key: 'recent', label: 'Recent', items: recent } : null,
    { key: 'all', label: 'All exercises', items: [...list].sort(byName) },
  ].filter(Boolean);
}
