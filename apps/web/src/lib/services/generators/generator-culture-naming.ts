import { sampleNameExamples } from "generator-engine";
import type { Entity } from "schema";

/**
 * Looks up the naming conventions a vault already records for a culture, so a
 * new "Stormber" character is named like a Stormber, not like the model's
 * generic-fantasy default.
 *
 * A vault keeps this in two places:
 *  - labels ("Stormber culture", "Stormberi", "Dunirr language"), which are
 *    always in memory — used to pick the culture and find its member names;
 *  - notes ("Clan Leadership of the Stormber … drawing inspiration from the
 *    Magyar"), whose content is only in memory once opened — so selection here
 *    uses titles/labels, and the caller loads just the chosen few before
 *    {@link buildCultureGuidance} reads them.
 */

export interface CultureNamingSources {
  /** Display name of the culture, as written in the vault (e.g. "Stormber"). */
  culture: string;
  /** Names of same-type entities that belong to the culture. */
  examples: string[];
  /** Notes likely to record the culture's naming conventions. Load before use. */
  docIds: string[];
}

export interface ResolveCultureNamingOptions {
  allEntities: Record<string, Entity>;
  sourceEntity?: Entity;
  connectedIds?: Set<string>;
  instructions?: string;
  targetEntityType?: string;
}

const CULTURE_LABEL = /^(.+?)\s+(?:culture|language)$/i;
const MIN_EXAMPLES = 3;
const MAX_DOCS = 8;
const MAX_GUIDANCE_CHARS = 900;
const MAX_SENTENCE_CHARS = 260;
const MAX_SENTENCES_PER_DOC = 3;
/** Title words that suggest a note records naming rules. */
const NAMING_TITLE = /nam(?:e|es|ing)|convention|inspir|influenc|linguistic/i;
/** Sentence cues for naming guidance inside a note. */
const NAMING_CUE =
  /\b(?:nam(?:e|es|ed|ing)|inspir\w*|influenc\w*|magyar|hungarian|surnames?|given names?|phonetic\w*|linguistic\w*|pronounc\w*|conventions?)\b/i;

/** "Srathi (orcish) culture" → "Srathi". Undefined when it isn't a culture/language label. */
export function cultureLabelBase(label: string): string | undefined {
  const match = CULTURE_LABEL.exec(label.trim());
  if (!match) return undefined;
  const base = match[1].replace(/\s*\([^)]*\)\s*/g, " ").trim();
  return base || undefined;
}

export function collectCultures(
  entities: Record<string, Entity>,
): Map<string, { name: string; count: number }> {
  const cultures = new Map<string, { name: string; count: number }>();
  for (const id in entities) {
    if (!Object.hasOwn(entities, id)) continue;
    for (const label of entities[id].labels ?? []) {
      const base = cultureLabelBase(label);
      if (!base) continue;
      const key = base.toLowerCase();
      const entry = cultures.get(key) ?? { name: base, count: 0 };
      entry.count += 1;
      cultures.set(key, entry);
    }
  }
  return cultures;
}

/** True when a label puts its entity in the culture: "X culture", "X language", or a demonym like "Stormberi". */
function labelBelongsTo(label: string, key: string): boolean {
  const lower = label.toLowerCase().trim();
  if (cultureLabelBase(label)?.toLowerCase() === key) return true;
  return (
    lower.startsWith(key) &&
    !lower.includes(" ") &&
    lower.length <= key.length + 4
  );
}

