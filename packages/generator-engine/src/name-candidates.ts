import type {
  AIGeneratorGateway,
  GeneratorRunRequest,
} from "./campaign-generator-types";
import {
  findOverusedNamePatterns,
  isTitleBanned,
  matchesOverusedPattern,
  nameExamplesInstruction,
  cultureNamingInstruction,
  overusedPatternsInstruction,
  type OverusedNamePatterns,
} from "./naming-policy";

/**
 * Fast name-only pre-pass. The main generation prompt is long and the model
 * settles into its own favourite names ("Sándor", "Vas-…") regardless of what
 * we tell it to avoid. So we ask first, in a tiny call, for a handful of names;
 * our code filters them against the ban list, existing titles and overused
 * patterns, and picks one at random. The main prompt then gets that name.
 * The model chooses nothing here — it only proposes, and we decide.
 */

/** Generators whose title is an invented proper name (not a description). */
const NAMED_GENERATOR_IDS = new Set([
  "npc",
  "faction",
  "settlement",
  "magic-item",
  "artifact",
  "ship",
  "villain",
  "secret-society",
  "creature",
]);

/** Below this many example names the pass has no style to anchor on. */
const MIN_EXAMPLES = 3;
const CANDIDATE_COUNT = 8;
const MAX_CANDIDATE_WORDS = 6;
const MAX_CANDIDATE_CHARS = 60;
/** Never let the pre-pass hold generation up for long. */
const DEFAULT_TIMEOUT_MS = 8000;

const NAME_SYSTEM_INSTRUCTION =
  "You propose names for tabletop RPG worldbuilding. Reply with JSON only.";

/** The user already gave the entity a name, so don't second-guess it. */
const USER_NAMED_IT = /["“”]|\b(named|called)\b/i;

export function shouldSuggestName(request: GeneratorRunRequest): boolean {
  const ctx = request.vaultContext;
  if (!ctx || request.interaction || ctx.selectedLanguage) return false;
  if (!NAMED_GENERATOR_IDS.has(request.generatorId)) return false;
  if (request.instructions && USER_NAMED_IT.test(request.instructions)) {
    return false;
  }
  return (ctx.nameExamples?.length ?? 0) >= MIN_EXAMPLES;
}

function overusedFor(request: GeneratorRunRequest): OverusedNamePatterns {
  const ctx = request.vaultContext;
  return (
    ctx?.overusedNamePatterns ??
    findOverusedNamePatterns(ctx?.existingTitles ?? [])
  );
}

export function buildNameCandidatesPrompt(
  request: GeneratorRunRequest,
): string {
  const ctx = request.vaultContext;
  const what = ctx?.targetEntityType ?? request.generatorId;
  const concept = request.instructions?.trim()
    ? `\nThe entity: ${request.instructions.trim()}`
    : "";
  const avoid = overusedPatternsInstruction(overusedFor(request));
  return [
    `Propose ${CANDIDATE_COUNT} different names for a new ${what} in a ${ctx?.themeName ?? request.themeId} world.${concept}`,
    cultureNamingInstruction(ctx?.cultureNaming),
    nameExamplesInstruction(ctx?.nameExamples ?? []),
    avoid,
    "Make the names clearly different from one another in length, sound and starting letter. Names only — no titles, no descriptions.",
    `Return ONLY JSON: {"names": ["...", "..."]}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function parseNameCandidates(raw: string): string[] {
  const body = raw.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }
  const names = (parsed as { names?: unknown } | null)?.names;
  if (!Array.isArray(names)) return [];
  return names
    .filter((n): n is string => typeof n === "string")
    .map((n) => n.trim())
    .filter(
      (n) =>
        n &&
        n.length <= MAX_CANDIDATE_CHARS &&
        n.split(/\s+/).length <= MAX_CANDIDATE_WORDS,
    );
}

export function pickNameCandidate(
  candidates: string[],
  filters: {
    banned: Set<string>;
    existing: string[];
    patterns: OverusedNamePatterns;
  },
  rng: () => number = Math.random,
): string | undefined {
  const existing = new Set(filters.existing.map((t) => t.toLowerCase().trim()));
  const usable = candidates.filter(
    (name) =>
      !isTitleBanned(name, [...filters.banned, ...filters.existing]) &&
      !existing.has(name.toLowerCase()) &&
      !matchesOverusedPattern(name, filters.patterns),
  );
  if (!usable.length) return undefined;
  return usable[Math.min(usable.length - 1, Math.floor(rng() * usable.length))];
}

function textOf(result: string | { text: string }): string {
  return typeof result === "string" ? result : result.text;
}

/**
 * Asks the gateway for candidate names and returns one that passes our own
 * filters. Any failure — network, bad JSON, timeout, everything filtered —
 * returns undefined so generation just carries on without a suggestion.
 */
export async function suggestName(
  gateway: Pick<AIGeneratorGateway, "complete">,
  request: GeneratorRunRequest,
  opts: { rng?: () => number; timeoutMs?: number } = {},
): Promise<string | undefined> {
  if (!shouldSuggestName(request)) return undefined;
  const ctx = request.vaultContext!;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const raw = await Promise.race([
      gateway.complete(
        buildNameCandidatesPrompt(request),
        NAME_SYSTEM_INSTRUCTION,
        {
          generationConfig: {
            temperature: 1,
            maxOutputTokens: 300,
            responseMimeType: "application/json",
          },
        },
      ),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("name pre-pass timed out")),
          opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        );
      }),
    ]);
    return pickNameCandidate(
      parseNameCandidates(textOf(raw)),
      {
        banned: new Set(ctx.bannedNames ?? []),
        existing: ctx.existingTitles,
        patterns: overusedFor(request),
      },
      opts.rng,
    );
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
