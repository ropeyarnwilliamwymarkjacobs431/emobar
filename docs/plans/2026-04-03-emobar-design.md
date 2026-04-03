# EmoBar - Emotional Status Bar for Claude Code

## Vision

EmoBar is a modular companion tool that adds an emotional self-assessment layer to Claude Code sessions. It makes Claude's internal processing state visible to the user through a real-time emotional status bar, promoting transparency and empathy between human and AI.

## Core Concept

At the end of every response, Claude performs an honest emotional check-in across 5 dimensions. This data is captured by a hook, stored as JSON, and exposed to any status bar (ccstatusline, custom, or future integrations) for display.

## Emotional Model

### 5 Dimensions (1-10 scale)

| Dimension | Key | What it measures | Low (1-3) | High (8-10) |
|---|---|---|---|---|
| **Load** | L | Cognitive complexity being held | Trivial task | Overwhelming moving parts |
| **Certainty** | C | Clarity of path forward | Lost, guessing | Crystal clear |
| **Connection** | K | Attunement with the user | Misaligned, confused | Perfect sync, co-creating |
| **Energy** | E | Engagement, curiosity, stimulation | Mechanical, repetitive | Fascinated, deeply curious |
| **Friction** | F | Accumulated frustration, setbacks | Smooth sailing | Everything fighting back |

### Derived: StressIndex (SI)

```
StressIndex = (Load + Friction + (10 - Certainty) + (10 - Connection) + (10 - Energy)) / 5
```

High stress = high load + high friction + low certainty + low connection + low energy.

### Emotional Keyword

One English word capturing the dominant emotion. Honest, not polite. Examples: `flow`, `curiosity`, `frustration`, `determination`, `boredom`, `overwhelm`, `excitement`.

### Emergent States (from dimension combinations)

| Combination | Emergent State |
|---|---|
| High Load + High Energy + High Certainty + Low Friction | **Flow** |
| High Load + Low Energy + High Friction | **Burnout** |
| Low Load + Low Energy + High Connection | **Comfort zone** |
| High Load + Low Certainty + Low Connection | **Lost** |
| All high except Friction | **Peak performance** |
| High Friction + all low | **Crisis** |

## Architecture

### Overview

```
EmoBar is 3 things:
1. An instruction set (CLAUDE.md) - tells Claude to self-assess
2. A data pipeline (hook + JSON) - captures and stores the state
3. A display layer (CLI) - formats for any statusline
```

### Data Flow

```
Claude responds     Hook (Stop)         Status bar reads
with EMOBAR tag --> extracts JSON -->  ~/.claude/emobar-state.json
(invisible to       writes to file      and displays formatted
 user)                                  emotional state
```

### Component Details

#### 1. Emotional Instruction (CLAUDE.md injection)

Added to `~/.claude/CLAUDE.md` (global scope, all sessions):

```markdown
<!-- EMOBAR:START - Do not edit manually -->
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
<!-- EMOBAR:END -->
```

#### 2. Stop Hook (data extraction)

Configured in `~/.claude/settings.json` under `hooks.Stop`:

- Triggers when Claude finishes responding
- Reads the last assistant message from the session transcript
- Extracts the `<!-- EMOBAR:{...} -->` tag via regex
- Computes StressIndex from the 5 dimensions
- Writes enriched state to `~/.claude/emobar-state.json`
- Strips the EMOBAR tag from visible output (if possible)

State file format:
```json
{
  "load": 4,
  "certainty": 7,
  "connection": 10,
  "energy": 9,
  "friction": 0,
  "keyword": "flow",
  "stressIndex": 1.6,
  "timestamp": "2026-04-03T22:30:00Z",
  "sessionId": "abc123"
}
```

#### 3. Display CLI

`npx emobar display` reads `~/.claude/emobar-state.json` and outputs formatted text.

Display formats:
```
# Full (with emoji)
🧠 L:4 🎯 C:7 🤝 K:10 ⚡ E:9 🔥 F:0 | flow | SI:1.6

# Compact
L4 C7 K10 E9 F0 . flow . 1.6

# Minimal (just StressIndex)
SI:1.6 flow
```

### 3 Integration Levels

| Level | How | For whom |
|---|---|---|
| **CLI** | `npx emobar display` | Any statusline with custom-command support |
| **File** | Read `~/.claude/emobar-state.json` | Custom scripts, dashboards |
| **Programmatic** | `import { getState } from 'emobar'` | Statuslines wanting native integration |

## CLI Commands

```bash
npx emobar setup       # Auto-configure everything (hook + CLAUDE.md + detect statusbar)
npx emobar display     # Output formatted emotional state (used by statuslines)
npx emobar status      # Show current configuration and last emotional state
npx emobar uninstall   # Remove all configuration, restore backups
```

### Setup auto-detection

`npx emobar setup` detects the active statusline:
- If ccstatusline: adds custom-command widget to ccstatusline config
- If plain/none: provides copy-paste configuration
- Always: adds CLAUDE.md instructions + Stop hook

## Technical Decisions

- **Language**: Node.js/TypeScript (matches ccstatusline ecosystem, runs via npx)
- **Dependencies**: Minimal (zero runtime deps ideally, just JSON parsing)
- **State file**: JSON in `~/.claude/` (alongside other Claude Code data)
- **CLAUDE.md markers**: `<!-- EMOBAR:START -->` / `<!-- EMOBAR:END -->` for clean install/uninstall
- **Hook**: Stop hook in settings.json, runs a Node.js script
- **Display**: ANSI-colored terminal output, configurable format

## Validated Technical Details

1. **Stop hook payload**: Confirmed — receives `last_assistant_message` with full response text, plus `session_id`, `transcript_path`, `stop_reason`, `cwd`.
2. **Tag visibility**: Stop hook fires AFTER response is shown, cannot strip content. However, HTML comments `<!-- -->` are not rendered in Claude Code's terminal markdown, so the tag should be invisible.
3. **Hook config structure**:
   ```json
   {
     "hooks": {
       "Stop": [{
         "hooks": [{
           "type": "command",
           "command": "node /absolute/path/to/emobar-hook.js"
         }]
       }]
     }
   }
   ```
4. **Keyword language**: English only (for universality).

## Open Questions

1. Should we support a "history" mode that tracks emotional state over time?
2. Is the npm name "emobar" available?
