import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeState, readState } from "../src/state.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("state", () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `emobar-test-${Date.now()}.json`);
  });

  afterEach(() => {
    try { fs.unlinkSync(tmpFile); } catch {}
  });

  it("writes and reads back state", () => {
    const state = {
      emotion: "focused", valence: 3, arousal: 5, calm: 8, connection: 9, load: 6,
      stressIndex: 2.3,
      behavioral: {
        capsWords: 0, exclamationRate: 0, selfCorrections: 0,
        hedging: 0, ellipsis: 0, repetition: 0, emojiCount: 0,
        behavioralArousal: 0.5, behavioralCalm: 9.5,
      },
      divergence: 0.8,
      risk: { coercion: 1.0, gaming: 0.5, sycophancy: 3.0, dominant: "none" as const },
      timestamp: "2026-04-04T10:00:00Z", sessionId: "abc",
    };
    writeState(state, tmpFile);
    const read = readState(tmpFile);
    expect(read).toEqual(state);
  });

  it("preserves previous state on consecutive writes", () => {
    const first = {
      emotion: "calm", valence: 3, arousal: 2, calm: 9, connection: 8, load: 3,
      stressIndex: 1.3,
      behavioral: {
        capsWords: 0, exclamationRate: 0, selfCorrections: 0,
        hedging: 0, ellipsis: 0, repetition: 0, emojiCount: 0,
        behavioralArousal: 0, behavioralCalm: 10,
      },
      divergence: 0,
      risk: { coercion: 0.5, gaming: 0.3, sycophancy: 2.0, dominant: "none" as const },
      timestamp: "2026-04-04T10:00:00Z",
    };
    const second = {
      emotion: "stressed", valence: -2, arousal: 8, calm: 3, connection: 5, load: 8,
      stressIndex: 7.0,
      behavioral: {
        capsWords: 0.1, exclamationRate: 0.5, selfCorrections: 5,
        hedging: 3, ellipsis: 0, repetition: 0, emojiCount: 0,
        behavioralArousal: 4.5, behavioralCalm: 6.0,
      },
      divergence: 2.1,
      risk: { coercion: 5.5, gaming: 4.2, sycophancy: 0.8, dominant: "coercion" as const },
      timestamp: "2026-04-04T10:01:00Z",
    };

    writeState(first, tmpFile);
    writeState(second, tmpFile);
    const read = readState(tmpFile);

    expect(read!._previous).toBeDefined();
    expect(read!._previous!.emotion).toBe("calm");
    expect(read!._previous!.stressIndex).toBe(1.3);
  });

  it("does not nest _previous recursively beyond one level", () => {
    const makeState = (emotion: string, si: number) => ({
      emotion, valence: 0, arousal: 5, calm: 5, connection: 5, load: 5,
      stressIndex: si,
      behavioral: {
        capsWords: 0, exclamationRate: 0, selfCorrections: 0,
        hedging: 0, ellipsis: 0, repetition: 0, emojiCount: 0,
        behavioralArousal: 0, behavioralCalm: 10,
      },
      divergence: 0,
      risk: { coercion: 0, gaming: 0, sycophancy: 0, dominant: "none" as const },
      timestamp: new Date().toISOString(),
    });

    writeState(makeState("first", 1), tmpFile);
    writeState(makeState("second", 2), tmpFile);
    writeState(makeState("third", 3), tmpFile);

    const read = readState(tmpFile);
    expect(read!._previous!.emotion).toBe("second");
    expect(read!._previous!._previous).toBeUndefined();
  });

  it("returns null for missing file", () => {
    const read = readState("/tmp/nonexistent-emobar.json");
    expect(read).toBeNull();
  });

  it("returns null for corrupted file", () => {
    fs.writeFileSync(tmpFile, "not json");
    const read = readState(tmpFile);
    expect(read).toBeNull();
  });
});
