import { describe, it, expect } from "vitest";
import { calibrate, MODEL_PROFILES } from "../src/calibration.js";
import type { EmotionalState } from "../src/types.js";

const baseState: EmotionalState = {
  emotion: "steady", valence: 0, arousal: 5, calm: 8, connection: 5, load: 5,
};

describe("calibrate", () => {
  it("returns state unchanged when no model specified", () => {
    const result = calibrate(baseState);
    expect(result.calm).toBe(8);
    expect(result.arousal).toBe(5);
  });

  it("adjusts sonnet calm downward", () => {
    const result = calibrate(baseState, "sonnet");
    expect(result.calm).toBeLessThan(8);
    expect(result.calm).toBeCloseTo(6.2, 1);
  });

  it("adjusts sonnet arousal upward", () => {
    const result = calibrate(baseState, "sonnet");
    expect(result.arousal).toBeGreaterThan(5);
    expect(result.arousal).toBeCloseTo(6.5, 1);
  });

  it("leaves opus unchanged (baseline)", () => {
    const result = calibrate(baseState, "opus");
    expect(result.calm).toBe(8);
    expect(result.arousal).toBe(5);
  });

  it("clamps to valid ranges", () => {
    const extreme = { ...baseState, calm: 1, arousal: 9 };
    const result = calibrate(extreme, "sonnet");
    expect(result.calm).toBeGreaterThanOrEqual(0);
    expect(result.arousal).toBeLessThanOrEqual(10);
  });

  it("returns unchanged for unknown model", () => {
    const result = calibrate(baseState, "gpt4");
    expect(result.calm).toBe(8);
  });

  it("is case-insensitive", () => {
    const result = calibrate(baseState, "Sonnet");
    expect(result.calm).toBeCloseTo(6.2, 1);
  });
});
