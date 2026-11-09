import type { ProvisionalFact } from "@codex/adventure-engine";
import type { EntityType } from "schema";

export interface AdventureEntityDraft {
  type: EntityType;
  title: string;
  initialData: { content: string };
}

const ENTITY_TYPE_BY_FACT_KIND: Record<ProvisionalFact["kind"], EntityType> = {
  person: "character",
  place: "location",
  faction: "faction",
  item: "item",
  event: "event",
  clue: "note",
  other: "note",
};

/** Converts a player-visible adventure fact into a safe, ordinary Codex draft. */
export function createAdventureEntityDraft(
  fact: ProvisionalFact,
  adventureTitle: string,
): AdventureEntityDraft | null {
  if (fact.visibility !== "player-visible") return null;
  return {
    type: ENTITY_TYPE_BY_FACT_KIND[fact.kind],
    title: fact.name,
    initialData: {
      content: `${fact.summary}\n\n*Introduced during the adventure “${adventureTitle}”.*`,
    },
  };
}

/**
 * Filters and deduplicates player-visible provisional facts for Vault promotion.
 * Removes GM secrets, already-saved or discarded IDs, existing vault title collisions,
 * and duplicate titles within the same batch.
 */
export function batchFilterPromotableFacts(
  facts: ProvisionalFact[],
  existingTitles: string[],
  excludedIds: string[] = [],
): ProvisionalFact[] {
  const seenNames = new Set<string>();
  const normalizedExisting = new Set(
    existingTitles.map((title) => title.trim().toLocaleLowerCase()),
  );
  const excluded = new Set(excludedIds);

  return facts.filter((fact) => {
    if (fact.visibility !== "player-visible") return false;
    if (excluded.has(fact.id)) return false;
    const normalizedName = fact.name.trim().toLocaleLowerCase();
    if (!normalizedName) return false;
    if (normalizedExisting.has(normalizedName)) return false;
    if (seenNames.has(normalizedName)) return false;
    seenNames.add(normalizedName);
    return true;
  });
}
