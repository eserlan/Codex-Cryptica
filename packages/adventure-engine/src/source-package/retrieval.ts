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
  const maxCharacters = Math.max(
    0,
    options.maxCharacters ?? MAX_ADVENTURE_RETRIEVAL_CHARS,
  );

  const section = pkg.sections.find((s) => s.sourceId === options.sceneId);
  if (!section || (section.gmOnly && !includeGmOnly)) {
    return emptyRetrievalResult(options.sceneId);
  }

  const readAloud = normalizeReadAloud(section.readAloud);
  const scene = pkg.scenes.find((s) => s.sourceId === section.sourceId);
  const conditions = scene?.conditions ?? [];
  const encounters = pkg.encounters.filter(
    (e) => e.sourceId === section.sourceId,
  );
  const secrets = includeGmOnly
    ? pkg.secrets.filter((s) => s.sourceId === section.sourceId)
    : [];

  const rawFormatted = formatSectionContext(
    section,
    readAloud,
    encounters,
    secrets,
  );
  const { text: formatted, truncated } = truncateToLimit(
    rawFormatted,
    maxCharacters,
  );

  return {
    sceneId: section.sourceId,
    found: true,
    citations: [section.sourceId],
    title: section.title,
    readAloud,
    body: section.body,
    conditions,
    encounters,
    secrets,
    formatted,
    characterCount: formatted.length,
    truncated,
  };
}
