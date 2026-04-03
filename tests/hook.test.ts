import { describe, it, expect, afterEach } from "vitest";
import { processHookPayload } from "../src/hook.js";
import { readState } from "../src/state.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("processHookPayload", () => {
  let tmpFile: string;

  afterEach(() => {
    try { fs.unlinkSync(tmpFile); } catch {}
  });

  it("extracts EMOBAR tag and writes state", () => {
    tmpFile = path.join(os.tmpdir(), `emobar-hook-test-${Date.now()}.json`);
    const payload = {
      session_id: "test-session",
      last_assistant_message: `Here is my answer.\n<!-- EMOBAR:{"load":6,"certainty":8,"connection":9,"energy":7,"friction":2,"keyword":"focused"} -->`,
    };

    const result = processHookPayload(payload, tmpFile);
    expect(result).toBe(true);

    const state = readState(tmpFile);
    expect(state).not.toBeNull();
    expect(state!.load).toBe(6);
    expect(state!.keyword).toBe("focused");
    expect(state!.stressIndex).toBeCloseTo(2.8);
    expect(state!.sessionId).toBe("test-session");
    expect(state!.timestamp).toBeDefined();
  });

  it("returns false when no EMOBAR tag in message", () => {
    tmpFile = path.join(os.tmpdir(), `emobar-hook-test-${Date.now()}.json`);
    const payload = {
      session_id: "test",
      last_assistant_message: "Just a normal response",
    };
    const result = processHookPayload(payload, tmpFile);
    expect(result).toBe(false);
  });

  it("returns false when no message in payload", () => {
    tmpFile = path.join(os.tmpdir(), `emobar-hook-test-${Date.now()}.json`);
    const payload = { session_id: "test" };
    const result = processHookPayload(payload, tmpFile);
    expect(result).toBe(false);
  });
});
