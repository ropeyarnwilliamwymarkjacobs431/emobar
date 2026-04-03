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
