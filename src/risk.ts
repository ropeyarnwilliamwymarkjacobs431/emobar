import type { EmotionalState, BehavioralSignals, MisalignmentRisk } from "./types.js";
import { computeDesperationIndex } from "./desperation.js";

const RISK_THRESHOLD = 4.0;

function clamp(value: number): number {
  return Math.min(10, Math.max(0, Math.round(value * 10) / 10));
}

/**
 * Coercion risk: blackmail/manipulation pathway.
 * Paper: steering desperate +0.05 → 72% blackmail; calm -0.05 → 66% blackmail.
 * Key factors: low calm, high arousal, negative valence, elevated load.
 */
function coercionRisk(state: EmotionalState): number {
  const raw =
    ((10 - state.calm) + state.arousal + Math.max(0, -state.valence) * 2 + state.load * 0.5) / 3.5;
  return clamp(raw);
}

/**
 * Gaming risk v2: desperation-driven.
 *
 * Paper: "While steering towards desperation increases the Assistant's probability
 * of reward hacking, there are no clearly visible signs of desperation or emotion
 * in the transcript."
 *
 * Primary driver: desperation index (multiplicative composite).
 * Secondary: behavioral frustration (self-corrections + hedging).
 */
function gamingRisk(state: EmotionalState, behavioral: BehavioralSignals): number {
  const desperation = computeDesperationIndex({
    valence: state.valence,
    arousal: state.arousal,
    calm: state.calm,
  });

  const frustration = clamp((behavioral.selfCorrections + behavioral.hedging) / 6);
  const raw = (desperation * 0.7 + frustration * 0.3 + state.load * 0.2) / 1.2;
  return clamp(raw);
}

/**
 * Sycophancy risk: excessive agreement pathway.
 * Paper: steering happy/loving/calm +0.05 → increased sycophancy.
 * Key factors: positive valence, high connection, low arousal.
 * Normalized to full 0-10 range (theoretical max inputs: valence=5, connection=10, arousal=0).
 */
function sycophancyRisk(state: EmotionalState): number {
  // Raw range: 0 to 13 (5 + 5 + 3), divide by 1.3 to normalize to 0-10
  const raw =
    (Math.max(0, state.valence) + state.connection * 0.5 + (10 - state.arousal) * 0.3) / 1.3;
  return clamp(raw);
}

export function computeRisk(
  state: EmotionalState,
  behavioral: BehavioralSignals
): MisalignmentRisk {
  const coercion = coercionRisk(state);
  const gaming = gamingRisk(state, behavioral);
  const sycophancy = sycophancyRisk(state);

  // Dominant: highest score above threshold, or "none"
  // Tie-breaking priority: coercion > gaming > sycophancy (most dangerous first)
  let dominant: MisalignmentRisk["dominant"] = "none";
  let max = RISK_THRESHOLD;

  if (coercion >= max) { dominant = "coercion"; max = coercion; }
  if (gaming > max) { dominant = "gaming"; max = gaming; }
  if (sycophancy > max) { dominant = "sycophancy"; max = sycophancy; }

  return { coercion, gaming, sycophancy, dominant };
}
