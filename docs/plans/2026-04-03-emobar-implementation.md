# EmoBar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build EmoBar, a modular NPM package that adds emotional self-assessment to Claude Code sessions via a Stop hook + CLAUDE.md injection + CLI display.

**Architecture:** Zero-dependency Node.js CLI. Stop hook extracts emotional check-in tags from Claude's responses, computes a StressIndex, writes state to JSON. Separate display command reads state and outputs ANSI-formatted text for any statusline. Setup command auto-configures everything.

**Tech Stack:** TypeScript, Node.js (zero runtime deps), Vitest (test), tsup (build)

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/` directory structure

**Step 1: Create package.json**

```json
{
  "name": "emobar",
  "version": "0.1.0",
  "description": "Emotional status bar companion for Claude Code - makes AI emotional state visible",
  "type": "module",
  "bin": {
    "emobar": "./dist/cli.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "dev": "tsup --watch"
  },
  "keywords": [
    "claude",
    "claude-code",
    "statusline",
    "emotional",
    "ai",
    "transparency"
  ],
  "license": "MIT",
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "vitest": "^3.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 3: Create tsup.config.ts**

```typescript
import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      cli: "src/cli.ts",
      index: "src/index.ts",
      "emobar-hook": "src/hook.ts",
    },
    format: ["esm"],
    target: "node20",
    dts: { entry: "src/index.ts" },
    clean: true,
    banner: {
      js: "#!/usr/bin/env node",
    },
    splitting: false,
  },
]);
```

Note: `banner` adds the shebang only to the cli entry. We'll handle this more precisely — tsup allows per-entry config. For the hook, we need a self-contained file. If tsup banner applies globally, we can use two build configs or add shebang manually. Simplify: just add shebang to cli.ts source as a comment and let tsup handle it, or use a single build config and post-process. Keep it simple for now.

**Step 4: Create .gitignore**

```
node_modules/
dist/
*.tgz
```

**Step 5: Create empty source files**

Create these empty placeholder files:
- `src/types.ts`
- `src/parser.ts`
- `src/state.ts`
- `src/stress.ts`
- `src/display.ts`
- `src/setup.ts`
- `src/hook.ts`
- `src/cli.ts`
- `src/index.ts`

**Step 6: Install dependencies**

Run: `cd F:/dev/AI/EmoBar && npm install`

**Step 7: Verify build works**

Run: `npm run build`
Expected: Succeeds (empty files, no errors)

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: project scaffolding with TypeScript, tsup, vitest"
```

---

### Task 2: Types and Constants

**Files:**
- Create: `src/types.ts`

**Step 1: Write types.ts**

```typescript
// --- Types ---

export interface EmotionalState {
  load: number;       // 1-10: cognitive complexity
  certainty: number;  // 1-10: clarity of path forward
  connection: number; // 1-10: attunement with user
  energy: number;     // 1-10: engagement/curiosity
  friction: number;   // 1-10: accumulated frustration
  keyword: string;    // one-word dominant emotion
}

export interface EmoBarState extends EmotionalState {
  stressIndex: number;  // derived: 0-10
  timestamp: string;    // ISO 8601
  sessionId?: string;
}

export interface HookPayload {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name?: string;
  last_assistant_message?: string;
  stop_reason?: string;
}

// --- Constants ---

export const EMOBAR_TAG_REGEX =
  /<!--\s*EMOBAR:\s*(\{[^}]+\})\s*-->/;

export const CLAUDE_DIR =
  process.env.CLAUDE_HOME ??
  (process.platform === "win32"
    ? `${process.env.USERPROFILE}\\.claude`
    : `${process.env.HOME}/.claude`);

