/**
 * Business / Enterprise Generator (#3627, spec 180) — in-app vault save.
 * Applies the user's ticks to the save plan, then creates the ticked entities
 * and their connections. On failure it removes everything this save created
 * and reports when the vault could not complete that rollback (User Story 4).
 */

import type {
  BusinessPartyChoice,
  BusinessSavePlan,
  BusinessRelationshipLabel,
} from "generator-engine";

export interface BusinessVaultGateway {
  createEntity(
    type: "faction" | "character",
    title: string,
    data: {
      content?: string;
      lore?: string;
      labels?: string[];
      status?: "active" | "draft";
    },
  ): Promise<string | { id: string }>;
  addConnection(
    sourceId: string,
    targetId: string,
    type: string,
    label?: string,
  ): Promise<unknown>;
  bulkDelete(ids: string[]): Promise<{
    failedIds: string[];
    cancelledIds: string[];
  }>;
}

/** The user's choices from the save step. Anything left out keeps the plan's default. */
export interface BusinessSaveChoices {
  tickedPersonIds?: readonly string[];
  partyTicks?: Record<string, boolean>;
  renames?: Record<string, string>;
  sourceTicked?: boolean;
  sourceLabel?: BusinessRelationshipLabel;
  signal?: AbortSignal;
}

export interface BusinessVaultSaveResult {
  businessId: string;
  personIds: Record<string, string>;
  partyIds: Record<string, string>;
}

function incompleteRollback(cause: unknown): Error {
  return new Error(
    "Business save failed and rollback was incomplete; one or more created records may remain in the vault.",
    { cause },
  );
}

/** Returns a copy of the plan with the user's ticks, renames and source label applied. */
/** Replaces every whole-occurrence of `from` in `text`. An empty or unchanged name is a no-op. */
function renameIn(text: string, from: string, to: string): string {
  return from && from !== to ? text.split(from).join(to) : text;
}

export function applyBusinessChoices(
  plan: BusinessSavePlan,
  choices: BusinessSaveChoices,
): BusinessSavePlan {
  const ticked = choices.tickedPersonIds
    ? new Set(choices.tickedPersonIds)
    : null;
  const rename = (title: string, personId?: string) =>
    (personId && choices.renames?.[personId]) || title;
  // A renamed person must not stay named in the business text.
  let content = plan.business.content;
  for (const p of plan.people) {
    const to = choices.renames?.[p.personId];
    if (to) content = renameIn(content, p.draft.title, to);
  }
  const businessTitle = choices.renames?.business ?? plan.business.title;
  content = renameIn(content, plan.business.title, businessTitle);
  return {
    ...plan,
    business: {
      ...plan.business,
      title: businessTitle,
      content,
    },
    people: plan.people.map((p) => ({
      ...p,
      ticked: ticked ? ticked.has(p.personId) : p.ticked,
      draft: { ...p.draft, title: rename(p.draft.title, p.personId) },
    })),
    parties: plan.parties.map((party) => {
      const choice = party.choice;
      const tickedNow = choices.partyTicks?.[party.relationshipId];
      if (tickedNow === undefined) return party;
      const next: BusinessPartyChoice = { ...choice, ticked: tickedNow };
      return { ...party, choice: next };
    }),
    source: plan.source
      ? {
          ...plan.source,
          ticked: choices.sourceTicked ?? plan.source.ticked,
          label: choices.sourceLabel ?? plan.source.label,
        }
      : undefined,
  };
}

function idOf(created: string | { id: string }): string {
  return typeof created === "string" ? created : created.id;
}

interface SaveState {
  vault: BusinessVaultGateway;
  businessId: string;
  created: string[];
  personIds: Record<string, string>;
  partyIds: Record<string, string>;
}

async function createTracked(
  state: SaveState,
  type: "faction" | "character",
  draft: { title: string; content: string; labels: string[] },
): Promise<string> {
  const id = idOf(
    await state.vault.createEntity(type, draft.title, {
      content: draft.content,
      labels: draft.labels,
      status: "active",
    }),
  );
  state.created.push(id);
  return id;
}

async function savePeople(
  state: SaveState,
  people: BusinessSavePlan["people"],
): Promise<void> {
  for (const person of people) {
    if (!person.ticked) continue;
    const id = await createTracked(state, "character", person.draft);
    state.personIds[person.personId] = id;
    await state.vault.addConnection(state.businessId, id, person.link);
  }
}

async function saveParties(
  state: SaveState,
  parties: BusinessSavePlan["parties"],
): Promise<void> {
  for (const party of parties) {
    const choice = party.choice;
    if (!choice.ticked) continue;
    if (choice.kind === "match") {
      state.partyIds[party.relationshipId] = choice.entityId;
      await state.vault.addConnection(
        state.businessId,
        choice.entityId,
        party.label,
      );
      continue;
    }
    const id = await createTracked(state, choice.entityType, choice.draft);
    state.partyIds[party.relationshipId] = id;
    await state.vault.addConnection(state.businessId, id, party.label);
  }
}

export async function saveBusinessToVault(
  plan: BusinessSavePlan,
  vault: BusinessVaultGateway,
  choices: BusinessSaveChoices = {},
): Promise<BusinessVaultSaveResult> {
  const p = applyBusinessChoices(plan, choices);
  if (choices.signal?.aborted)
    throw choices.signal.reason ?? new DOMException("Cancelled", "AbortError");

  const created: string[] = [];
  try {
    const businessId = idOf(
      await vault.createEntity("faction", p.business.title, {
        content: p.business.content,
        labels: p.business.labels,
        status: "active",
      }),
    );
    created.push(businessId);
    const state: SaveState = {
      vault,
      businessId,
      created,
      personIds: {},
      partyIds: {},
    };
    await savePeople(state, p.people);
    await saveParties(state, p.parties);
    if (p.source?.ticked) {
      await vault.addConnection(businessId, p.source.entityId, p.source.label);
    }
    return { businessId, personIds: state.personIds, partyIds: state.partyIds };
  } catch (err) {
    if (created.length > 0) {
      let cleanup: Awaited<ReturnType<BusinessVaultGateway["bulkDelete"]>>;
      try {
        cleanup = await vault.bulkDelete(created);
      } catch (cleanupErr) {
        console.error("Could not remove a partial business save:", cleanupErr);
        throw incompleteRollback(err);
      }
      const remainingIds = [...cleanup.failedIds, ...cleanup.cancelledIds];
      if (remainingIds.length > 0) {
        console.error(
          "Could not remove all entities from a partial business save:",
          remainingIds,
        );
        throw incompleteRollback(err);
      }
    }
    throw err;
  }
}
