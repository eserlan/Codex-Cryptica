import type { IntentCategory } from "generator-engine";

/** Maps a Guided Mode intent category to the underlying generator id. `null`
 * for "custom" — the user picks a generator from the full configure form. */
export const INTENT_CATEGORY_GENERATOR_ID: Record<
  IntentCategory,
  string | null
> = {
  character: "npc",
  place: "settlement",
  faction: "faction",
  event: "event",
  item: "magic-item",
  custom: null,
};

export interface IntentContextInput {
  /** The entity currently focused/selected in the workspace, if any. */
  activeEntity?: { id: string; title: string; type: string } | null;
}

export interface ResolvedIntentContext {
  generatorId: string | null;
  sourceEntityId: string | null;
  /** Whether the generator should skip configuration and generate immediately. */
  autoGenerate: boolean;
}

/**
 * Resolve the generator id and inferred parent-entity context for a Guided
 * Mode intent-first `+ Create` selection (#1909, FR-008). "Custom" always
 * opens the full configure form so the user can pick a generator; the other
 * categories generate immediately with the active entity (if any) as context.
 */
export function resolveIntentContext(
  category: IntentCategory,
  input: IntentContextInput = {},
): ResolvedIntentContext {
  const generatorId = INTENT_CATEGORY_GENERATOR_ID[category];
  return {
    generatorId,
    sourceEntityId: input.activeEntity?.id ?? null,
    autoGenerate: generatorId !== null,
  };
}
