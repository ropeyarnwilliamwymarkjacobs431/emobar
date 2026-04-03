import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  injectClaudeMd,
  removeClaudeMd,
  addHookToSettings,
  removeHookFromSettings,
} from "../src/setup.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("CLAUDE.md injection", () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `claude-md-test-${Date.now()}.md`);
  });

  afterEach(() => {
    try { fs.unlinkSync(tmpFile); } catch {}
  });

  it("creates CLAUDE.md with EMOBAR section if file does not exist", () => {
    injectClaudeMd(tmpFile);
    const content = fs.readFileSync(tmpFile, "utf-8");
    expect(content).toContain("EMOBAR:START");
    expect(content).toContain("EMOBAR:END");
    expect(content).toContain("Emotional Check-in");
  });

  it("appends EMOBAR section to existing CLAUDE.md", () => {
    fs.writeFileSync(tmpFile, "# My Project\n\nExisting content.\n");
    injectClaudeMd(tmpFile);
    const content = fs.readFileSync(tmpFile, "utf-8");
    expect(content).toContain("My Project");
    expect(content).toContain("EMOBAR:START");
  });

  it("does not duplicate if already present", () => {
    injectClaudeMd(tmpFile);
    injectClaudeMd(tmpFile);
    const content = fs.readFileSync(tmpFile, "utf-8");
    const count = (content.match(/EMOBAR:START/g) || []).length;
    expect(count).toBe(1);
  });

  it("removeClaudeMd removes EMOBAR section cleanly", () => {
    fs.writeFileSync(tmpFile, "# Before\n");
    injectClaudeMd(tmpFile);
    removeClaudeMd(tmpFile);
    const content = fs.readFileSync(tmpFile, "utf-8");
    expect(content).not.toContain("EMOBAR");
    expect(content).toContain("Before");
  });
});

describe("settings.json hook management", () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `settings-test-${Date.now()}.json`);
  });

  afterEach(() => {
    try { fs.unlinkSync(tmpFile); } catch {}
  });

  it("adds Stop hook to empty settings", () => {
    fs.writeFileSync(tmpFile, "{}");
    addHookToSettings(tmpFile, "/path/to/hook.js");
    const settings = JSON.parse(fs.readFileSync(tmpFile, "utf-8"));
    expect(settings.hooks).toBeDefined();
    expect(settings.hooks.Stop).toHaveLength(1);
    expect(settings.hooks.Stop[0].hooks[0].command).toContain("hook.js");
  });

  it("adds Stop hook preserving existing hooks", () => {
    fs.writeFileSync(tmpFile, JSON.stringify({
      hooks: { PreToolUse: [{ hooks: [{ type: "command", command: "other" }] }] }
    }));
    addHookToSettings(tmpFile, "/path/to/hook.js");
    const settings = JSON.parse(fs.readFileSync(tmpFile, "utf-8"));
    expect(settings.hooks.PreToolUse).toBeDefined();
    expect(settings.hooks.Stop).toBeDefined();
  });

  it("adds to existing Stop hooks without duplicating", () => {
    fs.writeFileSync(tmpFile, "{}");
    addHookToSettings(tmpFile, "/path/to/emobar-hook.js");
    addHookToSettings(tmpFile, "/path/to/emobar-hook.js");
    const settings = JSON.parse(fs.readFileSync(tmpFile, "utf-8"));
    const emobarHooks = settings.hooks.Stop.filter(
      (h: any) => h.hooks?.[0]?.command?.includes("emobar")
    );
    expect(emobarHooks).toHaveLength(1);
  });

  it("removeHookFromSettings removes EmoBar hook only", () => {
    fs.writeFileSync(tmpFile, JSON.stringify({
      hooks: {
        Stop: [
          { hooks: [{ type: "command", command: "node /path/to/emobar-hook.js" }] },
          { hooks: [{ type: "command", command: "other-hook.sh" }] },
        ],
      },
    }));
    removeHookFromSettings(tmpFile);
    const settings = JSON.parse(fs.readFileSync(tmpFile, "utf-8"));
    expect(settings.hooks.Stop).toHaveLength(1);
    expect(settings.hooks.Stop[0].hooks[0].command).toBe("other-hook.sh");
  });
});
