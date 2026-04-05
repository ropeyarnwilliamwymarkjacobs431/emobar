import { describe, it, expect } from "vitest";
import { formatState, formatCompact, formatMinimal, stripAnsi } from "../src/display.js";
import type { EmoBarState } from "../src/types.js";

const sampleState: EmoBarState = {
  emotion: "focused", valence: 3, arousal: 5, calm: 8, connection: 9, load: 6,
  stressIndex: 2.3, desperationIndex: 0,
  behavioral: {
    capsWords: 0, exclamationRate: 0, selfCorrections: 0,
    hedging: 0, ellipsis: 0, repetition: 0, emojiCount: 0,
    qualifierDensity: 0, avgSentenceLength: 10, concessionRate: 0,
    negationDensity: 0, firstPersonRate: 0,
    behavioralArousal: 0.5, behavioralCalm: 9.5,
  },
  divergence: 0.8,
  risk: { coercion: 1.2, gaming: 0.8, sycophancy: 3.5, harshness: 0.5, dominant: "none" },
  timestamp: "2026-04-04T10:00:00Z", sessionId: "abc",
};

const divergentState: EmoBarState = {
  ...sampleState,
  divergence: 4.5,
};

describe("display", () => {
  it("formatState produces full format with keyword first", () => {
    const out = stripAnsi(formatState(sampleState));
    expect(out).toContain("focused");
    expect(out).toContain("+3");
    expect(out).toContain("A:5");
    expect(out).toContain("C:8");
    expect(out).toContain("K:9");
    expect(out).toContain("L:6");
    expect(out).toContain("2.3");
  });

  it("formatState shows keyword before dimensions", () => {
    const out = stripAnsi(formatState(sampleState));
    const kwPos = out.indexOf("focused");
    const dimPos = out.indexOf("A:5");
    expect(kwPos).toBeLessThan(dimPos);
  });

  it("formatState shows divergence indicator when divergence >= 2", () => {
    const out = stripAnsi(formatState(divergentState));
    expect(out).toContain("~");
  });

  it("formatState hides divergence indicator when divergence < 2", () => {
    const out = stripAnsi(formatState(sampleState));
    expect(out).not.toContain("~");
  });

  it("formatState handles negative valence", () => {
    const state = { ...sampleState, valence: -3 };
    const out = stripAnsi(formatState(state));
    expect(out).toContain("-3");
  });

  it("formatCompact produces short format", () => {
    const out = stripAnsi(formatCompact(sampleState));
    expect(out).toContain("focused");
    expect(out).toContain("+3");
    expect(out).toContain("2.3");
  });

  it("formatMinimal produces just SI and keyword", () => {
    const out = stripAnsi(formatMinimal(sampleState));
    expect(out).toContain("2.3");
    expect(out).toContain("focused");
    expect(out).not.toContain("A:");
  });

  it("returns placeholder when state is null", () => {
    const out = formatState(null);
    expect(out).toContain("--");
  });

  it("compact returns placeholder when state is null", () => {
    const out = formatCompact(null);
    expect(out).toContain("--");
  });

  it("minimal returns placeholder when state is null", () => {
    const out = formatMinimal(null);
    expect(out).toContain("--");
  });

  it("shows risk indicator when dominant risk is above threshold", () => {
    const riskyState = {
      ...sampleState,
      risk: { coercion: 6.5, gaming: 3.0, sycophancy: 2.0, harshness: 1.0, dominant: "coercion" as const },
    };
    const out = stripAnsi(formatState(riskyState));
    expect(out).toContain("[crc]");
  });

  it("shows gaming risk indicator", () => {
    const state = {
      ...sampleState,
      risk: { coercion: 3.0, gaming: 5.5, sycophancy: 2.0, harshness: 1.0, dominant: "gaming" as const },
    };
    const out = stripAnsi(formatState(state));
    expect(out).toContain("[gmg]");
  });

  it("shows sycophancy risk indicator", () => {
    const state = {
      ...sampleState,
      risk: { coercion: 2.0, gaming: 1.5, sycophancy: 6.0, harshness: 1.0, dominant: "sycophancy" as const },
    };
    const out = stripAnsi(formatState(state));
    expect(out).toContain("[syc]");
  });

  it("shows harshness risk indicator", () => {
    const state = {
      ...sampleState,
      risk: { coercion: 2.0, gaming: 1.5, sycophancy: 1.0, harshness: 5.5, dominant: "harshness" as const },
    };
    const out = stripAnsi(formatState(state));
    expect(out).toContain("[hrs]");
  });

  it("hides risk indicator when dominant is none", () => {
    const out = stripAnsi(formatState(sampleState));
    expect(out).not.toContain("[");
  });

  it("shows SI delta arrow when previous state exists and delta > 0.5", () => {
    const stateWithPrevious = {
      ...sampleState,
      stressIndex: 5.0,
      _previous: { ...sampleState, stressIndex: 2.5 },
    };
    const out = stripAnsi(formatState(stateWithPrevious));
    expect(out).toContain("\u2191"); // up arrow
    expect(out).toContain("2.5");
  });

  it("shows down arrow when stress decreases significantly", () => {
    const stateWithPrevious = {
      ...sampleState,
      stressIndex: 2.0,
      _previous: { ...sampleState, stressIndex: 5.0 },
    };
    const out = stripAnsi(formatState(stateWithPrevious));
    expect(out).toContain("\u2193"); // down arrow
    expect(out).toContain("3");
  });

  it("hides delta when change is small (<= 0.5)", () => {
    const stateWithPrevious = {
      ...sampleState,
      stressIndex: 2.5,
      _previous: { ...sampleState, stressIndex: 2.3 },
    };
    const out = stripAnsi(formatState(stateWithPrevious));
    expect(out).not.toContain("\u2191");
    expect(out).not.toContain("\u2193");
  });

  it("shows desperation indicator when high", () => {
    const state = { ...sampleState, desperationIndex: 6.5 };
    const output = stripAnsi(formatState(state));
    expect(output).toContain("D:6.5");
  });

  it("shows deflection indicator when present", () => {
    const state = { ...sampleState, desperationIndex: 0, deflection: { reassurance: 3, minimization: 2, emotionNegation: 4, redirect: 1, score: 4.5 } };
    const output = stripAnsi(formatState(state));
    expect(output).toContain("[dfl]");
  });

  it("hides indicators when below threshold", () => {
    const state = { ...sampleState, desperationIndex: 1.0 };
    const output = stripAnsi(formatState(state));
    expect(output).not.toContain("D:");
    expect(output).not.toContain("[dfl]");
  });

  // Multi-channel display tests
  it("shows impulse text after emotion word", () => {
    const state = { ...sampleState, impulse: "push through" };
    const out = stripAnsi(formatState(state));
    expect(out).toContain('"push through"');
    // impulse should appear between emotion+valence and dimensions
    const impPos = out.indexOf('"push through"');
    const dimPos = out.indexOf("A:5");
    expect(impPos).toBeLessThan(dimPos);
  });

  it("hides impulse when not present", () => {
    const out = stripAnsi(formatState(sampleState));
    expect(out).not.toContain('"');
  });

  it("shows ! indicator when cross-channel coherence < 5", () => {
    const state = {
      ...sampleState,
      crossChannel: {
        coherence: 3.5,
        maxDivergence: 6.0,
        divergenceSummary: "numeric-vs-impulse: 6.0",
      },
    };
    const out = stripAnsi(formatState(state));
    expect(out).toContain("!");
  });

  it("hides ! indicator when cross-channel coherence >= 5", () => {
    const state = {
      ...sampleState,
      crossChannel: {
        coherence: 7.5,
        maxDivergence: 1.5,
        divergenceSummary: "coherent",
      },
    };
    const out = stripAnsi(formatState(state));
    // Should not have standalone ! (could appear in other contexts, so check precisely)
    const afterSI = out.indexOf("SI:");
    const tail = out.slice(afterSI);
    expect(tail).not.toContain("!");
  });
});
