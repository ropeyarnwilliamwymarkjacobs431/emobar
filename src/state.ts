import fs from "node:fs";
import path from "node:path";
import type { EmoBarState } from "./types.js";

export function writeState(state: EmoBarState, filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Preserve previous state for delta computation (one step of history)
  const previous = readState(filePath);
  if (previous) {
    // Strip nested _previous to avoid unbounded growth
    const { _previous: _, ...clean } = previous;
    // Migration guard: fill default risk for legacy state files (pre-v3)
    if (!clean.risk) {
      clean.risk = { coercion: 0, gaming: 0, sycophancy: 0, dominant: "none" };
    }
    state._previous = clean as EmoBarState;
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
