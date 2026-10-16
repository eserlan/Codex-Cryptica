import type { HexRecord } from "../model";
import { NOTES_MAX_LENGTH } from "../model";
import {
  settleDraft,
  withPartStatus,
  type DiscoveryPartId,
  type HexDiscoveryDraft,
} from "./draft";

/**
 * Saving helpers (research D12). Each returns a plan for the web layer to
 * apply. None of them writes HexRecord.notes (FR-027).
 */

type AiNotesPatch = Pick<HexRecord, "aiNotes" | "draft" | "updatedAt">;

export interface EntityPlan {
  type: "location" | "event" | "note";
  title: string;
  content: string;
  status: "draft";
  labels: string[];
}

export interface DiscoverySavePlan {
  entity: EntityPlan;
  /** The proposed location link, only when still ticked. */
  link: { toEntityId: string; type: "related_to" } | null;
  /** Links to the hex's faction once that part is saved (FR-025). */
  factionLink: { toEntityId: string; type: "related_to" } | null;
  draft: HexDiscoveryDraft;
}

const AI_NOTE_LABEL = {
  hazard: "Hazard",
  secret: "Secret",
  atmosphere: "Atmosphere",
} as const;

function assertPending(draft: HexDiscoveryDraft, id: DiscoveryPartId): void {
  if (draft.parts[id].status !== "pending") {
    throw new Error(`The ${id} part is not pending.`);
  }
}

function labelsFor(draft: HexDiscoveryDraft, id: DiscoveryPartId): string[] {
  return [
    "hex-crawl-discovery",
    draft.parts[id].source === "ai" ? "ai-drafted" : "rolled",
  ];
}

function splitTitle(text: string): { title: string; content: string } {
  const [first, ...rest] = text.split("\n");
  return { title: first.trim(), content: rest.join("\n").trim() };
}

function appendWithinLimit(existing: string, line: string): string {
  const combined = [existing, line].filter(Boolean).join("\n\n");
  if (combined.length > NOTES_MAX_LENGTH) {
    throw new Error("AI notes are full. Shorten them before saving this part.");
  }
  return combined;
}

export function planDiscoverySave(input: {
  draft: HexDiscoveryDraft;
  part: "landmark" | "encounter";
  encounterType?: "event" | "note";
  proposedLink: { entityId: string } | null;
  linkTicked: boolean;
}): DiscoverySavePlan {
  const { draft, part } = input;
  assertPending(draft, part);
  const { title, content } = splitTitle(draft.parts[part].text);
  const type =
    part === "landmark" ? "location" : (input.encounterType ?? "event");
  const factionId = draft.parts.factionPresence.factionId;
  const factionSaved = draft.parts.factionPresence.status === "saved";

  return {
    entity: {
      type,
      title,
      content,
      status: "draft",
      labels: labelsFor(draft, part),
    },
    link:
      input.linkTicked && input.proposedLink
        ? { toEntityId: input.proposedLink.entityId, type: "related_to" }
        : null,
    factionLink:
      factionSaved && factionId
        ? { toEntityId: factionId, type: "related_to" }
        : null,
    draft: withPartStatus(draft, part, "saved"),
  };
}

/**
 * Adds a hazard, secret or atmosphere to `aiNotes`, never to `notes`. The part
 * is marked saved, and the draft is removed when nothing is pending.
 */
export function appendToAiNotes(
  record: HexRecord | undefined,
  part: "hazard" | "secret" | "atmosphere",
  draft: HexDiscoveryDraft,
  now: number,
): { patch: AiNotesPatch } {
  if (!(part in AI_NOTE_LABEL)) {
    throw new Error(`The ${part} part does not go to AI notes.`);
  }
  assertPending(draft, part);
  const line = `${AI_NOTE_LABEL[part as keyof typeof AI_NOTE_LABEL]}: ${draft.parts[part].text}`;
  const aiNotes = appendWithinLimit(record?.aiNotes ?? "", line);
  return {
    patch: {
      aiNotes,
      draft: settleDraft(withPartStatus(draft, part, "saved")),
      updatedAt: now,
    },
  };
}

/** Case-insensitive exact match on a faction title (FR-025). Partial matches do not count. */
export function matchFaction(
  name: string,
  factions: readonly { id: string; title: string }[],
): { id: string } | null {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return null;
  const found = factions.find((f) => f.title.trim().toLowerCase() === wanted);
  return found ? { id: found.id } : null;
}

/**
 * Saves the faction presence part. Every entity already saved from this hex
 * is linked to the faction, and "Faction presence: {name}" is added to aiNotes.
 */
export function planFactionSave(input: {
  draft: HexDiscoveryDraft;
  factionId: string;
  factionTitle: string;
  savedEntityIds: readonly string[];
  record: HexRecord | undefined;
  now: number;
}): {
  links: { fromEntityId: string; toEntityId: string; type: "related_to" }[];
  patch: AiNotesPatch;
  draft: HexDiscoveryDraft;
} {
  const { draft, factionId, factionTitle, record, now } = input;
  assertPending(draft, "factionPresence");

  const links = input.savedEntityIds.map((fromEntityId) => ({
    fromEntityId,
    toEntityId: factionId,
    type: "related_to" as const,
  }));

  const line = `Faction presence: ${factionTitle}`;
  const existing = record?.aiNotes ?? "";
  const aiNotes = existing.includes(line)
    ? existing
    : appendWithinLimit(existing, line);

  const saved: HexDiscoveryDraft = {
    ...withPartStatus(draft, "factionPresence", "saved"),
    parts: {
      ...draft.parts,
      factionPresence: {
        ...draft.parts.factionPresence,
        status: "saved",
        factionName: factionTitle,
        factionId,
      },
    },
  };

  return {
    links,
    patch: { aiNotes, draft: settleDraft(saved), updatedAt: now },
    draft: saved,
  };
}
