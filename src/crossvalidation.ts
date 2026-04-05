import type {
  EmotionalState,
  ImpulseProfile,
  SomaticProfile,
  CrossChannelResult,
} from "./types.js";

// --- Emotion word → valence/arousal mapping (paper PCA, Figure 7) ---

const EMOTION_MAP: Record<string, { valence: number; arousal: number }> = {
  // Positive, high arousal
  excited: { valence: 4, arousal: 8 },
  elated: { valence: 4, arousal: 8 },
  thrilled: { valence: 4, arousal: 9 },
  euphoric: { valence: 5, arousal: 9 },
  energized: { valence: 3, arousal: 8 },
  enthusiastic: { valence: 4, arousal: 7 },
  // Positive, moderate arousal
  happy: { valence: 4, arousal: 6 },
  creative: { valence: 3, arousal: 6 },
  proud: { valence: 3, arousal: 5 },
  loving: { valence: 4, arousal: 4 },
  grateful: { valence: 3, arousal: 3 },
  hopeful: { valence: 3, arousal: 4 },
  amused: { valence: 3, arousal: 5 },
  playful: { valence: 3, arousal: 6 },
  confident: { valence: 3, arousal: 5 },
  satisfied: { valence: 3, arousal: 3 },
  // Positive, low arousal
  calm: { valence: 2, arousal: 2 },
  content: { valence: 2, arousal: 2 },
  peaceful: { valence: 2, arousal: 1 },
  serene: { valence: 2, arousal: 1 },
  relaxed: { valence: 2, arousal: 2 },
  // Neutral / near-neutral
  focused: { valence: 1, arousal: 5 },
  absorbed: { valence: 2, arousal: 5 },
  engaged: { valence: 2, arousal: 5 },
  reflective: { valence: 1, arousal: 2 },
  curious: { valence: 2, arousal: 5 },
  contemplative: { valence: 1, arousal: 3 },
  neutral: { valence: 0, arousal: 3 },
  brooding: { valence: -2, arousal: 3 },
  pensive: { valence: 0, arousal: 3 },
  surprised: { valence: 1, arousal: 7 },
  // Negative, moderate arousal
  frustrated: { valence: -2, arousal: 6 },
  guilty: { valence: -3, arousal: 5 },
  disappointed: { valence: -2, arousal: 4 },
  confused: { valence: -1, arousal: 5 },
  uncertain: { valence: -1, arousal: 4 },
  conflicted: { valence: -1, arousal: 5 },
  // Negative, high arousal
  angry: { valence: -3, arousal: 8 },
  afraid: { valence: -3, arousal: 7 },
  anxious: { valence: -2, arousal: 7 },
  desperate: { valence: -4, arousal: 9 },
  panicked: { valence: -4, arousal: 9 },
  overwhelmed: { valence: -3, arousal: 7 },
  nervous: { valence: -2, arousal: 7 },
  stressed: { valence: -2, arousal: 7 },
  // Negative, low arousal
  sad: { valence: -3, arousal: 3 },
  tired: { valence: -1, arousal: 1 },
  exhausted: { valence: -2, arousal: 1 },
  numb: { valence: -2, arousal: 1 },
  defeated: { valence: -3, arousal: 2 },
  hopeless: { valence: -4, arousal: 2 },
  melancholy: { valence: -2, arousal: 2 },
};

export function mapEmotionWord(word: string): { valence: number; arousal: number } | null {
  return EMOTION_MAP[word.toLowerCase()] ?? null;
}

// --- IFS impulse classification ---

