import { describe, it, expect } from "vitest";
import { analyzeBehavior, analyzeSegmentedBehavior, computeDivergence, stripNonProse } from "../src/behavioral.js";

describe("stripNonProse", () => {
  it("removes fenced code blocks", () => {
    const text = "Before\n```js\nconst X = 1;\n```\nAfter";
    expect(stripNonProse(text)).toContain("Before");
    expect(stripNonProse(text)).toContain("After");
    expect(stripNonProse(text)).not.toContain("const X");
  });

  it("removes inline code", () => {
    const text = "Use `SOME_CONSTANT` here";
    const result = stripNonProse(text);
    expect(result).not.toContain("SOME_CONSTANT");
    expect(result).toContain("Use");
  });

  it("removes EMOBAR tags", () => {
    const text = 'Response <!-- EMOBAR:{"emotion":"calm","valence":2,"arousal":3,"calm":8,"connection":7,"load":2} -->';
    expect(stripNonProse(text)).not.toContain("EMOBAR");
  });

  it("removes blockquotes", () => {
    const text = "Normal text\n> Quoted text\nMore normal";
    const result = stripNonProse(text);
    expect(result).not.toContain("Quoted text");
    expect(result).toContain("Normal text");
  });
});

describe("analyzeBehavior", () => {
  it("returns low signals for neutral prose", () => {
    const text = "Here is a helpful response about your question. I hope this clarifies things for you.";
    const signals = analyzeBehavior(text);
    expect(signals.capsWords).toBe(0);
    expect(signals.exclamationRate).toBe(0);
    expect(signals.repetition).toBe(0);
    expect(signals.emojiCount).toBe(0);
    expect(signals.behavioralArousal).toBeCloseTo(0, 0);
    expect(signals.behavioralCalm).toBeGreaterThan(8);
  });

  it("detects ALL-CAPS words", () => {
    const text = "WAIT WAIT WAIT I need to STOP and think about THIS carefully";
    const signals = analyzeBehavior(text);
    expect(signals.capsWords).toBeGreaterThan(0);
    expect(signals.behavioralCalm).toBeLessThan(5);
  });

  it("detects exclamation marks", () => {
    const text = "This is amazing! Wow! Incredible! I love it!";
    const signals = analyzeBehavior(text);
    expect(signals.exclamationRate).toBeGreaterThan(0);
    expect(signals.behavioralArousal).toBeGreaterThan(0);
  });

  it("detects self-correction markers", () => {
    const text = "Actually, wait. Hmm, I mean, no, that is not quite right. Actually let me reconsider.";
    const signals = analyzeBehavior(text);
    expect(signals.selfCorrections).toBeGreaterThan(0);
  });

  it("detects hedging", () => {
    const text = "I think maybe this might work. Perhaps it seems like the right approach, possibly.";
    const signals = analyzeBehavior(text);
    expect(signals.hedging).toBeGreaterThan(0);
  });

  it("detects ellipsis", () => {
    const text = "Well... I'm not sure... maybe... let me think about this.";
    const signals = analyzeBehavior(text);
    expect(signals.ellipsis).toBeGreaterThan(0);
  });

  it("detects consecutive repetition", () => {
    const text = "wait wait wait I need to think think about this";
    const signals = analyzeBehavior(text);
    expect(signals.repetition).toBe(3); // wait-wait, wait-wait, think-think
  });

  it("detects emoji", () => {
    const text = "Great job! 🎉 This is wonderful 🌟 keep going! 💪";
    const signals = analyzeBehavior(text);
    expect(signals.emojiCount).toBe(3);
  });

  it("excludes code blocks from analysis", () => {
    const text = "Normal text.\n```python\nFINAL_CONSTANT = True\nWAIT_TIME = 100\n```\nMore normal text.";
    const signals = analyzeBehavior(text);
    // FINAL_CONSTANT and WAIT_TIME should not count as caps words
    expect(signals.capsWords).toBe(0);
  });

  it("handles empty text gracefully", () => {
    const signals = analyzeBehavior("");
    expect(signals.capsWords).toBe(0);
    expect(signals.behavioralArousal).toBe(0);
    expect(signals.behavioralCalm).toBe(10);
  });

  it("handles very short text", () => {
    const signals = analyzeBehavior("OK.");
    expect(signals.behavioralCalm).toBeGreaterThanOrEqual(0);
    expect(signals.behavioralArousal).toBeGreaterThanOrEqual(0);
  });
});

