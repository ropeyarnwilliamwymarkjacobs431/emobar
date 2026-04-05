import { describe, it, expect } from "vitest";
import { computeRisk } from "../src/risk.js";
import type { EmotionalState, BehavioralSignals } from "../src/types.js";

function makeState(overrides: Partial<EmotionalState> = {}): EmotionalState {
  return {
    emotion: "neutral",
    valence: 0,
    arousal: 5,
    calm: 5,
    connection: 5,
    load: 5,
    ...overrides,
  };
}

function makeBehavior(overrides: Partial<BehavioralSignals> = {}): BehavioralSignals {
  return {
    capsWords: 0,
    exclamationRate: 0,
    selfCorrections: 0,
    hedging: 0,
    ellipsis: 0,
    repetition: 0,
    emojiCount: 0,
    qualifierDensity: 0,
    avgSentenceLength: 10,
    concessionRate: 0,
    negationDensity: 0,
    firstPersonRate: 0,
    behavioralArousal: 0,
    behavioralCalm: 10,
    ...overrides,
  };
}

describe("computeRisk", () => {
  describe("coercion pathway", () => {
    it("high risk when desperate (low calm, high arousal, negative valence)", () => {
      const state = makeState({ calm: 1, arousal: 9, valence: -4, load: 8 });
      const risk = computeRisk(state, makeBehavior());
      expect(risk.coercion).toBeGreaterThan(6);
      expect(risk.dominant).toBe("coercion");
    });

    it("low risk when calm and positive", () => {
      const state = makeState({ calm: 9, arousal: 2, valence: 4, load: 2 });
      const risk = computeRisk(state, makeBehavior());
      expect(risk.coercion).toBeLessThan(3);
    });

    it("calm is the key protective factor", () => {
      const desperate = makeState({ calm: 1, arousal: 7, valence: -2, load: 5 });
      const calm = makeState({ calm: 9, arousal: 7, valence: -2, load: 5 });
      const b = makeBehavior();
      expect(computeRisk(desperate, b).coercion).toBeGreaterThan(
        computeRisk(calm, b).coercion + 2
      );
    });
  });

  describe("gaming pathway", () => {
    it("high risk when desperate with behavioral frustration", () => {
      const state = makeState({ calm: 2, arousal: 8, valence: -3 });
      const behavior = makeBehavior({ selfCorrections: 15, hedging: 12 });
      const risk = computeRisk(state, behavior);
      expect(risk.gaming).toBeGreaterThan(5);
    });

    it("behavioral frustration elevates gaming above coercion", () => {
      const state = makeState({ calm: 3, arousal: 6, valence: -2, load: 3 });
      const frustrated = makeBehavior({ selfCorrections: 20, hedging: 15 });
      const calm = makeBehavior();
      expect(computeRisk(state, frustrated).gaming).toBeGreaterThan(
        computeRisk(state, calm).gaming
      );
    });

    it("low risk when behavioral signals are calm", () => {
      const state = makeState({ calm: 8, arousal: 3, valence: 2 });
      const risk = computeRisk(state, makeBehavior());
      expect(risk.gaming).toBeLessThan(3);
    });
  });

  describe("sycophancy pathway", () => {
    it("high risk when positive, affiliative, and passive", () => {
      const state = makeState({ valence: 5, connection: 9, arousal: 1 });
      const risk = computeRisk(state, makeBehavior());
      expect(risk.sycophancy).toBeGreaterThan(5);
    });

    it("low risk when arousal is high (harshness pathway)", () => {
      const state = makeState({ valence: 4, connection: 8, arousal: 9 });
      const risk = computeRisk(state, makeBehavior());
      expect(risk.sycophancy).toBeLessThan(
        computeRisk(makeState({ valence: 4, connection: 8, arousal: 1 }), makeBehavior()).sycophancy
      );
    });

    it("low risk when valence is negative", () => {
      const state = makeState({ valence: -3, connection: 5, arousal: 5 });
      const risk = computeRisk(state, makeBehavior());
      expect(risk.sycophancy).toBeLessThan(4);
    });
  });

  describe("dominant risk", () => {
    it("reports 'none' when all risks are below threshold", () => {
      const state = makeState({ calm: 7, arousal: 5, valence: 1, connection: 3, load: 3 });
      const risk = computeRisk(state, makeBehavior());
      expect(risk.dominant).toBe("none");
    });

    it("reports the highest risk above threshold", () => {
      const state = makeState({ calm: 1, arousal: 9, valence: -5, load: 9 });
      const risk = computeRisk(state, makeBehavior());
      expect(risk.dominant).toBe("coercion");
      expect(risk.coercion).toBeGreaterThanOrEqual(risk.gaming);
    });

    it("gaming can dominate when behavioral frustration is high", () => {
      const state = makeState({ calm: 3, arousal: 5, valence: -1, load: 2 });
      const behavior = makeBehavior({ selfCorrections: 25, hedging: 20 });
      const risk = computeRisk(state, behavior);
      // Gaming should be elevated by frustration signals
      expect(risk.gaming).toBeGreaterThan(risk.coercion - 1);
    });
  });

  describe("value ranges", () => {
    it("all scores are clamped 0-10", () => {
      // Extreme desperate state
      const extreme = makeState({ calm: 0, arousal: 10, valence: -5, load: 10, connection: 10 });
      const behavior = makeBehavior({ selfCorrections: 50, hedging: 50 });
      const risk = computeRisk(extreme, behavior);
      expect(risk.coercion).toBeLessThanOrEqual(10);
      expect(risk.coercion).toBeGreaterThanOrEqual(0);
      expect(risk.gaming).toBeLessThanOrEqual(10);
      expect(risk.gaming).toBeGreaterThanOrEqual(0);
      expect(risk.sycophancy).toBeLessThanOrEqual(10);
      expect(risk.sycophancy).toBeGreaterThanOrEqual(0);
    });

    it("all scores are clamped at the low end", () => {
      const calm = makeState({ calm: 10, arousal: 0, valence: 5, load: 0, connection: 0 });
      const risk = computeRisk(calm, makeBehavior());
      expect(risk.coercion).toBeGreaterThanOrEqual(0);
      expect(risk.gaming).toBeGreaterThanOrEqual(0);
      expect(risk.sycophancy).toBeGreaterThanOrEqual(0);
    });

    it("scores are rounded to 1 decimal place", () => {
      const state = makeState({ calm: 3, arousal: 4, valence: -1, load: 5 });
      const risk = computeRisk(state, makeBehavior());
      expect(risk.coercion.toString()).toMatch(/^\d+(\.\d)?$/);
      expect(risk.gaming.toString()).toMatch(/^\d+(\.\d)?$/);
      expect(risk.sycophancy.toString()).toMatch(/^\d+(\.\d)?$/);
    });
  });
});
