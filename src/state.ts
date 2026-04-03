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
