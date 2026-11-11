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

export interface FactPromotionDeps {
  /** False once the player has moved to another adventure or Vault. */
  isCurrent(): boolean;
  findExistingId(title: string): string | undefined;
  createEntity(
    type: EntityType,
    title: string,
    data: AdventureEntityDraft["initialData"],
  ): Promise<string>;
  /** Called with each fact's Vault record id, new or already there. */
  linkRecord(fact: ProvisionalFact, recordId: string): Promise<void>;
  /** Called before a fact is handled, so a caller can remember it was tried. */
  onAttempt?(fact: ProvisionalFact): void;
}

export interface FactPromotionResult {
  added: number;
  /** True when the adventure or Vault changed before every fact was handled. */
  interrupted: boolean;
}

/**
 * Saves player-visible facts to the Vault one by one and ties each to its record.
 * Linking may itself save the adventure, so currency is judged by `isCurrent`,
 * never by the identity of a session object captured before the loop.
 */
export async function promoteProvisionalFacts(
  facts: ProvisionalFact[],
  adventureTitle: string,
  deps: FactPromotionDeps,
): Promise<FactPromotionResult> {
  let added = 0;
  for (const fact of facts) {
    if (!deps.isCurrent()) return { added, interrupted: true };
    deps.onAttempt?.(fact);
    const draft = createAdventureEntityDraft(fact, adventureTitle);
    if (!draft) continue;
    const existingId = deps.findExistingId(draft.title);
    if (existingId) {
      await deps.linkRecord(fact, existingId);
      continue;
    }
    const recordId = await deps.createEntity(
      draft.type,
      draft.title,
      draft.initialData,
    );
    await deps.linkRecord(fact, recordId);
    added += 1;
  }
  return { added, interrupted: false };
}
