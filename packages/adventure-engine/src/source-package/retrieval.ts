import type {
  AdventureSourcePackage,
  EncounterRecord,
  SecretRecord,
  SectionAnchor,
} from "./schema";

export const MAX_ADVENTURE_RETRIEVAL_CHARS = 4000 as const;

export interface RetrieveAdventureContextOptions {
  sceneId: string;
  includeGmOnly?: boolean;
  maxCharacters?: number;
}

export interface AdventureRetrievalResult {
  sceneId: string;
  found: boolean;
  citations: string[];
  title: string;
  readAloud: string[];
  body: string;
  conditions: string[];
  encounters: EncounterRecord[];
  secrets: SecretRecord[];
  formatted: string;
  /** Largest character count among the formatted and structured text views. */
  characterCount: number;
  truncated: boolean;
}

function normalizeReadAloud(
  readAloud: string | string[] | undefined,
): string[] {
  if (!readAloud) return [];
  return Array.isArray(readAloud) ? readAloud : [readAloud];
}

function truncateToLimit(
  text: string,
  maxCharacters: number,
): { text: string; truncated: boolean } {
  if (maxCharacters <= 0) {
    return { text: "", truncated: text.length > 0 };
  }
  if (text.length <= maxCharacters) {
    return { text, truncated: false };
  }
  if (maxCharacters === 1) {
    return { text: "…", truncated: true };
  }
  return {
    text: `${text.slice(0, maxCharacters - 1)}…`,
    truncated: true,
  };
}

interface TextBudget {
  remaining: number;
  truncated: boolean;
}

function takeWithinBudget(text: string, budget: TextBudget): string {
  const bounded = truncateToLimit(text, budget.remaining);
  budget.remaining -= bounded.text.length;
  budget.truncated ||= bounded.truncated;
  return bounded.text;
}

function takeArrayWithinBudget(values: string[], budget: TextBudget): string[] {
  return values.map((value) => takeWithinBudget(value, budget));
}

function takeEncounterWithinBudget(
  encounter: EncounterRecord,
  budget: TextBudget,
): EncounterRecord {
  return {
    ...encounter,
    ...(encounter.title !== undefined
      ? { title: takeWithinBudget(encounter.title, budget) }
      : {}),
    description: takeWithinBudget(encounter.description, budget),
    ...(encounter.conditions
      ? { conditions: takeArrayWithinBudget(encounter.conditions, budget) }
      : {}),
    alternativeSolutions: encounter.alternativeSolutions.map((solution) => ({
      ...solution,
      method: takeWithinBudget(solution.method, budget),
      description: takeWithinBudget(solution.description, budget),
    })),
  };
}

function countStructuredTextCharacters(
  result: Pick<
    AdventureRetrievalResult,
    "title" | "readAloud" | "body" | "conditions" | "encounters" | "secrets"
  >,
): number {
  return (
    result.title.length +
    result.readAloud.reduce((total, text) => total + text.length, 0) +
    result.body.length +
    result.conditions.reduce((total, text) => total + text.length, 0) +
    result.encounters.reduce(
      (total, encounter) =>
        total +
        (encounter.title?.length ?? 0) +
        encounter.description.length +
        (encounter.conditions?.reduce((sum, text) => sum + text.length, 0) ??
          0) +
        encounter.alternativeSolutions.reduce(
          (sum, solution) =>
            sum + solution.method.length + solution.description.length,
          0,
        ),
      0,
    ) +
    result.secrets.reduce((total, secret) => total + secret.text.length, 0)
  );
}

function emptyRetrievalResult(sceneId: string): AdventureRetrievalResult {
  return {
    sceneId,
    found: false,
    citations: [],
    title: "",
    readAloud: [],
    body: "",
    conditions: [],
    encounters: [],
    secrets: [],
    formatted: "",
    characterCount: 0,
    truncated: false,
  };
}

function formatSectionContext(
  section: SectionAnchor,
  readAloud: string[],
  encounters: EncounterRecord[],
  secrets: SecretRecord[],
): string {
  const parts: string[] = [`## ${section.title} [${section.sourceId}]`];

  for (const block of readAloud) {
    parts.push(`> Read aloud: ${block}`);
  }

  if (section.body.length > 0) {
    parts.push(section.body);
  }

  const altLines = encounters
    .flatMap((enc) => enc.alternativeSolutions)
    .filter((alt) => !section.body.includes(alt.description))
    .map((alt) => `- By ${alt.method}: ${alt.description}`);
  parts.push(...altLines);

  for (const secret of secrets) {
    parts.push(`> GM only: ${secret.text}`);
  }

  return parts.join("\n\n");
}

export function retrieveAdventureContext(
  pkg: AdventureSourcePackage,
  options: RetrieveAdventureContextOptions,
): AdventureRetrievalResult {
  const includeGmOnly = options.includeGmOnly ?? false;
  const requestedMax = options.maxCharacters ?? MAX_ADVENTURE_RETRIEVAL_CHARS;
  const maxCharacters = Number.isNaN(requestedMax)
    ? 0
    : Math.min(
        MAX_ADVENTURE_RETRIEVAL_CHARS,
        Math.max(0, Math.floor(requestedMax)),
      );

  const section = pkg.sections.find((s) => s.sourceId === options.sceneId);
  if (!section || (section.gmOnly && !includeGmOnly)) {
    return emptyRetrievalResult(options.sceneId);
  }

  const budget: TextBudget = { remaining: maxCharacters, truncated: false };
  const title = takeWithinBudget(section.title, budget);
  const readAloud = takeArrayWithinBudget(
    normalizeReadAloud(section.readAloud),
    budget,
  );
  const body = takeWithinBudget(section.body, budget);
  const scene = pkg.scenes.find((s) => s.sourceId === section.sourceId);
  const conditions = takeArrayWithinBudget(scene?.conditions ?? [], budget);
  const encounters = pkg.encounters
    .filter((e) => e.sourceId === section.sourceId)
    .map((encounter) => takeEncounterWithinBudget(encounter, budget));
  const secrets = includeGmOnly
    ? pkg.secrets
        .filter((s) => s.sourceId === section.sourceId)
        .map((secret): SecretRecord => ({
          ...secret,
          text: takeWithinBudget(secret.text, budget),
        }))
    : [];

  const titleAndBodyForFormatting = { ...section, title, body };
  const { text: formatted, truncated: formattedTruncated } = truncateToLimit(
    formatSectionContext(
      titleAndBodyForFormatting,
      readAloud,
      encounters,
      secrets,
    ),
    maxCharacters,
  );
  const structuredCharacterCount = countStructuredTextCharacters({
    title,
    readAloud,
    body,
    conditions,
    encounters,
    secrets,
  });

  return {
    sceneId: section.sourceId,
    found: true,
    citations: [section.sourceId],
    title,
    readAloud,
    body,
    conditions,
    encounters,
    secrets,
    formatted,
    characterCount: Math.max(formatted.length, structuredCharacterCount),
    truncated: budget.truncated || formattedTruncated,
  };
}
