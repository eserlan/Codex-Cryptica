import type {
  GeneratorVaultContext,
  VaultContextEntityExcerpt,
} from "generator-engine";
import { BANNED_NAMES } from "generator-engine";
import type { Entity } from "schema";

/** Maximum number of neighboring entities included in the context packet. */
const MAX_NEIGHBORS = 5;
/** Maximum number of world-grounding entity excerpts included. */
const MAX_WORLD_SAMPLE = 6;
/** Maximum character length of a background (neighbor/world) excerpt. */
const MAX_EXCERPT_CHARS = 300;
/**
 * Maximum length of the source entity's excerpt. Generous (it's the anchor) but
 * bounded, so a very long source entry can't dominate the prompt and drown the
 * user's instruction.
 */
const MAX_SOURCE_CHARS = 1500;
/** Vault category id for events (included as grounding for any new entity). */
const EVENT_TYPE = "event";
/** Vault category id for notes (lowest-priority grounding). */
const NOTE_TYPE = "note";

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
  for (const id in entities) {
    const e = entities[id];
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

function clampFlat(text: string | undefined, max: number): string {
  const flattened = flatten(text);
  return flattened.length > max ? flattened.slice(0, max) + "…" : flattened;
}

function excerpt(text: string | undefined): string {
  return clampFlat(text, MAX_EXCERPT_CHARS);
}

function entityToExcerpt(
  entity: Entity,
  relationship?: string,
  /** Source entity: include a generous (but bounded) excerpt as the anchor. */
  full = false,
): VaultContextEntityExcerpt {
  const render = full
    ? (t: string | undefined) => clampFlat(t, MAX_SOURCE_CHARS)
    : excerpt;
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
  // ⚡ Bolt Optimization: Use imperative loop with early exit to avoid intermediate
  // arrays from Object.values().filter().map().slice()
  const existingTitles: string[] = [];
  for (const id in allEntities) {
    if (existingTitles.length >= MAX_TITLES) break;
    if (!Object.hasOwn(allEntities, id)) continue;
    const e = allEntities[id];
    if (targetEntityType && e.type !== targetEntityType) continue;
    if (e.title) existingTitles.push(e.title);
  }

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
      // ⚡ Bolt Optimization: Replace inline Object.values().filter().slice().map()
      // with imperative loop and early exit
      for (const id in allEntities) {
        if (neighbors.length >= MAX_NEIGHBORS) break;
        if (!Object.hasOwn(allEntities, id)) continue;
        const e = allEntities[id];
        if (e.id !== sourceEntity.id && e.type === sourceEntity.type) {
          neighbors.push(entityToExcerpt(e));
        }
      }
    }
  }

  // World sample: positive grounding for the AI, in priority order:
  //   1. search-relevant entities (ranked by the non-AI search engine)
  //   2. same-type entities (matching tone for the category being generated)
  //   3. events (timeline/world context useful for any new entity)
  //   4. other entities
  //   5. notes (lowest priority — usually meta, not world canon)
  // Excludes the source and already-listed neighbors. Order is significant.
  const seen = new Set<string>();
  if (sourceEntity) seen.add(sourceEntity.id);
  for (const n of neighbors) seen.add(n.id);
  const ordered: Entity[] = [];
  const consider = (e: Entity | undefined) => {
    // ⚡ Bolt Optimization: Early exit if we have enough items
    if (ordered.length >= MAX_WORLD_SAMPLE) return;
    if (e && !seen.has(e.id)) {
      seen.add(e.id);
      ordered.push(e);
    }
  };

  for (const id of relevantIds ?? []) consider(allEntities[id]);

  // ⚡ Bolt Optimization: Iterate over keys rather than Object.values() array allocation
  if (targetEntityType) {
    for (const id in allEntities) {
      if (ordered.length >= MAX_WORLD_SAMPLE) break;
      if (!Object.hasOwn(allEntities, id)) continue;
      const e = allEntities[id];
      if (e.type === targetEntityType) consider(e);
    }
  }
  for (const id in allEntities) {
    if (ordered.length >= MAX_WORLD_SAMPLE) break;
    if (!Object.hasOwn(allEntities, id)) continue;
    const e = allEntities[id];
    if (e.type === EVENT_TYPE) consider(e);
  }
  for (const id in allEntities) {
    if (ordered.length >= MAX_WORLD_SAMPLE) break;
    if (!Object.hasOwn(allEntities, id)) continue;
    const e = allEntities[id];
    if (e.type !== NOTE_TYPE) consider(e);
  }
  for (const id in allEntities) {
    if (ordered.length >= MAX_WORLD_SAMPLE) break;
    if (!Object.hasOwn(allEntities, id)) continue;
    consider(allEntities[id]); // notes last
  }

  const worldSample = ordered
    // ordered is already max bounded by consider logic
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