function inCulture(entity: Entity, key: string): boolean {
  return (entity.labels ?? []).some((l) => labelBelongsTo(l, key));
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Earliest culture named in the text, matched as a whole word (so "stormberry" ≠ "Stormber"). */
function cultureNamedIn(
  text: string | undefined,
  cultures: Map<string, { name: string; count: number }>,
): string | undefined {
  if (!text) return undefined;
  let best: { key: string; index: number } | undefined;
  for (const key of cultures.keys()) {
    const match = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(key)}(?![\\p{L}\\p{N}])`,
      "iu",
    ).exec(text);
    if (match && (!best || match.index < best.index)) {
      best = { key, index: match.index };
    }
  }
  return best?.key;
}

function cultureOfEntity(
  entity: Entity | undefined,
  cultures: Map<string, { name: string; count: number }>,
): string | undefined {
  if (!entity) return undefined;
  for (const key of cultures.keys()) {
    if (inCulture(entity, key)) return key;
  }
  return undefined;
}

function tallyCultures(
  opts: ResolveCultureNamingOptions,
  cultures: Map<string, { name: string; count: number }>,
): Map<string, number> {
  const tally = new Map<string, number>();
  for (const id of opts.connectedIds ?? []) {
    const key = cultureOfEntity(opts.allEntities[id], cultures);
    if (key) tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  return tally;
}

/** The culture most of the connected entities share, when there is a clear majority. */
function dominantNeighbourCulture(
  opts: ResolveCultureNamingOptions,
  cultures: Map<string, { name: string; count: number }>,
): string | undefined {
  const [top] = [...tallyCultures(opts, cultures).entries()].sort(
    (a, b) => b[1] - a[1],
  );
  if (!top) return undefined;
  const isMajority = top[1] >= 2 && top[1] * 2 > (opts.connectedIds?.size ?? 0);
  return isMajority ? top[0] : undefined;
}

function detectCulture(
  opts: ResolveCultureNamingOptions,
  cultures: Map<string, { name: string; count: number }>,
): string | undefined {
  return (
    cultureNamedIn(opts.instructions, cultures) ??
    cultureOfEntity(opts.sourceEntity, cultures) ??
    dominantNeighbourCulture(opts, cultures)
  );
}

function docRank(entity: Entity, key: string): number {
  const haystack =
    `${entity.title} ${(entity.labels ?? []).join(" ")}`.toLowerCase();
  const namesCulture = haystack.includes(key);
  const aboutNaming = NAMING_TITLE.test(entity.title);
  if (namesCulture && aboutNaming) return 0;
  if (aboutNaming && entity.type === "note") return 1;
  if (namesCulture && entity.type === "note") return 2;
  return 3;
}

/** Candidate notes (by title/label only) that may record the culture's naming rules; filtered by content once loaded. */
function findNamingDocs(
  entities: Record<string, Entity>,
  key: string,
): string[] {
  const ranked: Array<{ id: string; rank: number }> = [];
  for (const id in entities) {
    if (!Object.hasOwn(entities, id)) continue;
    const rank = docRank(entities[id], key);
    if (rank < 3) ranked.push({ id, rank });
  }
  return ranked
    .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id))
    .slice(0, MAX_DOCS)
    .map((r) => r.id);
}

function memberNames(
  entities: Record<string, Entity>,
  key: string,
  targetEntityType?: string,
): string[] {
  const names: string[] = [];
  for (const id in entities) {
    if (!Object.hasOwn(entities, id)) continue;
    const entity = entities[id];
    if (targetEntityType && entity.type !== targetEntityType) continue;
    if (entity.title && inCulture(entity, key)) names.push(entity.title);
  }
  return names;
}

export function resolveCultureNaming(
  opts: ResolveCultureNamingOptions,
): CultureNamingSources | undefined {
  const cultures = collectCultures(opts.allEntities);
  const key = detectCulture(opts, cultures);
  if (!key) return undefined;
  const members = memberNames(opts.allEntities, key, opts.targetEntityType);
  return {
    culture: cultures.get(key)!.name,
    examples: members.length >= MIN_EXAMPLES ? sampleNameExamples(members) : [],
    docIds: findNamingDocs(opts.allEntities, key),
  };
}

function sentencesOf(text: string): string[] {
  return text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The sentences of a note that talk about names, inspiration or linguistic influence. */
export function extractNamingGuidance(entity: Entity): string[] {
  const text = `${entity.content ?? ""} ${entity.lore ?? ""}`;
  return sentencesOf(text)
    .filter((s) => NAMING_CUE.test(s))
    .slice(0, MAX_SENTENCES_PER_DOC)
    .map((s) =>
      s.length > MAX_SENTENCE_CHARS ? `${s.slice(0, MAX_SENTENCE_CHARS)}…` : s,
    );
}

/** A note belongs to the culture when its title, labels or text name it. */
function mentionsCulture(entity: Entity, culture: string): boolean {
  const needle = culture.toLowerCase();
  const haystack = [
    entity.title,
    ...(entity.labels ?? []),
    entity.content ?? "",
    entity.lore ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

/**
 * Naming guidance from the candidate notes (content must already be loaded).
 * Titles alone can't say which culture a naming note is about, so only notes
 * that actually mention the culture contribute — a "Names of the Morvali" note
 * must not steer a Stormber character. Capped by a size budget.
 */
export function buildCultureGuidance(
  entities: Record<string, Entity>,
  docIds: string[],
  culture: string,
): string[] {
  const out: string[] = [];
  let used = 0;
  for (const id of docIds) {
    const entity = entities[id];
    if (!entity || !mentionsCulture(entity, culture)) continue;
    for (const sentence of extractNamingGuidance(entity)) {
      if (used + sentence.length > MAX_GUIDANCE_CHARS) return out;
      out.push(sentence);
      used += sentence.length;
    }
  }
  return out;
}
