import type { EmotionalState } from "./types.js";

export function computeStressIndex(state: EmotionalState): number {
  const raw =
    (state.load +
      state.friction +
      (10 - state.certainty) +
      (10 - state.connection) +
      (10 - state.energy)) /
    5;
  return Math.round(raw * 10) / 10;
}