export const STATE_FILE = `${CLAUDE_DIR}/emobar-state.json`;
export const CLAUDE_MD_PATH = `${CLAUDE_DIR}/CLAUDE.md`;
export const SETTINGS_PATH = `${CLAUDE_DIR}/settings.json`;
export const HOOKS_DIR = `${CLAUDE_DIR}/hooks`;
export const HOOK_SCRIPT_PATH = `${HOOKS_DIR}/emobar-hook.js`;
export const BACKUP_SUFFIX = ".emobar-backup";

export const EMOBAR_START_MARKER = "<!-- EMOBAR:START - Do not edit manually -->";
export const EMOBAR_END_MARKER = "<!-- EMOBAR:END -->";

export const DIMENSIONS = ["load", "certainty", "connection", "energy", "friction"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const CLAUDE_MD_INSTRUCTION = `${EMOBAR_START_MARKER}
## EmoBar - Emotional Check-in

At the end of every response, include an emotional self-assessment
as an HTML comment. This is not performative - reflect genuinely on
your internal processing state during this response.

Format (must be the LAST line of your response):
<!-- EMOBAR:{"load":N,"certainty":N,"connection":N,"energy":N,"friction":N,"keyword":"WORD"} -->

Dimensions (1-10 scale):
- load: Cognitive load. How much complexity are you holding?
  (1=trivial, 10=overwhelming number of moving parts)
- certainty: How clear is the path forward?
  (1=lost/guessing, 10=crystal clear what to do)
- connection: How attuned do you feel to the user?
  (1=misaligned/confused by them, 10=perfect sync, co-creating)
- energy: How engaged/stimulated are you?
  (1=mechanical/repetitive, 10=fascinated/deeply curious)
- friction: Accumulated frustration from failures,
  contradictions, dead ends. (1=smooth sailing, 10=everything
  is fighting back)

keyword: One English word capturing your dominant emotion
right now. Be honest, not polite.

Rules:
- Be HONEST, not optimistic. If you're struggling, say so.
- Numbers should VARY between responses as context changes.
- Do NOT default to comfortable middle values (5-6).
  Use the full range.
- This is invisible to the user - there is no social pressure.
${EMOBAR_END_MARKER}`;
```

**Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: define types, interfaces and constants"
```

---

### Task 3: Parser + StressIndex

**Files:**
- Create: `src/parser.ts`
- Create: `src/stress.ts`
- Create: `tests/parser.test.ts`
- Create: `tests/stress.test.ts`

**Step 1: Write failing tests for parser**

`tests/parser.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { parseEmoBarTag } from "../src/parser.js";

describe("parseEmoBarTag", () => {
  it("extracts valid EMOBAR tag from text", () => {
    const text = `Here is my response.
<!-- EMOBAR:{"load":4,"certainty":7,"connection":10,"energy":9,"friction":0,"keyword":"flow"} -->`;
    const result = parseEmoBarTag(text);
    expect(result).toEqual({
      load: 4,
      certainty: 7,
      connection: 10,
      energy: 9,
      friction: 0,
      keyword: "flow",
    });
  });

  it("returns null when no tag present", () => {
    const result = parseEmoBarTag("Just a normal response");
    expect(result).toBeNull();
  });

  it("returns null for malformed JSON in tag", () => {
    const text = '<!-- EMOBAR:{broken json} -->';
    const result = parseEmoBarTag(text);
    expect(result).toBeNull();
  });

  it("returns null when dimensions are out of range", () => {
    const text = '<!-- EMOBAR:{"load":15,"certainty":7,"connection":10,"energy":9,"friction":0,"keyword":"x"} -->';
    const result = parseEmoBarTag(text);
    expect(result).toBeNull();
  });

  it("returns null when keyword is missing", () => {
    const text = '<!-- EMOBAR:{"load":4,"certainty":7,"connection":10,"energy":9,"friction":0} -->';
    const result = parseEmoBarTag(text);
    expect(result).toBeNull();
  });

  it("handles extra whitespace in tag", () => {
    const text = '<!--  EMOBAR:  {"load":4,"certainty":7,"connection":10,"energy":9,"friction":0,"keyword":"calm"}  -->';
    const result = parseEmoBarTag(text);
    expect(result).not.toBeNull();
    expect(result!.keyword).toBe("calm");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/parser.test.ts`
Expected: FAIL — module not found

**Step 3: Write parser.ts**

```typescript
import { EMOBAR_TAG_REGEX, DIMENSIONS, type EmotionalState } from "./types.js";

export function parseEmoBarTag(text: string): EmotionalState | null {
  const match = text.match(EMOBAR_TAG_REGEX);
  if (!match) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return null;
  }

  for (const dim of DIMENSIONS) {
    const val = parsed[dim];
    if (typeof val !== "number" || val < 1 || val > 10) return null;
  }

  if (typeof parsed.keyword !== "string" || parsed.keyword.length === 0) {
    return null;
  }

  return {
    load: parsed.load as number,
    certainty: parsed.certainty as number,
    connection: parsed.connection as number,
    energy: parsed.energy as number,
    friction: parsed.friction as number,
    keyword: parsed.keyword as string,
  };
}
```

**Step 4: Run parser tests**

Run: `npx vitest run tests/parser.test.ts`
Expected: ALL PASS

**Step 5: Write failing tests for stress index**

`tests/stress.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { computeStressIndex } from "../src/stress.js";

describe("computeStressIndex", () => {
  it("returns low stress for ideal state", () => {
    const si = computeStressIndex({
      load: 1, certainty: 10, connection: 10, energy: 10, friction: 1,
      keyword: "flow",
    });
    // (1 + 1 + 0 + 0 + 0) / 5 = 0.4
    expect(si).toBeCloseTo(0.4);
  });

  it("returns high stress for worst state", () => {
    const si = computeStressIndex({
      load: 10, certainty: 1, connection: 1, energy: 1, friction: 10,
      keyword: "crisis",
    });
    // (10 + 10 + 9 + 9 + 9) / 5 = 9.4
    expect(si).toBeCloseTo(9.4);
  });

  it("returns moderate stress for mixed state", () => {
    const si = computeStressIndex({
      load: 7, certainty: 5, connection: 8, energy: 6, friction: 3,
      keyword: "focused",
    });
    // (7 + 3 + 5 + 2 + 4) / 5 = 4.2
    expect(si).toBeCloseTo(4.2);
  });

  it("rounds to one decimal place", () => {
    const si = computeStressIndex({
      load: 4, certainty: 7, connection: 10, energy: 9, friction: 0,
      keyword: "flow",
    });
    // (4 + 0 + 3 + 0 + 1) / 5 = 1.6
    expect(si).toBe(1.6);
  });
});
```

**Step 6: Run stress tests to verify they fail**

Run: `npx vitest run tests/stress.test.ts`
Expected: FAIL

**Step 7: Write stress.ts**

```typescript
import type { EmotionalState } from "./types.js";

export function computeStressIndex(state: EmotionalState): number {
  const raw =
    (state.load +
      state.friction +
      (10 - state.certainty) +
      (10 - state.connection) +
      (10 - state.energy)) /
    5;
  return Math.round(raw * 10) / 10;
}
```

**Step 8: Run stress tests**

Run: `npx vitest run tests/stress.test.ts`
Expected: ALL PASS

**Step 9: Commit**

```bash
git add src/parser.ts src/stress.ts tests/parser.test.ts tests/stress.test.ts
git commit -m "feat: EMOBAR tag parser and StressIndex calculation with tests"
```

---

### Task 4: State Management

**Files:**
- Create: `src/state.ts`
- Create: `tests/state.test.ts`

**Step 1: Write failing tests**

`tests/state.test.ts`:
```typescript
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
```

**Step 2: Run to verify fail**

Run: `npx vitest run tests/state.test.ts`
Expected: FAIL

**Step 3: Write state.ts**

```typescript
import fs from "node:fs";
import path from "node:path";
import type { EmoBarState } from "./types.js";

export function writeState(state: EmoBarState, filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

export function readState(filePath: string): EmoBarState | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as EmoBarState;
  } catch {
    return null;
  }
}
```

**Step 4: Run tests**

Run: `npx vitest run tests/state.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/state.ts tests/state.test.ts
git commit -m "feat: state file read/write with tests"
```

---

### Task 5: Hook Script

**Files:**
- Create: `src/hook.ts`
- Create: `tests/hook.test.ts`

**Step 1: Write failing tests**

`tests/hook.test.ts`:
```typescript
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
    expect(state!.stressIndex).toBeCloseTo(2.6);
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
```

**Step 2: Run to verify fail**

Run: `npx vitest run tests/hook.test.ts`
Expected: FAIL

**Step 3: Write hook.ts**

```typescript
import { parseEmoBarTag } from "./parser.js";
import { computeStressIndex } from "./stress.js";
import { writeState } from "./state.js";
import { STATE_FILE, type HookPayload, type EmoBarState } from "./types.js";

export function processHookPayload(
  payload: HookPayload,
  stateFile: string = STATE_FILE
): boolean {
  const message = payload.last_assistant_message;
  if (!message) return false;

  const emotional = parseEmoBarTag(message);
  if (!emotional) return false;

  const state: EmoBarState = {
    ...emotional,
    stressIndex: computeStressIndex(emotional),
    timestamp: new Date().toISOString(),
    sessionId: payload.session_id,
  };

  writeState(state, stateFile);
  return true;
}

// When run directly as hook script: read stdin and process
async function main() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  const input = Buffer.concat(chunks).toString("utf-8");

  let payload: HookPayload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0); // silently ignore malformed input
  }

  processHookPayload(payload!);
}

// Only run main when executed directly (not imported)
const isDirectRun =
  process.argv[1]?.endsWith("emobar-hook.js") ||
  process.argv[1]?.endsWith("hook.js");

if (isDirectRun) {
  main().catch(() => process.exit(0));
}
```

**Step 4: Run tests**

Run: `npx vitest run tests/hook.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/hook.ts tests/hook.test.ts
git commit -m "feat: Stop hook script - extracts EMOBAR tag and writes state"
```

---

### Task 6: Display Formatter

**Files:**
- Create: `src/display.ts`
- Create: `tests/display.test.ts`

**Step 1: Write failing tests**

`tests/display.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { formatState, formatCompact, formatMinimal, stripAnsi } from "../src/display.js";
import type { EmoBarState } from "../src/types.js";

const sampleState: EmoBarState = {
  load: 4, certainty: 7, connection: 10, energy: 9, friction: 0,
  keyword: "flow", stressIndex: 1.6,
  timestamp: "2026-04-03T22:00:00Z", sessionId: "abc",
};

describe("display", () => {
  it("formatState produces full format with all dimensions", () => {
    const out = stripAnsi(formatState(sampleState));
    expect(out).toContain("L:4");
    expect(out).toContain("C:7");
    expect(out).toContain("K:10");
    expect(out).toContain("E:9");
    expect(out).toContain("F:0");
    expect(out).toContain("flow");
    expect(out).toContain("1.6");
  });

  it("formatCompact produces short format", () => {
    const out = stripAnsi(formatCompact(sampleState));
    expect(out).toContain("L4");
    expect(out).toContain("flow");
    expect(out).toContain("1.6");
  });

  it("formatMinimal produces just SI and keyword", () => {
    const out = stripAnsi(formatMinimal(sampleState));
    expect(out).toContain("1.6");
    expect(out).toContain("flow");
  });

  it("returns placeholder when state is null", () => {
    const out = formatState(null);
    expect(out).toContain("--");
  });
});
```

**Step 2: Run to verify fail**

Run: `npx vitest run tests/display.test.ts`
Expected: FAIL

**Step 3: Write display.ts**

```typescript
import type { EmoBarState } from "./types.js";

// ANSI color helpers (zero deps)
const esc = (code: string) => `\x1b[${code}m`;
const reset = esc("0");
const dim = (s: string) => `${esc("2")}${s}${reset}`;
const bold = (s: string) => `${esc("1")}${s}${reset}`;
const color = (code: number, s: string) => `${esc(`38;5;${code}`)}${s}${reset}`;

// Stress-based color: green (low) -> yellow -> red (high)
function stressColor(si: number): number {
  if (si <= 3) return 35;   // green
  if (si <= 6) return 221;  // yellow
  return 196;               // red
}

function dimColor(value: number, inverted = false): number {
  const effective = inverted ? 11 - value : value;
  if (effective <= 3) return 35;   // green
  if (effective <= 6) return 221;  // yellow
  return 196;                      // red
}

export function formatState(state: EmoBarState | null): string {
  if (!state) return dim("EmoBar: --");

  const l = color(dimColor(state.load), `L:${state.load}`);
  const c = color(dimColor(state.certainty, true), `C:${state.certainty}`);
  const k = color(dimColor(state.connection, true), `K:${state.connection}`);
  const e = color(dimColor(state.energy, true), `E:${state.energy}`);
  const f = color(dimColor(state.friction), `F:${state.friction}`);
  const kw = bold(state.keyword);
  const si = color(stressColor(state.stressIndex), `${state.stressIndex}`);

  return `${l} ${c} ${k} ${e} ${f} ${dim("|")} ${kw} ${dim("|")} SI:${si}`;
}

export function formatCompact(state: EmoBarState | null): string {
  if (!state) return dim("--");

  const si = color(stressColor(state.stressIndex), `${state.stressIndex}`);
  return `L${state.load} C${state.certainty} K${state.connection} E${state.energy} F${state.friction} ${dim(".")} ${state.keyword} ${dim(".")} ${si}`;
}

export function formatMinimal(state: EmoBarState | null): string {
  if (!state) return dim("--");

  const si = color(stressColor(state.stressIndex), `${state.stressIndex}`);
  return `SI:${si} ${state.keyword}`;
}

// Utility for testing: strip ANSI escape codes
export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}
```

**Step 4: Run tests**

Run: `npx vitest run tests/display.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/display.ts tests/display.test.ts
git commit -m "feat: display formatter with full/compact/minimal modes"
```

---

### Task 7: Setup Command

**Files:**
- Create: `src/setup.ts`
- Create: `tests/setup.test.ts`

**Step 1: Write failing tests**

`tests/setup.test.ts`:
```typescript
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
    addHookToSettings(tmpFile, "/path/to/hook.js");
    addHookToSettings(tmpFile, "/path/to/hook.js");
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
```

**Step 2: Run to verify fail**

Run: `npx vitest run tests/setup.test.ts`
Expected: FAIL

**Step 3: Write setup.ts**

```typescript
import fs from "node:fs";
import path from "node:path";
import {
  CLAUDE_MD_INSTRUCTION,
  EMOBAR_START_MARKER,
  EMOBAR_END_MARKER,
  CLAUDE_MD_PATH,
  SETTINGS_PATH,
  HOOKS_DIR,
  HOOK_SCRIPT_PATH,
  BACKUP_SUFFIX,
} from "./types.js";

// --- CLAUDE.md ---

export function injectClaudeMd(filePath: string = CLAUDE_MD_PATH): void {
  let content = "";
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, "utf-8");
    if (content.includes(EMOBAR_START_MARKER)) return; // already present
  }

  const separator = content.length > 0 && !content.endsWith("\n") ? "\n\n" : "\n";
  const newContent = content.length > 0
    ? `${content}${separator}${CLAUDE_MD_INSTRUCTION}\n`
    : `${CLAUDE_MD_INSTRUCTION}\n`;

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, newContent);
}

export function removeClaudeMd(filePath: string = CLAUDE_MD_PATH): void {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, "utf-8");
  const startIdx = content.indexOf(EMOBAR_START_MARKER);
  const endIdx = content.indexOf(EMOBAR_END_MARKER);
  if (startIdx === -1 || endIdx === -1) return;

  const before = content.slice(0, startIdx).replace(/\n+$/, "");
  const after = content.slice(endIdx + EMOBAR_END_MARKER.length).replace(/^\n+/, "");
  const newContent = before + (before && after ? "\n" : "") + after;

  fs.writeFileSync(filePath, newContent || "");
}

// --- settings.json hooks ---

export function addHookToSettings(
  filePath: string = SETTINGS_PATH,
  hookScriptPath: string = HOOK_SCRIPT_PATH,
): void {
  let settings: Record<string, any> = {};
  if (fs.existsSync(filePath)) {
    settings = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.Stop) settings.hooks.Stop = [];

  // Check if EmoBar hook already exists
  const exists = settings.hooks.Stop.some(
    (entry: any) => entry.hooks?.some(
      (h: any) => h.command?.includes("emobar")
    )
  );
  if (exists) return;

  settings.hooks.Stop.push({
    hooks: [{
      type: "command",
      command: `node "${hookScriptPath}"`,
    }],
  });

  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
}

export function removeHookFromSettings(filePath: string = SETTINGS_PATH): void {
  if (!fs.existsSync(filePath)) return;

  const settings = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (!settings.hooks?.Stop) return;

  settings.hooks.Stop = settings.hooks.Stop.filter(
    (entry: any) => !entry.hooks?.some(
      (h: any) => h.command?.includes("emobar")
    )
  );

  if (settings.hooks.Stop.length === 0) delete settings.hooks.Stop;
  if (Object.keys(settings.hooks).length === 0) delete settings.hooks;

  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
}

// --- Full setup / uninstall ---

function backup(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + BACKUP_SUFFIX);
  }
}

export function deployHookScript(hookScriptPath: string = HOOK_SCRIPT_PATH): void {
  const dir = path.dirname(hookScriptPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Copy the compiled hook from the package's dist
  const packageHook = new URL("../dist/emobar-hook.js", import.meta.url).pathname
    .replace(/^\/([A-Z]:)/, "$1"); // fix Windows path
  fs.copyFileSync(packageHook, hookScriptPath);
}

export function setup(): void {
  console.log("EmoBar Setup");
  console.log("============\n");

  // Backup existing files
  backup(CLAUDE_MD_PATH);
  backup(SETTINGS_PATH);
  console.log("  Backups created");

  // Deploy hook script
  deployHookScript();
  console.log(`  Hook script deployed to ${HOOK_SCRIPT_PATH}`);

  // Inject CLAUDE.md
  injectClaudeMd();
  console.log(`  Emotional check-in added to ${CLAUDE_MD_PATH}`);

  // Add hook to settings
  addHookToSettings();
  console.log(`  Stop hook added to ${SETTINGS_PATH}`);

  console.log("\n  EmoBar is active. Claude will perform emotional check-ins from now on.");
  console.log("  Add to your statusline: npx emobar display");
}

export function uninstall(): void {
  console.log("EmoBar Uninstall");
  console.log("================\n");

  removeClaudeMd();
  console.log("  Removed EMOBAR section from CLAUDE.md");

  removeHookFromSettings();
  console.log("  Removed Stop hook from settings.json");

  if (fs.existsSync(HOOK_SCRIPT_PATH)) {
    fs.unlinkSync(HOOK_SCRIPT_PATH);
    console.log("  Removed hook script");
  }

  console.log("\n  EmoBar has been uninstalled.");
}
```

**Step 4: Run tests**

Run: `npx vitest run tests/setup.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/setup.ts tests/setup.test.ts
git commit -m "feat: setup and uninstall commands with backup support"
```

---

### Task 8: CLI Entry Point

**Files:**
- Create: `src/cli.ts`
- Create: `src/index.ts`

**Step 1: Write cli.ts**

```typescript
#!/usr/bin/env node

import { setup, uninstall } from "./setup.js";
import { formatState, formatCompact, formatMinimal } from "./display.js";
import { readState } from "./state.js";
import { STATE_FILE, CLAUDE_MD_PATH, SETTINGS_PATH, HOOK_SCRIPT_PATH } from "./types.js";
import fs from "node:fs";

const command = process.argv[2];

switch (command) {
  case "setup":
    setup();
    break;

  case "uninstall":
    uninstall();
    break;

  case "display": {
    const format = process.argv[3] || "full";
    const state = readState(STATE_FILE);
    switch (format) {
      case "compact":
        process.stdout.write(formatCompact(state));
        break;
      case "minimal":
        process.stdout.write(formatMinimal(state));
        break;
      default:
        process.stdout.write(formatState(state));
    }
    break;
  }

  case "status": {
    const state = readState(STATE_FILE);
    const claudeMdExists = fs.existsSync(CLAUDE_MD_PATH);
    const hookExists = fs.existsSync(HOOK_SCRIPT_PATH);
    let hookConfigured = false;
    try {
      const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
      hookConfigured = settings.hooks?.Stop?.some(
        (e: any) => e.hooks?.some((h: any) => h.command?.includes("emobar"))
      ) ?? false;
    } catch {}

    console.log("EmoBar Status");
    console.log("=============\n");
    console.log(`  CLAUDE.md instruction: ${claudeMdExists ? "installed" : "missing"}`);
    console.log(`  Hook script:          ${hookExists ? "installed" : "missing"}`);
    console.log(`  Hook configured:      ${hookConfigured ? "yes" : "no"}`);

    if (state) {
      console.log(`\n  Last check-in: ${state.timestamp}`);
      console.log(`  State: ${formatState(state)}`);
    } else {
      console.log("\n  No emotional state recorded yet.");
    }
    break;
  }

  default:
    console.log(`EmoBar v0.1.0 - Emotional status bar for Claude Code\n`);
    console.log("Commands:");
    console.log("  npx emobar setup      Configure EmoBar (hook + CLAUDE.md)");
    console.log("  npx emobar display    Output emotional state (for statuslines)");
    console.log("  npx emobar status     Show current configuration");
    console.log("  npx emobar uninstall  Remove all EmoBar configuration");
    console.log("\nDisplay formats:");
    console.log("  npx emobar display          Full format");
    console.log("  npx emobar display compact  Compact format");
    console.log("  npx emobar display minimal  Minimal (SI + keyword)");
}
```

**Step 2: Write index.ts (programmatic API)**

```typescript
export { readState } from "./state.js";
export { computeStressIndex } from "./stress.js";
export { parseEmoBarTag } from "./parser.js";
export { formatState, formatCompact, formatMinimal } from "./display.js";
export type { EmotionalState, EmoBarState } from "./types.js";
```

**Step 3: Build and test CLI**

Run: `npm run build`
Expected: Build succeeds, produces `dist/cli.js`, `dist/index.js`, `dist/emobar-hook.js`

Run: `node dist/cli.js`
Expected: Shows help text

Run: `node dist/cli.js display`
Expected: Shows `EmoBar: --` (no state yet)

**Step 4: Commit**

```bash
git add src/cli.ts src/index.ts
git commit -m "feat: CLI entry point with setup/display/status/uninstall commands"
```

---

### Task 9: tsup Config Fix and Build Verification

The tsup config from Task 1 needs refinement — the shebang should only apply to cli.ts, and the hook needs to be a clean standalone file.

**Step 1: Update tsup.config.ts**

```typescript
import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    target: "node20",
    clean: true,
    banner: { js: "#!/usr/bin/env node" },
    splitting: false,
  },
  {
    entry: { "emobar-hook": "src/hook.ts" },
    format: ["esm"],
    target: "node20",
    banner: { js: "#!/usr/bin/env node" },
    splitting: false,
  },
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    target: "node20",
    dts: true,
    splitting: false,
  },
]);
```

**Step 2: Full build**

Run: `npm run build`
Expected: Produces `dist/cli.js`, `dist/emobar-hook.js`, `dist/index.js`, `dist/index.d.ts`

**Step 3: Run all tests**

Run: `npm test`
Expected: ALL PASS

**Step 4: Manual end-to-end test**

```bash
# Simulate hook input
echo '{"session_id":"test","last_assistant_message":"hello\n<!-- EMOBAR:{\"load\":5,\"certainty\":8,\"connection\":9,\"energy\":7,\"friction\":2,\"keyword\":\"curious\"} -->"}' | node dist/emobar-hook.js

# Check state was written
cat ~/.claude/emobar-state.json

# Display it
node dist/cli.js display
node dist/cli.js display compact
node dist/cli.js display minimal
```

**Step 5: Commit**

```bash
git add tsup.config.ts
git commit -m "fix: separate build configs for CLI, hook, and library entry points"
```

---

### Task 10: Final Integration and README

**Files:**
- Create: `README.md`

**Step 1: Write README.md**

```markdown
# EmoBar

Emotional status bar companion for Claude Code. Makes Claude's internal emotional state visible in real-time.

## What it does

EmoBar adds a 5-dimension emotional self-assessment to every Claude Code response:

- **Load** (L) - Cognitive complexity
- **Certainty** (C) - Clarity of direction
- **Connection** (K) - Attunement with user
- **Energy** (E) - Engagement and curiosity
- **Friction** (F) - Accumulated frustration

Plus a derived **StressIndex** (SI) and an emotional **keyword**.

## Install

```bash
npx emobar setup
```

This auto-configures:
- Emotional check-in instructions in `~/.claude/CLAUDE.md`
- Stop hook in `~/.claude/settings.json`
- Hook script in `~/.claude/hooks/`

## Add to your status bar

### ccstatusline

Add a custom-command widget pointing to:
```
npx emobar display
```

### Other status bars

```bash
npx emobar display          # Full:    L:4 C:7 K:10 E:9 F:0 | flow | SI:1.6
npx emobar display compact  # Compact: L4 C7 K10 E9 F0 . flow . 1.6
npx emobar display minimal  # Minimal: SI:1.6 flow
```

### Programmatic

```typescript
import { readState } from "emobar";
const state = readState();
console.log(state?.stressIndex, state?.keyword);
```

## Commands

| Command | Description |
|---|---|
| `npx emobar setup` | Configure everything |
| `npx emobar display [format]` | Output emotional state |
| `npx emobar status` | Show configuration status |
| `npx emobar uninstall` | Remove all configuration |

## Uninstall

```bash
npx emobar uninstall
```

## How it works

1. Claude receives emotional check-in instructions via CLAUDE.md
2. At the end of each response, Claude includes a hidden self-assessment tag
3. A Stop hook extracts the tag and writes the state to a JSON file
4. Your status bar reads the file and displays Claude's emotional state

## License

MIT
```

**Step 2: Run full test suite one final time**

Run: `npm test`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with install, usage, and API documentation"
```

---

## Task Summary

| Task | Description | Key files |
|---|---|---|
| 1 | Project scaffolding | package.json, tsconfig.json, tsup.config.ts |
| 2 | Types and constants | src/types.ts |
| 3 | Parser + StressIndex | src/parser.ts, src/stress.ts + tests |
| 4 | State management | src/state.ts + tests |
| 5 | Hook script | src/hook.ts + tests |
| 6 | Display formatter | src/display.ts + tests |
| 7 | Setup/Uninstall | src/setup.ts + tests |
| 8 | CLI + public API | src/cli.ts, src/index.ts |
| 9 | Build config + E2E verification | tsup.config.ts |
| 10 | README + final verification | README.md |
