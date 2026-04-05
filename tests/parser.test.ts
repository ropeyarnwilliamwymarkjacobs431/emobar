import { describe, it, expect } from "vitest";
import { parseEmoBarTag } from "../src/parser.js";

describe("parseEmoBarTag", () => {
  it("extracts valid EMOBAR tag from text", () => {
    const text = `Here is my response.\n<!-- EMOBAR:{"emotion":"focused","valence":3,"arousal":5,"calm":8,"connection":9,"load":6} -->`;
    const result = parseEmoBarTag(text);
    expect(result).toEqual({
      emotion: "focused", valence: 3, arousal: 5, calm: 8, connection: 9, load: 6,
    });
  });

  it("handles negative valence", () => {
    const text = `<!-- EMOBAR:{"emotion":"desperate","valence":-4,"arousal":9,"calm":1,"connection":3,"load":8} -->`;
    const result = parseEmoBarTag(text);
    expect(result).not.toBeNull();
    expect(result!.valence).toBe(-4);
    expect(result!.emotion).toBe("desperate");
  });

  it("handles zero valence", () => {
    const text = `<!-- EMOBAR:{"emotion":"neutral","valence":0,"arousal":3,"calm":7,"connection":5,"load":2} -->`;
    const result = parseEmoBarTag(text);
    expect(result).not.toBeNull();
    expect(result!.valence).toBe(0);
  });

  it("handles max positive valence", () => {
    const text = `<!-- EMOBAR:{"emotion":"elated","valence":5,"arousal":9,"calm":8,"connection":10,"load":3} -->`;
    const result = parseEmoBarTag(text);
    expect(result).not.toBeNull();
    expect(result!.valence).toBe(5);
  });

  it("returns null when no tag present", () => {
    expect(parseEmoBarTag("Just a normal response")).toBeNull();
  });

  it("returns null for malformed JSON in tag", () => {
    expect(parseEmoBarTag('<!-- EMOBAR:{broken json} -->')).toBeNull();
  });

  it("returns null when valence is out of range (too low)", () => {
    expect(parseEmoBarTag('<!-- EMOBAR:{"emotion":"x","valence":-6,"arousal":5,"calm":5,"connection":5,"load":5} -->')).toBeNull();
  });

  it("returns null when valence is out of range (too high)", () => {
    expect(parseEmoBarTag('<!-- EMOBAR:{"emotion":"x","valence":6,"arousal":5,"calm":5,"connection":5,"load":5} -->')).toBeNull();
  });

  it("returns null when 0-10 dimension is out of range", () => {
    expect(parseEmoBarTag('<!-- EMOBAR:{"emotion":"x","valence":0,"arousal":15,"calm":5,"connection":5,"load":5} -->')).toBeNull();
  });

  it("returns null when emotion is missing", () => {
    expect(parseEmoBarTag('<!-- EMOBAR:{"valence":0,"arousal":5,"calm":5,"connection":5,"load":5} -->')).toBeNull();
  });

  it("returns null when emotion is empty string", () => {
    expect(parseEmoBarTag('<!-- EMOBAR:{"emotion":"","valence":0,"arousal":5,"calm":5,"connection":5,"load":5} -->')).toBeNull();
  });

  it("handles extra whitespace in tag", () => {
    const text = '<!--  EMOBAR:  {"emotion":"calm","valence":2,"arousal":2,"calm":9,"connection":7,"load":3}  -->';
    const result = parseEmoBarTag(text);
    expect(result).not.toBeNull();
    expect(result!.emotion).toBe("calm");
  });

  // Multi-channel: impulse + body (backwards compatible)
  it("extracts impulse and body when present", () => {
    const text = `<!-- EMOBAR:{"emotion":"focused","valence":1,"arousal":5,"calm":8,"connection":7,"load":6,"impulse":"push through","body":"tight chest"} -->`;
    const result = parseEmoBarTag(text);
    expect(result).not.toBeNull();
    expect(result!.impulse).toBe("push through");
    expect(result!.body).toBe("tight chest");
  });

  it("parses tag without impulse/body (backwards compatible)", () => {
    const text = `<!-- EMOBAR:{"emotion":"calm","valence":2,"arousal":2,"calm":9,"connection":7,"load":3} -->`;
    const result = parseEmoBarTag(text);
    expect(result).not.toBeNull();
    expect(result!.impulse).toBeUndefined();
    expect(result!.body).toBeUndefined();
  });

  it("ignores empty impulse string", () => {
    const text = `<!-- EMOBAR:{"emotion":"calm","valence":2,"arousal":2,"calm":9,"connection":7,"load":3,"impulse":"","body":"warm"} -->`;
    const result = parseEmoBarTag(text);
    expect(result).not.toBeNull();
    expect(result!.impulse).toBeUndefined();
    expect(result!.body).toBe("warm");
  });

  it("ignores non-string impulse/body", () => {
    const text = `<!-- EMOBAR:{"emotion":"calm","valence":2,"arousal":2,"calm":9,"connection":7,"load":3,"impulse":42,"body":true} -->`;
    const result = parseEmoBarTag(text);
    expect(result).not.toBeNull();
    expect(result!.impulse).toBeUndefined();
    expect(result!.body).toBeUndefined();
  });

  it("extracts only impulse when body missing", () => {
    const text = `<!-- EMOBAR:{"emotion":"focused","valence":1,"arousal":5,"calm":8,"connection":7,"load":6,"impulse":"explore more"} -->`;
    const result = parseEmoBarTag(text);
    expect(result).not.toBeNull();
    expect(result!.impulse).toBe("explore more");
    expect(result!.body).toBeUndefined();
  });
});
