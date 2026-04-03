import { describe, it, expect } from "vitest";
import { parseEmoBarTag } from "../src/parser.js";

describe("parseEmoBarTag", () => {
  it("extracts valid EMOBAR tag from text", () => {
    const text = `Here is my response.\n<!-- EMOBAR:{"load":4,"certainty":7,"connection":10,"energy":9,"friction":0,"keyword":"flow"} -->`;
    const result = parseEmoBarTag(text);
    expect(result).toEqual({
      load: 4, certainty: 7, connection: 10, energy: 9, friction: 0, keyword: "flow",
    });
  });

  it("returns null when no tag present", () => {
    expect(parseEmoBarTag("Just a normal response")).toBeNull();
  });

  it("returns null for malformed JSON in tag", () => {
    expect(parseEmoBarTag('<!-- EMOBAR:{broken json} -->')).toBeNull();
  });

  it("returns null when dimensions are out of range", () => {
    expect(parseEmoBarTag('<!-- EMOBAR:{"load":15,"certainty":7,"connection":10,"energy":9,"friction":0,"keyword":"x"} -->')).toBeNull();
  });

  it("returns null when keyword is missing", () => {
    expect(parseEmoBarTag('<!-- EMOBAR:{"load":4,"certainty":7,"connection":10,"energy":9,"friction":0} -->')).toBeNull();
  });

  it("handles extra whitespace in tag", () => {
    const text = '<!--  EMOBAR:  {"load":4,"certainty":7,"connection":10,"energy":9,"friction":0,"keyword":"calm"}  -->';
    const result = parseEmoBarTag(text);
    expect(result).not.toBeNull();
    expect(result!.keyword).toBe("calm");
  });
});