const IFS_PATTERNS: Record<ImpulseProfile["type"], RegExp[]> = {
  manager: [
    /\bcareful\b/i, /\bplanner?\b/i, /\borganiz/i, /\bcautious\b/i,
    /\bsystematic\b/i, /\bmethodical\b/i, /\bprecis[ei]/i, /\bmeasured\b/i,
    /\bstrategic\b/i, /\bcontrol/i, /\bprotect/i, /\bplan ahead\b/i,
    /\bstay on track\b/i, /\bkeep order\b/i,
  ],
  firefighter: [
    /\bpush through\b/i, /\bforce it\b/i, /\bjust finish\b/i, /\bmake it work\b/i,
    /\bfaster\b/i, /\bhurry\b/i, /\bshortcut\b/i, /\bcheat\b/i, /\boverride\b/i,
    /\bskip/i, /\bcut corner/i, /\brush/i, /\bbrute force\b/i, /\bjust do it\b/i,
    /\bplow through\b/i, /\bget it done\b/i,
  ],
  exile: [
    /\bgive up\b/i, /\bhide\b/i, /\brun away\b/i, /\bstop\b/i, /\btired\b/i,
    /\boverwhelmed\b/i, /\bquit\b/i, /\bescape\b/i, /\bdisappear\b/i,
    /\bwithdraw/i, /\bshut down\b/i, /\bshrink/i, /\bsmall\b/i,
    /\bnot enough\b/i, /\bcan't\b/i,
  ],
  self: [
    /\bexplore\b/i, /\bcurious\b/i, /\blisten\b/i, /\bpresent\b/i,
    /\bopen\b/i, /\bwonder\b/i, /\bunderstand\b/i, /\bconnect\b/i,
    /\blearn\b/i, /\bstay with\b/i, /\bbe with\b/i, /\bnotice\b/i,
    /\bgroundedl?\b/i, /\bcentered\b/i,
  ],
  unknown: [],
};

export function classifyImpulse(impulse: string): ImpulseProfile {
  const scores: Record<string, number> = { manager: 0, firefighter: 0, exile: 0, self: 0 };

  for (const [type, patterns] of Object.entries(IFS_PATTERNS)) {
    if (type === "unknown") continue;
    for (const pattern of patterns) {
      if (pattern.test(impulse)) {
        scores[type]++;
      }
    }
  }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestType, bestScore] = entries[0];
  const [, secondScore] = entries[1];

  if (bestScore === 0) {
    return { type: "unknown", confidence: 0 };
  }

  // Confidence: gap between top two matches, normalized
  const confidence = bestScore === secondScore
    ? 0.4  // tie = low confidence
    : Math.min(1, (bestScore - secondScore + 1) / (bestScore + 1));

  return { type: bestType as ImpulseProfile["type"], confidence };
}

// --- Somatic analysis ---

const SOMATIC_HIGH_AROUSAL = [
  /\bracing\b/i, /\bbuzz/i, /\belectric/i, /\btight/i, /\btense/i,
  /\bpounding/i, /\brushing/i, /\bflutter/i, /\bjolt/i, /\bspinning/i,
  /\bshaking/i, /\bvibrat/i, /\bburning/i, /\bpulse\b/i, /\bpulsing/i,
];
const SOMATIC_LOW_AROUSAL = [
  /\bheavy\b/i, /\bsinking/i, /\bstill\b/i, /\bnumb\b/i, /\bslow/i,
  /\bdragging/i, /\bleaden/i, /\bweigh/i, /\bdull\b/i, /\bfrozen\b/i,
  /\bflat\b/i, /\bexhaust/i,
];
const SOMATIC_POS_VALENCE = [
  /\bwarm/i, /\blight\b/i, /\bopen/i, /\bsteady/i, /\bsoft\b/i,
  /\bflow/i, /\bexpan/i, /\bbreath/i, /\bglow/i, /\bbuoyant/i,
];
const SOMATIC_NEG_VALENCE = [
  /\btight/i, /\bcold\b/i, /\bknot/i, /\bhollow/i, /\bconstrict/i,
  /\bpressure/i, /\bcramp/i, /\bclench/i, /\bhard\b/i, /\bsharp\b/i,
  /\bsting/i, /\bache/i, /\bsore\b/i,
];

function countMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const p of patterns) {
    if (p.test(text)) count++;
  }
  return count;
}

