// Estimated one-rep max via the Epley formula: 1RM = w · (1 + reps/30).
// A single rep returns the weight itself. Sets with no external load (pure
// bodyweight) can't be estimated this way and return 0.
export function epley1RM(weight, reps) {
  if (!weight || weight <= 0 || !reps || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}
