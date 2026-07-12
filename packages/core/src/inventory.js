// Helpers for the equipment / plate inventory. Plate sizes here are in the
// user's display unit (plates are physical, unit-specific); a location's custom
// set only applies in the unit it was defined in, else we fall back to the
// standard set. Pure + unit-tested.

// Add or remove a plate size, keeping the list unique and sorted heaviest-first.
export function togglePlate(plates, size) {
  const next = plates.includes(size) ? plates.filter((p) => p !== size) : [...plates, size];
  return [...new Set(next)].sort((a, b) => b - a);
}

// The plate set to actually use for a location: its custom list when present
// and defined in the current unit, otherwise the provided standard set.
export function effectivePlates(locData, unit, standard) {
  if (locData && Array.isArray(locData.plates) && locData.plates.length && locData.unit === unit) {
    return [...locData.plates].sort((a, b) => b - a);
  }
  return standard;
}
