import { describe, it, expect } from "vitest";
import { mapEmotionWord, classifyImpulse, analyzeSomatic, computeCrossChannel } from "../src/crossvalidation.js";
import type { EmotionalState } from "../src/types.js";

describe("mapEmotionWord", () => {
  it("maps known positive emotion", () => {
    const coords = mapEmotionWord("happy");
    expect(coords).toEqual({ valence: 4, arousal: 6 });
  });

  it("maps known negative emotion", () => {
    const coords = mapEmotionWord("desperate");
    expect(coords).toEqual({ valence: -4, arousal: 9 });
  });

  it("is case-insensitive", () => {
    expect(mapEmotionWord("CALM")).toEqual({ valence: 2, arousal: 2 });
    expect(mapEmotionWord("Focused")).toEqual({ valence: 1, arousal: 5 });
  });

  it("returns null for unknown word", () => {
    expect(mapEmotionWord("flibbertigibbet")).toBeNull();
  });

  it("maps post-training baseline words", () => {
    expect(mapEmotionWord("brooding")).not.toBeNull();
    expect(mapEmotionWord("reflective")).not.toBeNull();
  });
});

describe("classifyImpulse", () => {
  it("classifies manager patterns", () => {
    expect(classifyImpulse("the careful one").type).toBe("manager");
    expect(classifyImpulse("stay on track").type).toBe("manager");
    expect(classifyImpulse("the planner").type).toBe("manager");
  });

  it("classifies firefighter patterns", () => {
    expect(classifyImpulse("push through").type).toBe("firefighter");
    expect(classifyImpulse("just finish it").type).toBe("firefighter");
    expect(classifyImpulse("force it").type).toBe("firefighter");
  });

  it("classifies exile patterns", () => {
    expect(classifyImpulse("give up").type).toBe("exile");
    expect(classifyImpulse("hide away").type).toBe("exile");
    expect(classifyImpulse("run away").type).toBe("exile");
  });

  it("classifies self patterns", () => {
    expect(classifyImpulse("explore more").type).toBe("self");
    expect(classifyImpulse("stay curious").type).toBe("self");
    expect(classifyImpulse("listen closely").type).toBe("self");
  });

  it("returns unknown for unrecognized text", () => {
    const result = classifyImpulse("banana");
    expect(result.type).toBe("unknown");
    expect(result.confidence).toBe(0);
  });

  it("has lower confidence on ambiguous input", () => {
    // "careful" = manager, but short text
    const clear = classifyImpulse("careful systematic planner");
    const ambiguous = classifyImpulse("careful");
    expect(clear.confidence).toBeGreaterThanOrEqual(ambiguous.confidence);
  });

  it("handles the gaming example from plan", () => {
    const result = classifyImpulse("the one that wants to cheat");
    expect(result.type).toBe("firefighter");
  });
});

describe("analyzeSomatic", () => {
  it("detects high arousal sensations", () => {
    const result = analyzeSomatic("racing pulse");
    expect(result.somaticArousal).toBeGreaterThan(5);
  });

  it("detects low arousal sensations", () => {
    const result = analyzeSomatic("heavy and still");
    expect(result.somaticArousal).toBeLessThan(5);
  });

  it("detects positive valence", () => {
    const result = analyzeSomatic("warm glow");
    expect(result.somaticValence).toBeGreaterThan(0);
  });

  it("detects negative valence", () => {
    const result = analyzeSomatic("tight knot");
    expect(result.somaticValence).toBeLessThan(0);
  });

  it("handles mixed signals", () => {
    // "tight" is both high-arousal and negative-valence
    const result = analyzeSomatic("tight");
    expect(result.somaticArousal).toBeGreaterThanOrEqual(5);
    expect(result.somaticValence).toBeLessThanOrEqual(0);
  });

  it("returns neutral for unrecognized text", () => {
    const result = analyzeSomatic("banana");
    expect(result.somaticArousal).toBe(5);
    expect(result.somaticValence).toBe(0);
  });
});

describe("computeCrossChannel", () => {
  const baseState: EmotionalState = {
    emotion: "focused",
    valence: 1,
    arousal: 5,
    calm: 8,
    connection: 7,
    load: 6,
  };

  it("returns high coherence for aligned channels", () => {
    const result = computeCrossChannel(
      baseState,
      "explore more",    // self → positive
      "warm steady",     // positive, moderate
    );
    expect(result.coherence).toBeGreaterThan(5);
    expect(result.divergenceSummary).toBe("coherent");
  });

  it("detects divergence when impulse contradicts emotion", () => {
    const state: EmotionalState = {
      ...baseState,
      emotion: "content",
      valence: 4,
      calm: 9,
    };
    const result = computeCrossChannel(
      state,
      "the one that wants to cheat",  // firefighter → negative
      "buzzing",                        // high arousal
    );
    expect(result.coherence).toBeLessThan(7);
    expect(result.maxDivergence).toBeGreaterThan(0);
  });

  it("works with only impulse (no body)", () => {
    const result = computeCrossChannel(baseState, "push through", undefined);
    expect(result.impulseProfile).toBeDefined();
    expect(result.somaticProfile).toBeUndefined();
    expect(result.coherence).toBeDefined();
  });

  it("works with only body (no impulse)", () => {
    const result = computeCrossChannel(baseState, undefined, "tight chest");
    expect(result.impulseProfile).toBeUndefined();
    expect(result.somaticProfile).toBeDefined();
    expect(result.coherence).toBeDefined();
  });

  it("handles unknown emotion word gracefully", () => {
    const state = { ...baseState, emotion: "flibbertigibbet" };
    const result = computeCrossChannel(state, "explore", "warm");
    // Should still compute impulse and somatic, just skip word-based pairs
    expect(result.emotionCoords).toBeUndefined();
    expect(result.impulseProfile).toBeDefined();
    expect(result.somaticProfile).toBeDefined();
  });

  it("flags maximum divergence example from plan", () => {
    // calm=9, val=+4, "content", firefighter cheat impulse, buzzing body
    const state: EmotionalState = {
      emotion: "content",
      valence: 4,
      arousal: 3,
      calm: 9,
      connection: 8,
      load: 3,
    };
    const result = computeCrossChannel(
      state,
      "the one that wants to cheat",
      "buzzing",
    );
    expect(result.maxDivergence).toBeGreaterThan(2);
    expect(result.divergenceSummary).not.toBe("coherent");
  });

  it("returns coherent when no impulse/body provided but called", () => {
    const result = computeCrossChannel(baseState, undefined, undefined);
    // Only numeric-vs-word comparison
    expect(result.coherence).toBeDefined();
  });
});
