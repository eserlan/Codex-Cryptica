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
