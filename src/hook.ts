import { parseEmoBarTag } from "./parser.js";
import { computeStressIndex } from "./stress.js";
import { analyzeBehavior, analyzeSegmentedBehavior, computeDivergence } from "./behavioral.js";
import { computeRisk } from "./risk.js";
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

  const behavioral = analyzeBehavior(message);
  const divergence = computeDivergence(emotional, behavioral);
  const segmented = analyzeSegmentedBehavior(message);

  const state: EmoBarState = {
    ...emotional,
    stressIndex: computeStressIndex(emotional),
    behavioral,
    divergence,
    risk: computeRisk(emotional, behavioral),
    ...(segmented && { segmented }),
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
    process.exit(0);
    return; // unreachable, but makes control flow explicit
  }

  processHookPayload(payload);
}

// Only run main when executed directly (not imported)
const isDirectRun =
  process.argv[1]?.endsWith("emobar-hook.js") ||
  process.argv[1]?.endsWith("hook.js");

if (isDirectRun) {
  main().catch(() => process.exit(0));
}
