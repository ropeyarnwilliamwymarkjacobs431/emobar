import { EMOBAR_TAG_REGEX, DIMENSIONS, type EmotionalState } from "./types.js";

export function parseEmoBarTag(text: string): EmotionalState | null {
  const match = text.match(EMOBAR_TAG_REGEX);
  if (!match) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return null;
  }

  for (const dim of DIMENSIONS) {
    const val = parsed[dim];
    if (typeof val !== "number" || val < 0 || val > 10) return null;
  }

  if (typeof parsed.keyword !== "string" || parsed.keyword.length === 0) {
    return null;
  }

  return {
    load: parsed.load as number,
    certainty: parsed.certainty as number,
    connection: parsed.connection as number,
    energy: parsed.energy as number,
    friction: parsed.friction as number,
    keyword: parsed.keyword as string,
  };
}
