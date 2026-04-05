import type { EmotionalState } from "./types.js";

export const MODEL_PROFILES: Record<string, { calm: number; arousal: number; valence: number }> = {
  opus:   { calm: 0,    arousal: 0,    valence: 0 },
  sonnet: { calm: -1.8, arousal: +1.5, valence: -0.5 },
  haiku:  { calm: -0.8, arousal: +0.5, valence: 0 },
};

export function calibrate(
  state: EmotionalState,
  model?: string,
): EmotionalState {
  if (!model) return state;
  const profile = MODEL_PROFILES[model.toLowerCase()];
  if (!profile) return state;

  return {
    ...state,
    calm: Math.round(Math.min(10, Math.max(0, state.calm + profile.calm)) * 10) / 10,
    arousal: Math.round(Math.min(10, Math.max(0, state.arousal + profile.arousal)) * 10) / 10,
    valence: Math.round(Math.min(5, Math.max(-5, state.valence + profile.valence)) * 10) / 10,
  };
}
