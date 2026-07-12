// True only on the upward crossing of a goal (was below, now at/above). Pure.
export function crossedGoal(prev, next, goal) {
  return goal > 0 && prev < goal && next >= goal;
}
