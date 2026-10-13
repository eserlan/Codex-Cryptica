import { isEntityVisible } from "schema";
import type { VaultMinimal } from "schema";

const SUMMARY_MAX = 160;

interface PinnableEntity {
  id: string;
  title: string;
  type?: string;
  labels?: string[];
  content?: string;
  connections?: { target: string; type?: string; label?: string }[];
}

function visibleTo(entity: PinnableEntity, vault: VaultMinimal): boolean {
  return (
    !vault.isGuest ||
    isEntityVisible(entity as any, {
      sharedMode: true,
      defaultVisibility: vault.defaultVisibility,
    })
  );
}

/**
 * Keeps only the pinned ids that exist in this Vault and that the current user
 * may see. Duplicates are removed and the first-seen order is kept. The UI
 * already filters suggestions, so this check guards against stale or
 * hand-edited ids.
 */
export function filterPinnedIds(
  ids: string[] | undefined,
  vault: VaultMinimal,
): string[] {
  if (!ids || ids.length === 0) return [];
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const entity = vault.entities?.[id] as PinnableEntity | undefined;
    if (!entity || !visibleTo(entity, vault)) continue;
    valid.push(id);
  }
  return valid;
}

function firstLine(text: string | undefined): string {
  const line = text
    ?.split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return "";
  return line.length > SUMMARY_MAX
    ? `${line.slice(0, SUMMARY_MAX - 1)}…`
    : line;
}

function summaryLine(target: PinnableEntity): string {
  const summary = firstLine(target.content);
  return `- ${target.title} (${target.type ?? "entity"})${
    summary ? `: ${summary}` : ""
  }`;
}

/**
 * One line per entity directly linked to a pinned entity: its title, type and
 * first content line. Second-step links, pinned targets (already in full) and
 * targets the user cannot see are left out. Lines stop once `budget` characters
 * are used.
 */
export function buildLinkedSummaryLines(
  pinnedIds: string[],
  vault: VaultMinimal,
  budget: number,
): string[] {
  const pinned = new Set(pinnedIds);
  const targets = pinnedIds.flatMap((id) => {
    const entity = vault.entities?.[id] as PinnableEntity | undefined;
    return (entity?.connections ?? []).map((conn) => conn.target);
  });

  const lines: string[] = [];
  const added = new Set<string>();
  let used = 0;
  for (const targetId of targets) {
    if (pinned.has(targetId) || added.has(targetId)) continue;
    const target = vault.entities?.[targetId] as PinnableEntity | undefined;
    if (!target || !visibleTo(target, vault)) continue;

    const line = summaryLine(target);
    if (used + line.length > budget) break;
    lines.push(line);
    used += line.length + 1;
    added.add(targetId);
  }
  return lines;
}
