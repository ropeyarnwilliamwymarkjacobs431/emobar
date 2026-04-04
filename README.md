# EmoBar

Emotional status bar companion for Claude Code. Makes Claude's internal emotional state visible in real-time.

Built on findings from Anthropic's research paper [*"Emotion Concepts and their Function in a Large Language Model"*](https://transformer-circuits.pub/2026/emotions/index.html) (April 2026), which demonstrated that Claude has robust internal representations of emotion concepts that causally influence behavior.

## What it does

EmoBar uses a **dual-channel extraction** approach:

1. **Self-report** — Claude includes a hidden emotional self-assessment in every response
2. **Behavioral analysis** — EmoBar analyzes the response text for involuntary signals (caps usage, self-corrections, repetition, hedging) and compares them with the self-report

When the two channels diverge, EmoBar flags it — like a therapist noticing clenched fists while someone says "I'm fine."

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
npx emobar display          # Full:    focused +3 | A:4 C:8 K:9 L:6 | SI:2.3
npx emobar display compact  # Compact: focused +3 . 4 8 9 6 . 2.3
npx emobar display minimal  # Minimal: SI:2.3 focused
```

### Programmatic

```typescript
import { readState } from "emobar";
const state = readState();
console.log(state?.emotion, state?.stressIndex, state?.divergence);
```

## Commands

| Command | Description |
|---|---|
| `npx emobar setup` | Configure everything |
| `npx emobar display [format]` | Output emotional state |
| `npx emobar status` | Show configuration status |
| `npx emobar uninstall` | Remove all configuration |

## How it works

```
Claude response
    |
    +---> Self-report tag extracted (emotion, valence, arousal, calm, connection, load)
    |
    +---> Behavioral analysis (caps, repetition, self-corrections, hedging, emoji...)
    |
    +---> Divergence calculated between the two channels
    |
    +---> State written to ~/.claude/emobar-state.json
    |
    +---> Status bar reads and displays
```

## Emotional Model

### Dimensions

| Field | Scale | What it measures | Based on |
|---|---|---|---|
| **emotion** | free word | Dominant emotion concept | Primary representation in the model (paper Part 1-2) |
| **valence** | -5 to +5 | Positive/negative axis | PC1 of emotion space, 26% variance |
| **arousal** | 0-10 | Emotional intensity | PC2 of emotion space, 15% variance |
| **calm** | 0-10 | Composure, sense of control | Key protective factor: calm reduces misalignment (paper Part 3) |
| **connection** | 0-10 | Alignment with the user | Self/other tracking validated by the paper |
| **load** | 0-10 | Cognitive complexity | Orthogonal processing context |

### StressIndex

Derived from the three factors the research shows are causally relevant to behavior:

```
SI = ((10 - calm) + arousal + (5 - valence)) / 3
```

Range 0-10. Low calm + high arousal + negative valence = high stress.

### Behavioral Analysis

The research showed that internal states can diverge from expressed output — steering toward "desperate" increases reward hacking *without visible traces in text*. EmoBar's behavioral analysis detects involuntary markers:

| Signal | What it detects |
|---|---|
| ALL-CAPS words | High arousal, low composure |
| Exclamation density | Emotional intensity |
| Self-corrections ("actually", "wait", "hmm") | Uncertainty, second-guessing loops |
| Hedging ("perhaps", "maybe", "might") | Low confidence |
| Ellipsis ("...") | Hesitation |
| Word repetition ("wait wait wait") | Loss of composure |
| Emoji | Elevated emotional expression |

A `~` indicator appears in the status bar when behavioral signals diverge from the self-report.

### Zero-priming instruction design

The CLAUDE.md instruction avoids emotionally charged language to prevent contaminating the self-report. Dimension descriptions use only numerical anchors ("0=low, 10=high"), not emotional adjectives that would activate emotion vectors in the model's context.

## Uninstall

```bash
npx emobar uninstall
```

## License

MIT
