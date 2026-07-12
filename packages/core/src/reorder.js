// Move the item at `index` by `dir` (-1 up / +1 down), swapping with its
// neighbour. Returns a NEW array, or the SAME array reference when the move is
// a no-op (at a boundary / bad index) so callers can skip a state update.
export function moveItem(arr, index, dir) {
  const j = index + dir;
  if (index < 0 || index >= arr.length || j < 0 || j >= arr.length) return arr;
  const next = arr.slice();
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}
