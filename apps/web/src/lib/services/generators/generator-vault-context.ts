import type {
  GeneratorVaultContext,
  VaultContextEntityExcerpt,
} from "generator-engine";
import type { Entity } from "schema";

/** Maximum number of neighboring entities included in the context packet. */
const MAX_NEIGHBORS = 5;
/** Maximum character length of any individual excerpt. */
const MAX_EXCERPT_CHARS = 300;

function excerpt(text: string | undefined): string {
  if (!text) return "";
  return text.length > MAX_EXCERPT_CHARS
    ? text.slice(0, MAX_EXCERPT_CHARS) + "…"
    : text;
}

function entityToExcerpt(
  entity: Entity,
  relationship?: string,
): VaultContextEntityExcerpt {
  return {
    id: entity.id,
    title: entity.title,
    type: entity.type,
    relationship,
    contentExcerpt: excerpt(entity.content),
    loreExcerpt: excerpt(entity.lore),
    labels: entity.labels ?? [],
  };
}

export interface BuildVaultContextOptions {
  themeId: string;
  themeName?: string;
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
    sourceEntity,
    allEntities,
    connectedIds,
    categoryLabels,
    labelSuggestions = [],
    applyTemplate = false,
    templateOutline,
  } = opts;

  const existingTitles = Object.values(allEntities).map((e) => e.title);

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

  const includedContext: GeneratorVaultContext["includedContext"] = [
    "categories",
  ];
  if (themeId && themeId !== "workspace") includedContext.push("theme");
  if (sourceEntity) includedContext.push("source");
  if (neighbors.length) includedContext.push("neighbors");
  if (existingTitles.length) includedContext.push("titles");
  if (labelSuggestions.length) includedContext.push("labels");

  return {
    themeId,
    themeName,
    categoryLabels,
    sourceEntity: sourceEntity ? entityToExcerpt(sourceEntity) : undefined,
    neighbors,
    existingTitles,
    labelSuggestions,
    applyTemplate,
    templateOutline,
    includedContext,
  };
}
