/**
 * The concept seed stage. Code rolls the creative dimensions (see
 * `concept-dimensions.ts`); the model writes several candidate seeds that fit
 * them; code picks one, preferring candidates that do not repeat recent seeds.
 * Choosing from a list counters mode collapse, because a model's first idea is
 * usually its most familiar one. If no usable candidates arrive, the caller
 * falls back to the rolled dimensions alone, so this stage never blocks a run.
 */

import {
  type ConceptChoice,
  formatConceptBlock,
  rollConcept,
} from "./concept-dimensions";
import { type Rng, defaultRng, pickFrom } from "./random-utils";
import {
  type DraftCheck,
  type JsonObject,
  askChecked,
  readJsonObject,
  withRetryFeedback,
} from "./staged-runtime";

export interface ConceptSeed {
  premise: string;
  stake: string;
  setting: string;
  distinctiveElement: string;
  titleIdea: string;
}

const SEED_CANDIDATE_COUNT = 5;

/** Two shared content words with a recent seed count as a repeat. */
const REPEAT_SHARED_WORDS = 2;

const SEED_FIELDS = [
  "premise",
  "stake",
  "setting",
  "distinctiveElement",
  "titleIdea",
] as const;

/** Short words that carry no concept, so they never count as a repeat. */
const SEED_STOPWORDS = new Set([
  "about",
  "after",
  "their",
  "there",
  "these",
  "those",
  "where",
  "which",
  "while",
  "would",
  "could",
  "before",
  "between",
  "through",
  "under",
  "without",
  "other",
  "every",
  "again",
]);

/** Complete candidates only; a candidate missing any field is dropped. */
export function readSeedCandidates(data: JsonObject): ConceptSeed[] {
  const list = Array.isArray(data.candidates) ? data.candidates : [];
  const seeds: ConceptSeed[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const values = SEED_FIELDS.map((field) =>
      typeof record[field] === "string" ? record[field].trim() : "",
    );
    if (values.some((value) => value === "")) continue;
    seeds.push({
      premise: values[0],
      stake: values[1],
      setting: values[2],
      distinctiveElement: values[3],
      titleIdea: values[4],
    });
  }
  return seeds;
}

/** Content words of a seed's premise and title idea. */
function seedWords(seed: ConceptSeed): Set<string> {
  return new Set(
    `${seed.premise} ${seed.titleIdea}`
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((word) => word.length >= 4 && !SEED_STOPWORDS.has(word)),
  );
}

/** The most content words one candidate shares with any single recent seed. */
export function repeatScore(
  seed: ConceptSeed,
  recent: readonly ConceptSeed[],
): number {
  const words = seedWords(seed);
  let best = 0;
  for (const past of recent) {
    let shared = 0;
    for (const word of seedWords(past)) if (words.has(word)) shared++;
    best = Math.max(best, shared);
  }
  return best;
}

/**
 * Pick one candidate at random from those that do not repeat a recent seed.
 * When every candidate repeats, pick at random among the least similar.
 */
export function pickSeed(
  candidates: readonly ConceptSeed[],
  recent: readonly ConceptSeed[],
  rng: Rng = defaultRng,
): ConceptSeed {
  const scored = candidates.map((seed) => ({
    seed,
    score: repeatScore(seed, recent),
  }));
  const fresh = scored.filter((item) => item.score < REPEAT_SHARED_WORDS);
  if (fresh.length > 0) return pickFrom(fresh, rng).seed;
  const least = Math.min(...scored.map((item) => item.score));
  return pickFrom(
    scored.filter((item) => item.score === least),
    rng,
  ).seed;
}

/** A seed rendered as the locked block the stage prompts carry. */
export function formatSeedBlock(seed: ConceptSeed): string {
  return [
    "Case seed, chosen before writing and locked. Build the case around it: its premise and stake are fixed. Use the title idea as the title unless it would mislead players.",
    `- Premise: ${seed.premise}`,
    `- Stake: ${seed.stake}`,
    `- Setting: ${seed.setting}`,
    `- Distinctive element: ${seed.distinctiveElement}`,
    `- Title idea: ${seed.titleIdea}`,
  ].join("\n");
}

export interface ConceptSeedInput {
  genre: string;
  tone: string;
  /** Campaign or session context the seed must fit. */
  context: string;
  /** Seeds already generated recently, which candidates should not repeat. */
  recent: readonly ConceptSeed[];
}

export interface ConceptSeedDeps {
  complete: (systemInstruction: string, userMessage: string) => Promise<string>;
  rng?: Rng;
  signal?: AbortSignal;
}

const SEED_SYSTEM =
  "You design tabletop adventure premises. Propose distinct, playable candidates and return JSON only.";

function seedMessage(
  input: ConceptSeedInput,
  dimensions: readonly ConceptChoice[],
): string {
  const recent = input.recent.length
    ? `Recent seeds to avoid repeating (same situation, object or title):\n${input.recent
        .map((seed) => `- ${seed.premise} (${seed.titleIdea})`)
        .join("\n")}\n`
    : "";
  const context = input.context.trim()
    ? `Campaign context (the candidates must fit it):\n${input.context.trim()}\n`
    : "";
  return `Propose ${SEED_CANDIDATE_COUNT} different case seeds for a tabletop mystery. Each candidate must fit the concept constraints below, the genre (${input.genre}) and the tone (${input.tone}). The candidates must differ from each other in setting and central object.

${formatConceptBlock(dimensions)}

${context}${recent}
Express the concept in this genre's own terms. Each candidate has:
- premise: one sentence on who wants what, and what has gone wrong
- stake: what is lost if it goes wrong
- setting: where it happens
- distinctiveElement: one concrete detail
- titleIdea: a short title. Do not use the pattern "The X Beneath Y".

Return JSON only, exactly this shape: {"candidates":[{"premise":"","stake":"","setting":"","distinctiveElement":"","titleIdea":""}]} with ${SEED_CANDIDATE_COUNT} candidates.`;
}

function readSeeds(reply: string): ConceptSeed[] | null {
  const data = readJsonObject(reply);
  if (!data) return null;
  const seeds = readSeedCandidates(data);
  return seeds.length > 0 ? seeds : null;
}

function checkSeeds(seeds: ConceptSeed[]): DraftCheck {
  return {
    hard: [],
    soft:
      seeds.length < SEED_CANDIDATE_COUNT
        ? [
            `only ${seeds.length} of ${SEED_CANDIDATE_COUNT} candidates were complete`,
          ]
        : [],
  };
}

/**
 * Ask for candidate seeds and pick one. Resolves `null` when no usable
 * candidates arrive after the retries, so the caller falls back to the rolled
 * dimensions. Cancellation always propagates.
 */
export async function generateConceptSeed(
  input: ConceptSeedInput,
  { complete, rng = defaultRng, signal }: ConceptSeedDeps,
): Promise<ConceptSeed | null> {
  const dimensions = rollConcept(input.genre, input.tone, rng);
  const message = seedMessage(input, dimensions);
  const outcome = await askChecked(
    ({ problems, previous }) =>
      complete(SEED_SYSTEM, withRetryFeedback(message, problems, previous)),
    readSeeds,
    checkSeeds,
    { signal },
  );
  if (!outcome) return null;
  // The model may return more than asked; only the first few are considered.
  const candidates = outcome.data.slice(0, SEED_CANDIDATE_COUNT);
  return pickSeed(candidates, input.recent, rng);
}
