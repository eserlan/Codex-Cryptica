import type {
  AdventureSession,
  CausalCommitment,
} from "@codex/adventure-engine";

export const CONTESTED_LORE_HEADER = "## AI GM Contested";

function marker(entry: CausalCommitment): string {
  return `[commitment:${entry.id}]`;
}

/**
 * Append one contested commitment to an entity's GM-only lore, once.
 * The commitment ID marker makes retries and reloads idempotent; existing
 * lore (including user edits) is never rewritten.
 */
export function appendContestedToLore(
  lore: string | undefined,
  entry: CausalCommitment,
): string {
  const base = lore ?? "";
  if (base.includes(marker(entry))) return base;
  const line = `- ${marker(entry)} ${entry.subject}: ${entry.summary}`;
  const trimmed = base.trimEnd();
  if (trimmed.includes(CONTESTED_LORE_HEADER)) {
    return `${trimmed}\n${line}\n`;
  }
  return `${trimmed ? `${trimmed}\n\n` : ""}${CONTESTED_LORE_HEADER}\n${line}\n`;
}

export interface ContestedLoreDeps {
  isCurrent(): boolean;
  getEntity(id: string): { id: string; lore?: string } | undefined;
  updateEntityLore(id: string, lore: string): Promise<boolean>;
}

export interface ContestedLoreResult {
  updated: number;
  skipped: number;
  interrupted: boolean;
}

/**
 * Mirror contested commitments whose actor is a Vault entity into that
 * entity's lore for manual review (#5111). Session state stays the source
 * of truth; a failed Vault write is skipped, never fatal to play, and the
 * idempotent append makes the next sync safe to retry.
 */
async function syncEntry(
  entry: CausalCommitment,
  deps: ContestedLoreDeps,
): Promise<"updated" | "skipped"> {
  if (entry.actorRef?.tier !== "source-record") return "skipped";
  const entity = deps.getEntity(entry.actorRef.value);
  if (!entity) return "skipped";
  const nextLore = appendContestedToLore(entity.lore, entry);
  if (nextLore === (entity.lore ?? "")) return "skipped";
  try {
    return (await deps.updateEntityLore(entity.id, nextLore))
      ? "updated"
      : "skipped";
  } catch {
    return "skipped";
  }
}

export async function syncContestedCommitments(
  session: AdventureSession,
  deps: ContestedLoreDeps,
): Promise<ContestedLoreResult> {
  let updated = 0;
  let skipped = 0;
  const contested = (session.causalCommitments ?? []).filter(
    (entry) => entry.status === "contested",
  );
  for (const entry of contested) {
    if (!deps.isCurrent()) return { updated, skipped, interrupted: true };
    const outcome = await syncEntry(entry, deps);
    if (outcome === "updated") updated += 1;
    else skipped += 1;
  }
  return { updated, skipped, interrupted: false };
}