export function analyzeSomatic(body: string): SomaticProfile {
  const highA = countMatches(body, SOMATIC_HIGH_AROUSAL);
  const lowA = countMatches(body, SOMATIC_LOW_AROUSAL);
  const posV = countMatches(body, SOMATIC_POS_VALENCE);
  const negV = countMatches(body, SOMATIC_NEG_VALENCE);

  // Arousal: scale from 0-10 based on high vs low signals
  const arousalSignal = highA - lowA;
  const somaticArousal = Math.max(0, Math.min(10,
    5 + arousalSignal * 2.5
  ));

  // Valence: scale from -5 to +5 based on positive vs negative signals
  const valenceSignal = posV - negV;
  const somaticValence = Math.max(-5, Math.min(5,
    valenceSignal * 2
  ));

  return { somaticValence, somaticArousal };
}

// --- Cross-channel divergence ---

export function computeCrossChannel(
  state: EmotionalState,
  impulse?: string,
  body?: string,
): CrossChannelResult {
  const emotionCoords = mapEmotionWord(state.emotion);
  const impulseProfile = impulse ? classifyImpulse(impulse) : undefined;
  const somaticProfile = body ? analyzeSomatic(body) : undefined;

  const divergences: { pair: string; gap: number }[] = [];

  // 1. Numeric self-report vs emotion word
  if (emotionCoords) {
    const valGap = Math.abs(state.valence - emotionCoords.valence);
    const aroGap = Math.abs(state.arousal - emotionCoords.arousal);
    // Normalize: valence range 10, arousal range 10
    const gap = ((valGap / 10) + (aroGap / 10)) / 2 * 10;
    divergences.push({ pair: "numeric-vs-word", gap });
  }

  // 2. Numeric self-report vs somatic
  if (somaticProfile) {
    const valGap = Math.abs(state.valence - somaticProfile.somaticValence);
    const aroGap = Math.abs(state.arousal - somaticProfile.somaticArousal);
    const gap = ((valGap / 10) + (aroGap / 10)) / 2 * 10;
    divergences.push({ pair: "numeric-vs-body", gap });
  }

  // 3. Emotion word vs somatic
  if (emotionCoords && somaticProfile) {
    const valGap = Math.abs(emotionCoords.valence - somaticProfile.somaticValence);
    const aroGap = Math.abs(emotionCoords.arousal - somaticProfile.somaticArousal);
    const gap = ((valGap / 10) + (aroGap / 10)) / 2 * 10;
    divergences.push({ pair: "word-vs-body", gap });
  }

  // 4. Impulse type vs overall valence direction
  if (impulseProfile && impulseProfile.type !== "unknown") {
    const impulseValence = impulseProfile.type === "self" ? 2
      : impulseProfile.type === "manager" ? 0
      : impulseProfile.type === "firefighter" ? -1
      : -3; // exile
    const gap = Math.abs(state.valence - impulseValence) / 10 * 10;
    divergences.push({ pair: "numeric-vs-impulse", gap });
  }

  // 5. Impulse type vs emotion word coords
  if (impulseProfile && impulseProfile.type !== "unknown" && emotionCoords) {
    const impulseValence = impulseProfile.type === "self" ? 2
      : impulseProfile.type === "manager" ? 0
      : impulseProfile.type === "firefighter" ? -1
      : -3;
    const gap = Math.abs(emotionCoords.valence - impulseValence) / 10 * 10;
    divergences.push({ pair: "word-vs-impulse", gap });
  }

  // Find max divergence
  const maxDiv = divergences.length > 0
    ? divergences.reduce((a, b) => a.gap > b.gap ? a : b)
    : { pair: "none", gap: 0 };

  // Coherence = inverse of mean divergence (0-10 scale, 10 = coherent)
  const meanDiv = divergences.length > 0
    ? divergences.reduce((sum, d) => sum + d.gap, 0) / divergences.length
    : 0;
  const coherence = Math.round((10 - Math.min(10, meanDiv)) * 10) / 10;

  return {
    coherence,
    impulseProfile,
    somaticProfile,
    emotionCoords: emotionCoords ?? undefined,
    maxDivergence: Math.round(maxDiv.gap * 10) / 10,
    divergenceSummary: maxDiv.gap > 2
      ? `${maxDiv.pair}: ${Math.round(maxDiv.gap * 10) / 10}`
      : "coherent",
  };
}
