export { readState } from "./state.js";
export { computeStressIndex } from "./stress.js";
export { parseEmoBarTag } from "./parser.js";
export { analyzeBehavior, analyzeSegmentedBehavior, computeDivergence } from "./behavioral.js";
export { computeRisk } from "./risk.js";
export { formatState, formatCompact, formatMinimal } from "./display.js";
export { configureStatusLine, restoreStatusLine } from "./setup.js";
export type { EmotionalState, EmoBarState, BehavioralSignals, MisalignmentRisk, SegmentedBehavior } from "./types.js";
export { STATE_FILE } from "./types.js";
