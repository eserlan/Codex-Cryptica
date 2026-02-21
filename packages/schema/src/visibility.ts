import type { Entity } from "./entity";

export type VisibilitySettings = {
  sharedMode: boolean;
  defaultVisibility: "visible" | "hidden";
};

// Pre-compiled regex for performance (avoids allocation)
const HIDDEN_REGEX = /^(hidden)$/i;
const REVEALED_REGEX = /^(revealed|visible)$/i;

/**
 * Core visibility check logic for Fog of War.
 * Precedence Rule: 'hidden' tag > 'revealed' tag > defaultVisibility.
 *
 * @param entity The entity to check
 * @param settings The current visibility settings
 * @returns true if the entity should be visible, false otherwise
 */
export function isEntityVisible(
  entity: Entity,
  settings: VisibilitySettings,
): boolean {
  // Shared Mode must be active for Fog of War logic to apply.
  if (!settings.sharedMode) {
    return true;
  }

  // Optimization: Use imperative loops and regex to avoid array allocation/mapping
  let explicitlyRevealed = false;

  // Check Tags
  if (entity.tags) {
    for (const tag of entity.tags) {
      if (HIDDEN_REGEX.test(tag)) return false; // Early exit: Hidden overrides everything
      if (REVEALED_REGEX.test(tag)) explicitlyRevealed = true;
    }
  }

  // Check Labels
  if (entity.labels) {
    for (const label of entity.labels) {
      if (HIDDEN_REGEX.test(label)) return false; // Early exit
      if (REVEALED_REGEX.test(label)) explicitlyRevealed = true;
    }
  }

  if (explicitlyRevealed) return true;

  // 3. Fallback to global setting
  return settings.defaultVisibility === "visible";
}
