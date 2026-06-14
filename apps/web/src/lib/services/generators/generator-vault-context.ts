import type {
  GeneratorVaultContext,
  VaultContextEntityExcerpt,
} from "generator-engine";
import { BANNED_NAMES } from "$lib/services/seo/generators/banned-names";
import type { Entity } from "schema";

/** Maximum number of neighboring entities included in the context packet. */
const MAX_NEIGHBORS = 5;
/** Maximum number of world-grounding entity excerpts included. */
const MAX_WORLD_SAMPLE = 6;
/** Maximum character length of any individual excerpt. */
const MAX_EXCERPT_CHARS = 300;

/**
 * Highest year found across all entities' structured temporal metadata
 * (`date`, `start_date`, `end_date`). Used as a fallback "current year" when
 * the vault's calendar has no explicit present year set — treating the most
 * recent recorded event as the campaign's present. Returns undefined when no
 * entity carries a structured date.
 */
export function latestTemporalYear(
  entities: Record<string, Entity>,
): number | undefined {
  let max: number | undefined;
  for (const e of Object.values(entities)) {
    for (const t of [e.date, e.start_date, e.end_date]) {
      const year = (t as { year?: number } | undefined)?.year;
      if (typeof year === "number" && (max === undefined || year > max)) {
        max = year;
      }
    }
  }
  return max;
}

/**
 * Flatten markdown into a single clean line: drop heading markers (so a source
 * entity's "## Summary" can't collide with the generator template's headings)
 * and collapse newlines/whitespace (so each entity stays on one context line).
 */
function flatten(text: string | undefined): string {
  if (!text) return "";
  return text
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(text: string | undefined): string {
  const flattened = flatten(text);
  return flattened.length > MAX_EXCERPT_CHARS
    ? flattened.slice(0, MAX_EXCERPT_CHARS) + "…"
    : flattened;
}

function entityToExcerpt(
  entity: Entity,
  relationship?: string,
  /** Source entity: include full content/lore (not truncated) as the anchor. */
  full = false,
): VaultContextEntityExcerpt {
  const render = full ? flatten : excerpt;
  return {
    id: entity.id,
    title: entity.title,
    type: entity.type,
    relationship,
    contentExcerpt: render(entity.content),
    loreExcerpt: render(entity.lore),
    labels: entity.labels ?? [],
  };
}

export interface BuildVaultContextOptions {
  themeId: string;
  themeName?: string;
  /** Current in-world campaign date/year, when the vault's calendar sets one. */
  currentDate?: string;
  /** The entity the user launched generation from (contextual mode). */
  sourceEntity?: Entity;
  /** All entities in the vault (used for neighbor lookup and title hints). */
  allEntities: Record<string, Entity>;
  /**
   * Set of entity ids directly connected to the source entity (first-degree
   * graph neighbors). When provided, neighbors are selected from this set
   * rather than from same-type vault entities.
   */
  connectedIds?: Set<string>;
  categoryLabels: Array<{ id: string; label: string }>;
  labelSuggestions?: string[];
  applyTemplate?: boolean;
  templateOutline?: string;
  /** Resolved vault category the draft will be created as. */
  targetEntityType?: string;
  /**
   * Entity ids ranked by relevance to the user's request (from the non-AI
   * search engine). When provided, the world-grounding sample prefers these,
   * backfilling with same-type entities. Order is significant.
   */
  relevantIds?: string[];
}

/**
 * Builds a bounded {@link GeneratorVaultContext} packet from live vault state.
 * Caps neighbors at {@link MAX_NEIGHBORS} and excerpts to {@link MAX_EXCERPT_CHARS}
 * to avoid sending full vault contents to the generator.
 */
export function buildVaultContext(
  opts: BuildVaultContextOptions,
): GeneratorVaultContext {
  const {
    themeId,
    themeName,
    currentDate,
    sourceEntity,
    allEntities,
    connectedIds,
    categoryLabels,
    labelSuggestions = [],
    applyTemplate = false,
    templateOutline,
    targetEntityType,
    relevantIds,
  } = opts;

  // Name ban list: only titles of the SAME type being generated. Banning a new
  // character against existing character names is useful; banning it against
  // event titles, session logs, places, or lore concepts is noise. When no
  // target type is known, fall back to all titles.
  const MAX_TITLES = 50;
  const namePool = targetEntityType
    ? Object.values(allEntities).filter((e) => e.type === targetEntityType)
    : Object.values(allEntities);
  const existingTitles = namePool.map((e) => e.title).slice(0, MAX_TITLES);

  // Neighbors: first-degree graph connections when available, otherwise
  // same-type entities as a fallback for vaults without connection data.
  let neighbors: VaultContextEntityExcerpt[] = [];
  if (sourceEntity) {
    if (connectedIds && connectedIds.size > 0) {
      neighbors = [...connectedIds]
        .map((id) => allEntities[id])
        .filter((e): e is Entity => !!e)
        .slice(0, MAX_NEIGHBORS)
        .map((e) => entityToExcerpt(e));
    } else {
      neighbors = Object.values(allEntities)
        .filter((e) => e.id !== sourceEntity.id && e.type === sourceEntity.type)
        .slice(0, MAX_NEIGHBORS)
        .map((e) => entityToExcerpt(e));
    }
  }

  // World sample: positive grounding for the AI. Prefers entities the non-AI
  // search engine ranked as relevant to the user's request, then backfills with
  // same-type entities (matching tone) and finally any remaining entities.
  // Excludes the source and already-listed neighbors. Order is significant.
  const seen = new Set<string>();
  if (sourceEntity) seen.add(sourceEntity.id);
  for (const n of neighbors) seen.add(n.id);
  const ordered: Entity[] = [];
  const consider = (e: Entity | undefined) => {
    if (e && !seen.has(e.id)) {
      seen.add(e.id);
      ordered.push(e);
    }
  };
  for (const id of relevantIds ?? []) consider(allEntities[id]);
  const samplePool = Object.values(allEntities);
  if (targetEntityType) {
    for (const e of samplePool) {
      if (e.type === targetEntityType) consider(e);
    }
  }
  for (const e of samplePool) consider(e);
  const worldSample = ordered
    .slice(0, MAX_WORLD_SAMPLE)
    .map((e) => entityToExcerpt(e));

  const includedContext: GeneratorVaultContext["includedContext"] = [
    "categories",
  ];
  if (themeId && themeId !== "workspace") includedContext.push("theme");
  if (sourceEntity) includedContext.push("source");
  if (neighbors.length) includedContext.push("neighbors");
  if (worldSample.length) includedContext.push("world");
  if (existingTitles.length) includedContext.push("titles");
  if (labelSuggestions.length) includedContext.push("labels");

  return {
    themeId,
    themeName,
    currentDate,
    targetEntityType,
    categoryLabels,
    sourceEntity: sourceEntity
      ? entityToExcerpt(sourceEntity, undefined, true)
      : undefined,
    neighbors,
    worldSample,
    existingTitles,
    bannedNames: [...BANNED_NAMES],
    labelSuggestions,
    applyTemplate,
    templateOutline,
    includedContext,
  };
}
