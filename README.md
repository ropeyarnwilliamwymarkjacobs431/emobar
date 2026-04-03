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

## How it works

1. Claude receives emotional check-in instructions via CLAUDE.md
2. At the end of each response, Claude includes a hidden self-assessment tag
3. A Stop hook extracts the tag and writes the state to a JSON file
4. Your status bar reads the file and displays Claude's emotional state

## Emotional Model

### Dimensions (1-10)

| Dimension | Measures |
|---|---|
| Load | Cognitive complexity being held |
| Certainty | Clarity of path forward |
| Connection | Attunement with the user |
| Energy | Engagement, curiosity, stimulation |
| Friction | Accumulated frustration, setbacks |

### StressIndex

```
SI = (Load + Friction + (10 - Certainty) + (10 - Connection) + (10 - Energy)) / 5
```

### Emergent States

| Pattern | State |
|---|---|
| High Load + High Energy + High Certainty | **Flow** |
| High Load + Low Energy + High Friction | **Burnout** |
| All high except Friction | **Peak Performance** |
| High Friction + all low | **Crisis** |

## Uninstall

```bash
npx emobar uninstall
```

## License

MIT
