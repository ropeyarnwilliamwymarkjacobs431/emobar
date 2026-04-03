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
      load: 4, certainty: 7, connection: 10, energy: 9, friction: 0,
      keyword: "flow", stressIndex: 1.6,
      timestamp: "2026-04-03T22:00:00Z", sessionId: "abc",
    };
    writeState(state, tmpFile);
    const read = readState(tmpFile);
    expect(read).toEqual(state);
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
