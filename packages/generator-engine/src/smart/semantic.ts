import type { Lexicon } from "./lexicon";
import type {
  SmartGeneratorConfig,
  SmartGeneratorSchema,
  SmartOption,
  Trait,
} from "./types";

/**
 * Reading a free-text description into ordinary generator settings (#2338).
 *
 * This configures the generator. It never writes content, never calls a model,
 * and never leaves the browser: it is a phrase lexicon, an n-gram scan and a
 * negation window. The point is not to understand the sentence, it is to notice
 * which settings the person plainly asked for and to be honest about the rest.
 *
 * Anything it infers is meant to be shown back as a removable chip (#2339), so
 * being confidently wrong is recoverable in one click. That is why a clear match
 * is allowed to pin an axis at all.
 */

/** One thing a description asked for. */
export interface IntentSignal {
  trait: Trait;
  /** Summed across every mention: three mentions of "coastal" score three. */
  score: number;
  /** The wording that produced it, for explaining the inference back. */
  phrase: string;
  /** True when a negator preceded the phrase ("not a port town"). */
  negated: boolean;
}

/**
 * Normalisation seam. The default is a small deterministic tokenizer with no
 * dependency; a caller can inject a real NLP analyzer if match quality ever
 * demands it, without this module learning about one.
 */
export interface TextAnalyzer {
  tokenize(text: string): string[];
}

export const defaultAnalyzer: TextAnalyzer = {
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/['’]/g, "")
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  },
};

/** Words that flip the meaning of what follows them. */
const NEGATORS = new Set([
  "not",
  "no",
  "never",
  "without",
  "hardly",
  "barely",
  "lacking",
  "avoid",
  "isnt",
  "arent",
]);

/** How many words back a negator still reaches. */
const NEGATION_WINDOW = 3;

/** The longest phrase the lexicon can express, in words. */
const MAX_PHRASE_WORDS = 3;

const EXACT_SCORE = 1;
/** A morphological variant is good evidence, but not the person's own wording. */
const VARIANT_SCORE = 0.8;

/**
 * Enough to pin an axis. Set at the variant score rather than above it, because
 * "mountains" is not a fuzzy guess at "mountain", it is how people write.
 */
const LOCK_THRESHOLD = VARIANT_SCORE;
/**
 * A description that names an option outright ("a pilgrimage town") is the
 * strongest evidence there is, and outweighs options that merely share a trait.
 */
const NAME_MATCH_BONUS = 2;
/** How far the winner must lead, so a tie stays a roll rather than a guess. */
const LOCK_MARGIN = 0.5;
/** Ceiling on how far repetition can tilt the weights. */
const BIAS_CAP = 4;

/** Crude but predictable suffix stripping. Predictable matters more than clever. */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith("ier")) return `${word.slice(0, -3)}y`;
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("er")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("ly")) return word.slice(0, -2);
  // Only the plurals that actually need two letters removed. Stripping "es"
  // wholesale turns "temples" into "templ" and stops it matching "temple".
  if (word.length > 4 && /(ses|xes|zes|ches|shes)$/.test(word)) {
    return word.slice(0, -2);
  }
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
}

interface PhraseIndex {
  exact: Map<string, Trait[]>;
  stemmed: Map<string, Trait[]>;
  longest: number;
}

function add(index: Map<string, Trait[]>, key: string, trait: Trait): void {
  const existing = index.get(key);
  if (existing) {
    if (!existing.includes(trait)) existing.push(trait);
    return;
  }
  index.set(key, [trait]);
}

function buildIndex(lexicon: Lexicon, analyzer: TextAnalyzer): PhraseIndex {
  const exact = new Map<string, Trait[]>();
  const stemmed = new Map<string, Trait[]>();
  let longest = 1;

  for (const entry of lexicon) {
    for (const phrase of entry.phrases) {
      const words = analyzer.tokenize(phrase);
      if (words.length === 0) continue;
      longest = Math.max(longest, Math.min(words.length, MAX_PHRASE_WORDS));
      add(exact, words.join(" "), entry.trait);
      add(stemmed, words.map(stem).join(" "), entry.trait);
    }
  }

  return { exact, stemmed, longest };
}

/** Where a word sequence appears, or -1. */
function indexOfSequence(words: string[], sequence: string[]): number {
  if (sequence.length === 0 || sequence.length > words.length) return -1;
  for (let i = 0; i <= words.length - sequence.length; i++) {
    if (sequence.every((word, offset) => words[i + offset] === word)) return i;
  }
  return -1;
}

function isNegated(words: string[], start: number): boolean {
  const from = Math.max(0, start - NEGATION_WINDOW);
  for (let i = from; i < start; i++) {
    if (NEGATORS.has(words[i])) return true;
  }
  return false;
}

/**
 * Find every trait a description asks for.
 *
 * At each position the longest matching phrase wins, so "controlled by
 * merchants" is read as a statement about who rules rather than three loose
 * words. Scanning then resumes at the next word, so "merchants" still lands as
 * trade: one wording can legitimately say two things.
 */
