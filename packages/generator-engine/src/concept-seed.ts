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
  rollAdventureConcept,
  rollConcept,
  rollCouncilVoteConcept,
  rollHeistConcept,
  rollMysteryConcept,
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
export function formatSeedBlock(
  seed: ConceptSeed,
  label = "Case seed",
): string {
  return [
    `${label}, chosen before writing and locked. Build the case around it: its premise and stake are fixed. Use the title idea as the title unless it would mislead players.`,
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
  /** Domain of the seed: "mystery", "adventure", "one-shot", etc. Defaults to "adventure" (or "mystery" if mysteryType is set). */
  domain?: string;
  /** Subtype or scenario emphasis (e.g. "Survival", "Murder", "Intrigue", "Theft"). */
  subType?: string;
  /** @deprecated Use subType or domain. Preserved for backwards compatibility with mystery generator. */
  mysteryType?: string;
  /** Campaign or session context the seed must fit. */
  context: string;
  /** Seeds already generated recently, which candidates should not repeat. */
  recent: readonly ConceptSeed[];
  /** Specific clichés, tropes, or motifs to actively avoid in the candidates. */
  avoidTropes?: readonly string[];
  /** Dimension IDs to avoid when rolling concept dimensions. */
  avoidDimensionIds?: ReadonlySet<string>;
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
  const isMystery =
    input.domain === "mystery" ||
    Boolean(input.mysteryType) ||
    (input.subType !== undefined &&
      [
        "theft",
        "murder",
        "disappearance",
        "conspiracy",
        "strange phenomenon",
        "other",
      ].includes(input.subType.toLowerCase()));
  const isHeist = input.domain === "heist";
  const isCouncilVote = input.domain === "council-vote";
  const subType = input.subType ?? input.mysteryType;

  const recent = input.recent.length
    ? `Recent seeds to avoid repeating (same situation, object or title):\n${input.recent
        .map((seed) => `- ${seed.premise} (${seed.titleIdea})`)
        .join("\n")}\n`
    : "";
  const context = input.context.trim()
    ? `Campaign context (the candidates must fit it):\n${input.context.trim()}\n`
    : "";
  const typeText = subType
    ? isMystery
      ? ` and the mystery type (${subType})`
      : isHeist
        ? ` and the heist type (${subType})`
        : ` and the scenario emphasis (${subType})`
    : "";

  let typeGuidance = "";
  if (isMystery) {
    if (subType?.toLowerCase() === "other") {
      typeGuidance =
        " For mystery type Other, explore varied central situations (such as an unexplained event, a mechanical breakdown, an ideological sabotage, a disputed relationship, or a false accusation); do NOT make it a theft or missing item unless the premise explicitly demands it.";
    } else if (subType && subType.toLowerCase() !== "theft") {
      typeGuidance = ` Candidates must centre on the ${subType} (do NOT default to stolen objects, keys, or ledgers).`;
    }
  } else if (isHeist) {
    if (subType) {
      typeGuidance = ` Candidates must centre on a ${subType} objective (do NOT default to stealing a gem or art piece from an eccentric collector's mansion unless requested).`;
    }
  } else if (isCouncilVote) {
    typeGuidance =
      " Candidates must centre on a nuanced political conflict, disputed reform, succession crisis, or institutional deadlock (do NOT default to a simple monetary bribe, evil tax increase, or predictable corrupt tie-breaker).";
  } else if (subType) {
    typeGuidance = ` Candidates must centre on the ${subType} premise and playstyle (do NOT default to standard tavern notice boards, missing merchant caravans, or fetch quests).`;
  }

  const avoidTropesGuidance = input.avoidTropes?.length
    ? ` Avoid the following familiar cliches and motifs: ${input.avoidTropes.join("; ")}.`
    : "";

  const subject = isMystery
    ? "case seeds for a tabletop mystery"
    : isHeist
      ? "heist scenario concepts for a tabletop RPG score"
      : isCouncilVote
        ? "political vote concepts for a contentious council decision"
        : "adventure seeds for a tabletop RPG scenario";

  return `Propose ${SEED_CANDIDATE_COUNT} different ${subject}. Each candidate must fit the concept constraints below, the genre (${input.genre}), the tone (${input.tone})${typeText}. The candidates must differ from each other in central situation, conflict mechanism, and setting.${typeGuidance}${avoidTropesGuidance}

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
  const isMystery =
    input.domain === "mystery" ||
    Boolean(input.mysteryType) ||
    (input.subType !== undefined &&
      [
        "theft",
        "murder",
        "disappearance",
        "conspiracy",
        "strange phenomenon",
        "other",
      ].includes(input.subType.toLowerCase()));
  const isHeist = input.domain === "heist";
  const isCouncilVote = input.domain === "council-vote";
  const subType = input.subType ?? input.mysteryType;

  const dimensions = isMystery
    ? rollMysteryConcept(
        input.genre,
        input.tone,
        subType,
        rng,
        input.avoidDimensionIds,
      )
    : isHeist
      ? rollHeistConcept(
          input.genre,
          input.tone,
          subType,
          rng,
          input.avoidDimensionIds,
        )
      : isCouncilVote
        ? rollCouncilVoteConcept(
            input.genre,
            input.tone,
            rng,
            input.avoidDimensionIds,
          )
        : subType
          ? rollAdventureConcept(
              input.genre,
              input.tone,
              subType,
              rng,
              input.avoidDimensionIds,
            )
          : rollConcept(input.genre, input.tone, rng, input.avoidDimensionIds);

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
