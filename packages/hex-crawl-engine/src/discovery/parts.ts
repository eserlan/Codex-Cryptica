import type { DraftPart, DiscoveryPartId, HexDiscoveryDraft } from "./draft";
import type { HexStocking } from "./schema";
import type { TableDiscoveryPart } from "../tables/types";

/** Faction names are capped to the draft schema limit. */
const FACTION_NAME_MAX = 80;

export function factionNameOf(name: string | undefined): string | undefined {
  const trimmed = name?.trim().slice(0, FACTION_NAME_MAX) ?? "";
  return trimmed || undefined;
}

/** Turns a validated stocking part into a pending draft part. */
export function partFromStocking(
  id: DiscoveryPartId,
  value: HexStocking[DiscoveryPartId],
  source: "ai" | "tables",
): DraftPart {
  if (id === "landmark" || id === "encounter") {
    const v = value as { title: string; description: string };
    return { text: `${v.title}\n${v.description}`, source, status: "pending" };
  }
  if (id === "factionPresence") {
    const v = value as { faction?: string; description: string };
    const factionName = factionNameOf(v.faction);
    return {
      text: v.description,
      ...(factionName ? { factionName } : {}),
      source,
      status: "pending",
    };
  }
  return { text: value as string, source, status: "pending" };
}

/** Turns one rolled table entry into draft text. Title and description split on " | ". */
export function textFromTableEntry(
  part: TableDiscoveryPart,
  entry: string,
): string {
  if (part !== "landmark" && part !== "encounter") return entry;
  const at = entry.indexOf(" | ");
  return at < 0 ? entry : `${entry.slice(0, at)}\n${entry.slice(at + 3)}`;
}

/** The draft part for faction presence offline: the nearest named faction, or none. */
export function tableFactionPart(faction: string | undefined): DraftPart {
  const name = factionNameOf(faction);
  return name
    ? {
        text: `Under the sway of ${name}.`,
        factionName: name,
        source: "tables",
        status: "pending",
      }
    : {
        text: "No faction holds sway here.",
        source: "tables",
        status: "pending",
      };
}

/** A new draft with every part replaced except the named one. Others keep their identity. */
export function replacePart(
  draft: HexDiscoveryDraft,
  id: DiscoveryPartId,
  part: DraftPart,
): HexDiscoveryDraft {
  return { ...draft, parts: { ...draft.parts, [id]: part } };
}
