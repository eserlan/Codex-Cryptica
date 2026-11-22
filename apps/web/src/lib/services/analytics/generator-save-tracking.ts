/**
 * "Save to Codex" staging tracking (#1796) — entity_saved, vault_created,
 * related_entity_created, plus generator_handoff_failed (#4627).
 *
 * Hard scope boundary: entity_saved, vault_created and
 * related_entity_created fire only AFTER the pending draft has been staged in
 * this browser's localStorage, BEFORE the redirect into the actual app. They
 * mean intent plus successful staging, not import or persistence. Nothing
 * that happens after landing — vault creation, entity creation, connections
 * — is ever observed or tracked, so no event ever confirms an import.
 * `is_first_saved_entity` and `vault_created` are therefore *inferred*: a
 * first-time saver will cause the app's existing import handler
 * (`#lib/services/seo/import-handler.ts`) to auto-create a vault, but this
 * module never looks at whether that actually happened. Likewise
 * `related_entity_created` counts [[wiki-links]]/references already present
 * in the content the generator just produced — describing what's about to
 * be sent, not what landed.
 *
 * generator_handoff_failed is the staging-failure counterpart: it fires when
 * writing the pending draft to localStorage throws (for example, blocked
 * storage), instead of entity_saved.
 *
 * "First save ever" is tracked via a dedicated, generator-side-only
 * localStorage flag — deliberately separate from attribution.ts's keys and
 * from anything vault/entity-related, so this module never has a reason to
 * read real vault state.
 */

import { browserStorage, type StorageLike } from "#lib/utils/runtime-deps.js";
import { trackEvent } from "./zaraz-analytics";

const HAS_SAVED_KEY = "codex-cryptica-has-saved-to-vault";

export interface SaveToCodexInput {
  generatorType: string;
  isHubBatch: boolean;
  itemCount: number;
  /** Count of [[wiki-links]] / explicit references in the content being
   *  saved, computed by the caller from data it already has in hand. */
  relatedEntityCount: number;
}

/** Buckets a raw count into a small set of stable, low-cardinality labels. */
export function bucketCount(count: number): "0" | "1" | "2-5" | "6+" {
  if (count <= 0) return "0";
  if (count === 1) return "1";
  if (count <= 5) return "2-5";
  return "6+";
}

function hasSavedBefore(storage: StorageLike): boolean {
  try {
    return storage.getItem(HAS_SAVED_KEY) === "true";
  } catch {
    return false;
  }
}

function markSaved(storage: StorageLike): void {
  try {
    storage.setItem(HAS_SAVED_KEY, "true");
  } catch {
    // storage unavailable — best-effort only, next call will just re-infer
  }
}

export interface SaveTrackingDeps {
  storage?: StorageLike;
  win?: any;
}

/**
 * Tracks a successfully staged "Save to Codex" handoff (after the draft is
 * written to localStorage; not an import). Emits entity_saved always,
 * vault_created only on this browser's first-ever save, and
 * related_entity_created only when relatedEntityCount > 0.
 */
export function trackSaveToCodex(
  input: SaveToCodexInput,
  deps: SaveTrackingDeps = {},
): void {
  const storage = deps.storage ?? browserStorage;
  const isFirstSave = !hasSavedBefore(storage);

  const baseProperties = {
    generator_type: input.generatorType,
    is_hub_batch: input.isHubBatch,
    item_count: input.itemCount,
  };

  trackEvent(
    "entity_saved",
    { ...baseProperties, is_first_saved_entity: isFirstSave },
    deps.win,
  );

  if (isFirstSave) {
    trackEvent("vault_created", baseProperties, deps.win);
  }

  if (input.relatedEntityCount > 0) {
    trackEvent(
      "related_entity_created",
      {
        ...baseProperties,
        related_entity_count: bucketCount(input.relatedEntityCount),
      },
      deps.win,
    );
  }

  markSaved(storage);
}

export interface SaveHandoffFailedInput {
  generatorType: string;
  isHubBatch: boolean;
  itemCount: number;
}

/**
 * Tracks a failed staging attempt. Emits only generator_handoff_failed with
 * no free text, and never touches the has-saved flag.
 */
export function trackSaveHandoffFailed(
  input: SaveHandoffFailedInput,
  deps: SaveTrackingDeps = {},
): void {
  trackEvent(
    "generator_handoff_failed",
    {
      generator_type: input.generatorType,
      is_hub_batch: input.isHubBatch,
      item_count_bucket: bucketCount(input.itemCount),
    },
    deps.win,
  );
}

/**
 * Counts [[wiki-link]] occurrences and explicit reference entries in
 * generator output, for the relatedEntityCount input above. Kept here
 * (rather than inline at each call site) so both the single-save and
 * hub-batch-save paths count consistently.
 */
export function countRelatedEntities(
  content: string | undefined,
  references: string[] | undefined,
): number {
  const wikiLinkMatches = content?.match(/\[\[([^\]]+)\]\]/g) ?? [];
  const referenceCount = references?.length ?? 0;
  return wikiLinkMatches.length + referenceCount;
}
