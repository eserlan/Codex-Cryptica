/**
 * "Save to Codex" outbound-click tracking (#1796) — entity_saved,
 * vault_created, related_entity_created.
 *
 * Hard scope boundary: this fires at the moment a visitor clicks "Save to
 * Codex" in a generator page, BEFORE the redirect into the actual app.
 * Nothing that happens after landing — vault creation, entity creation,
 * connections — is ever observed or tracked. `is_first_saved_entity` and
 * `vault_created` are therefore *inferred*, not confirmed: a first-time
 * saver will cause the app's existing import handler
 * (`$lib/services/seo/import-handler.ts`) to auto-create a vault, but this
 * module never looks at whether that actually happened. Likewise
 * `related_entity_created` counts [[wiki-links]]/references already present
 * in the content the generator just produced — describing what's about to
 * be sent, not what landed.
 *
 * "First save ever" is tracked via a dedicated, generator-side-only
 * localStorage flag — deliberately separate from attribution.ts's keys and
 * from anything vault/entity-related, so this module never has a reason to
 * read real vault state.
 */

import { browserStorage, type StorageLike } from "$lib/utils/runtime-deps";
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
 * Tracks the outbound "Save to Codex" click. Emits entity_saved always,
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
      { related_entity_count: bucketCount(input.relatedEntityCount) },
      deps.win,
    );
  }

  markSaved(storage);
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
