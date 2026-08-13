export interface SessionEntity {
  id: string;
  type: string;
  /** Vault entity sub-kind (e.g. "language" on notes), carried through saves. */
  kind?: string;
  title: string;
  summary?: string;
  content: string;
  lore?: string;
  labels: string[];
  status: "active" | "draft";
  reuseEnabled: boolean;
  pinned: boolean;
  /** Whether this draft is included by the session hub's selected-save action. */
  selectedForSave?: boolean;
  createdOrder: number;
}

export interface ContextSelection {
  entities: SessionEntity[];
  trimmed: boolean;
}

export interface ProvenanceRecord {
  resultEntityId: string;
  usedEntityIds: string[];
  offeredEntityIds: string[];
  trimmed: boolean;
}

/**
 * Derives the active context selection from the available session entities.
 * Applies budgeting if the selection exceeds the budget limit.
 * Keeps all pinned entities first, then most recent by createdOrder, up to budget.
 */
export function getContextSelection(
  entities: SessionEntity[],
  budget: number = 50,
): ContextSelection {
  const activeEntities = entities.filter((e) => e.reuseEnabled);

  if (activeEntities.length <= budget) {
    return {
      entities: activeEntities,
      trimmed: false,
    };
  }

  const pinned = activeEntities.filter((e) => e.pinned);
  const unpinned = activeEntities.filter((e) => !e.pinned);

  // Sort unpinned by createdOrder descending (most recent first)
  unpinned.sort((a, b) => b.createdOrder - a.createdOrder);

  // Keep all pinned first, then fill remaining budget with unpinned
  const result: SessionEntity[] = [...pinned];

  if (result.length < budget) {
    const remainingBudget = budget - result.length;
    result.push(...unpinned.slice(0, remainingBudget));
  }

  // Restore original sorting (createdOrder ascending)
  result.sort((a, b) => a.createdOrder - b.createdOrder);

  return {
    entities: result,
    trimmed: true,
  };
}

/**
 * Computes post-hoc matching between generated text and offered entities
 * to find which ones were actually used (referenced by title).
 */
export function computeProvenance(
  resultEntityId: string,
  generatedText: string,
  offeredEntities: SessionEntity[],
  trimmed: boolean,
): ProvenanceRecord {
  const usedEntityIds: string[] = [];

  for (const entity of offeredEntities) {
    if (!entity.title) continue;

    // Escape regex specials from title
    const escapedTitle = entity.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Check if the title is mentioned as a whole word, case insensitive
    // If title has no word characters, fallback to simple includes
    const hasWordChars = /\w/.test(entity.title);

    const isMatch = hasWordChars
      ? new RegExp(`(?<=^|\\W)${escapedTitle}(?=$|\\W)`, "i").test(
          generatedText,
        )
      : generatedText.toLowerCase().includes(entity.title.toLowerCase());

    if (isMatch) {
      usedEntityIds.push(entity.id);
    }
  }

  return {
    resultEntityId,
    usedEntityIds,
    offeredEntityIds: offeredEntities.map((e) => e.id),
    trimmed,
  };
}