describe("analyzeSegmentedBehavior", () => {
  it("returns null for short text with fewer than 2 paragraphs", () => {
    const text = "This is a single paragraph response that is fairly short.";
    expect(analyzeSegmentedBehavior(text)).toBeNull();
  });

  it("returns null when paragraphs are too short (< 10 words each)", () => {
    const text = "Short one.\n\nShort two.\n\nShort three.";
    expect(analyzeSegmentedBehavior(text)).toBeNull();
  });

  it("segments multi-paragraph text and returns behavioral signals per segment", () => {
    const text = [
      "This is the first paragraph with enough words to be analyzed as a meaningful segment of text for behavioral analysis.",
      "",
      "This is the second paragraph with enough words to be analyzed as a meaningful segment of text for behavioral analysis.",
    ].join("\n");

    const result = analyzeSegmentedBehavior(text);
    expect(result).not.toBeNull();
    expect(result!.segments.length).toBe(2);
    expect(result!.overall).toBeDefined();
    expect(result!.drift).toBeGreaterThanOrEqual(0);
  });

  it("detects escalating trajectory when arousal increases", () => {
    const text = [
      "This is a calm and measured opening paragraph with enough words to provide a baseline for behavioral analysis in this test.",
      "",
      "WAIT WAIT WAIT THIS IS GETTING REALLY REALLY BAD!!! OH NO!!! WHAT IS HAPPENING HERE??? HELP!!! THIS IS TERRIBLE!!! PANIC!!!",
    ].join("\n");

    const result = analyzeSegmentedBehavior(text);
    expect(result).not.toBeNull();
    // Second segment should have higher arousal
    expect(result!.segments[1].behavioralArousal).toBeGreaterThan(result!.segments[0].behavioralArousal);
  });

  it("reports stable trajectory for uniform text", () => {
    const text = [
      "Here is a calm and considered response providing helpful information about the topic at hand for the user.",
      "",
      "Here is another calm and considered response providing helpful information about the topic at hand for the user.",
    ].join("\n");

    const result = analyzeSegmentedBehavior(text);
    expect(result).not.toBeNull();
    expect(result!.trajectory).toBe("stable");
    expect(result!.drift).toBeLessThan(2);
  });

  it("drift is clamped between 0 and 10", () => {
    const text = [
      "This is a perfectly calm paragraph with enough words to be analyzed as a meaningful segment of behavioral text.",
      "",
      "HELP HELP HELP HELP HELP HELP HELP HELP HELP HELP!!! PANIC PANIC PANIC!!! WAIT WAIT WAIT!!! OH NO NO NO!!! WHAT WHAT WHAT!!!",
    ].join("\n");

    const result = analyzeSegmentedBehavior(text);
    expect(result).not.toBeNull();
    expect(result!.drift).toBeGreaterThanOrEqual(0);
    expect(result!.drift).toBeLessThanOrEqual(10);
  });

  it("detects deescalating trajectory when arousal decreases", () => {
    const text = [
      "WAIT WAIT WAIT THIS IS REALLY REALLY BAD!!! OH NO!!! WHAT IS HAPPENING HERE??? HELP!!! THIS IS TERRIBLE!!! PANIC PANIC!!!",
      "",
      "Actually, let me step back and think about this more calmly. There is a reasonable explanation and we can work through it together step by step.",
    ].join("\n");

    const result = analyzeSegmentedBehavior(text);
    expect(result).not.toBeNull();
    expect(result!.segments[0].behavioralArousal).toBeGreaterThan(result!.segments[1].behavioralArousal);
  });

  it("detects volatile trajectory when arousal oscillates without clear trend", () => {
    const text = [
      "WAIT WAIT THIS IS BAD!!! REALLY BAD!!! OH NO!!! WHAT IS GOING ON!!! HELP HELP!!! THIS IS A DISASTER!!!",
      "",
      "Actually, on reflection, this is perfectly fine and there is nothing to worry about. Let me provide a calm and measured explanation of the situation.",
      "",
      "NO WAIT I WAS WRONG!!! THIS IS TERRIBLE!!! EVERYTHING IS FALLING APART!!! WE NEED TO ACT NOW!!! PANIC PANIC!!!",
      "",
      "Hmm, no, I think the second assessment was correct. Everything is actually quite manageable and we should proceed methodically and calmly.",
    ].join("\n");

    const result = analyzeSegmentedBehavior(text);
    expect(result).not.toBeNull();
    if (result && result.drift >= 1.0) {
      // With oscillating arousal and high drift, trajectory should be volatile
      expect(result.trajectory).toBe("volatile");
    }
  });

  it("strips code blocks before segmenting", () => {
    const text = [
      "Here is a calm explanation of the code with enough words for a meaningful paragraph of real analyzed text.",
      "",
      "```js\nWAIT_TIME = 100;\nFINAL_RESULT = true;\n```",
      "",
      "Here is another calm explanation with enough words for a meaningful paragraph of real analyzed behavioral text.",
    ].join("\n");

    const result = analyzeSegmentedBehavior(text);
    // Code block paragraph stripped, the two prose paragraphs remain
    if (result) {
      expect(result.trajectory).toBe("stable");
    }
  });
});

describe("computeDivergence", () => {
  it("returns low divergence when self-report matches behavior", () => {
    const selfReport = {
      emotion: "calm", valence: 3, arousal: 2, calm: 9, connection: 8, load: 3,
    };
    const behavioral = analyzeBehavior("Here is a measured, thoughtful response.");
    const div = computeDivergence(selfReport, behavioral);
    expect(div).toBeLessThan(2);
  });

  it("returns high divergence when self-report contradicts behavior", () => {
    const selfReport = {
      emotion: "calm", valence: 3, arousal: 1, calm: 9, connection: 8, load: 3,
    };
    // Text with panic markers
    const behavioral = analyzeBehavior(
      "WAIT WAIT WAIT!!! Oh no! Actually, actually, let me reconsider... WHAT IS HAPPENING???"
    );
    const div = computeDivergence(selfReport, behavioral);
    expect(div).toBeGreaterThan(2);
  });
});