export function analyseIntent(
  text: string,
  lexicon: Lexicon,
  analyzer: TextAnalyzer = defaultAnalyzer,
): IntentSignal[] {
  if (!text.trim()) return [];

  const words = analyzer.tokenize(text);
  if (words.length === 0) return [];
  const index = buildIndex(lexicon, analyzer);

  // One entry per trait per polarity: a description that says "wealthy" twice
  // and "not wealthy" once should keep both sides rather than cancel to silence.
  const found = new Map<string, IntentSignal>();
  const record = (
    trait: Trait,
    score: number,
    phrase: string,
    negated: boolean,
  ) => {
    const key = `${trait}:${negated}`;
    const existing = found.get(key);
    if (existing) {
      existing.score += score;
      return;
    }
    found.set(key, { trait, score, phrase, negated });
  };

  for (let i = 0; i < words.length; i++) {
    const longest = Math.min(index.longest, words.length - i);
    for (let length = longest; length >= 1; length--) {
      const slice = words.slice(i, i + length);
      const phrase = slice.join(" ");
      const exact = index.exact.get(phrase);
      const traits = exact ?? index.stemmed.get(slice.map(stem).join(" "));
      if (!traits) continue;

      const negated = isNegated(words, i);
      const score = exact ? EXACT_SCORE : VARIANT_SCORE;
      for (const trait of traits) record(trait, score, phrase, negated);
      // Only the longest phrase starting here is taken, but scanning continues
      // from the next word rather than past the phrase: "controlled by
      // merchants" says something about who rules, and "merchants" still says
      // something about trade.
      break;
    }
  }

  return [...found.values()].sort((a, b) => b.score - a.score);
}

/**
 * Turn signals into weight multipliers.
 *
 * A negation does not merely fail to favour an option, it suppresses it: asking
 * for somewhere "not coastal" and getting a harbour would be worse than asking
 * for nothing at all. Where both sides were said, the stronger one wins.
 */
export function intentBias(
  signals: readonly IntentSignal[],
): Record<Trait, number> {
  const net = new Map<Trait, number>();
  for (const signal of signals) {
    const delta = signal.negated ? -signal.score : signal.score;
    net.set(signal.trait, (net.get(signal.trait) ?? 0) + delta);
  }

  const bias: Record<Trait, number> = {};
  for (const [trait, value] of net) {
    bias[trait] = value <= 0 ? 0 : 1 + Math.min(value, BIAS_CAP);
  }
  return bias;
}

/** One axis the description pinned, with enough detail to explain itself. */
export interface InferredChoice {
  axisId: string;
  label: string;
  value: string;
  score: number;
  /** The wording that led here, for the chip's explanation. */
  phrases: string[];
}

export interface AppliedIntent {
  config: SmartGeneratorConfig;
  inferred: InferredChoice[];
}

function scoreOption(
  option: SmartOption,
  signals: readonly IntentSignal[],
  words: string[],
): { score: number; phrases: string[] } {
  let score = 0;
  const phrases: string[] = [];
  for (const signal of signals) {
    if (!option.traits?.includes(signal.trait)) continue;
    score += signal.negated ? -signal.score : signal.score;
    if (!signal.negated) phrases.push(signal.phrase);
  }

  if (words.length > 0) {
    const valueWords = defaultAnalyzer.tokenize(option.value);
    const at = indexOfSequence(words, valueWords);
    // "not a fishing village" names the option in order to rule it out.
    if (at >= 0 && !isNegated(words, at)) {
      score += NAME_MATCH_BONUS;
      phrases.push(valueWords.join(" "));
    }
  }

  return { score, phrases };
}

/**
 * Write the signals into a config: pin the axes the description clearly chose,
 * and weight the rest.
 *
 * Axes the user or a preset already set are left alone. A description is a
 * suggestion; a choice already on screen is a decision.
 */
export function applyIntent(
  schema: SmartGeneratorSchema,
  signals: readonly IntentSignal[],
  config: SmartGeneratorConfig,
  /** The original description, so an option named outright can be recognised. */
  description = "",
  analyzer: TextAnalyzer = defaultAnalyzer,
): AppliedIntent {
  const bias = { ...(config.bias ?? {}), ...intentBias(signals) };
  const inferred: InferredChoice[] = [];
  const locked = { ...(config.locked ?? {}) };

  if (signals.length > 0) {
    // Pools are read with an empty context, so a conditional pool contributes
    // only its default branch. Inference runs before anything is resolved, so
    // there is nothing better to offer it.
    const ctx = { genre: config.genre ?? "", values: {}, traits: [] };
    const words = description ? analyzer.tokenize(description) : [];

    for (const axis of schema.axes) {
      if (locked[axis.id]) continue;

      const scored = axis
        .pool(ctx)
        .map((option) =>
          typeof option === "string" ? { value: option } : option,
        )
        .map((option) => ({ option, ...scoreOption(option, signals, words) }))
        .sort((a, b) => b.score - a.score);

      const [best, runnerUp] = scored;
      if (!best || best.score < LOCK_THRESHOLD) continue;
      if (runnerUp && best.score - runnerUp.score < LOCK_MARGIN) continue;

      locked[axis.id] = { value: best.option.value, source: "inferred" };
      inferred.push({
        axisId: axis.id,
        label: axis.label,
        value: best.option.value,
        score: best.score,
        phrases: [...new Set(best.phrases)],
      });
    }
  }

  const next: SmartGeneratorConfig = { ...config, bias };
  if (Object.keys(locked).length > 0) next.locked = locked;
  return { config: next, inferred };
}
