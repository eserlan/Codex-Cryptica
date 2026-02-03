import type { Entity } from "./entity";

export type VisibilitySettings = {
  sharedMode: boolean;
  defaultVisibility: "visible" | "hidden";
};

/**
 * Core visibility check logic for Fog of War.
 * Precedence Rule: 'hidden' tag > 'revealed' tag > defaultVisibility.
 * 
 * @param entity The entity to check
 * @param settings The current visibility settings
 * @returns true if the entity should be visible, false otherwise
 */
export function isEntityVisible(entity: Entity, settings: VisibilitySettings): boolean {
  // Shared Mode must be active for Fog of War logic to apply.
  if (!settings.sharedMode) {
    return true;
  }

  const tags = entity.tags || [];
  
  // 1. Force Hidden tag always takes precedence (Safety First)
  if (tags.includes("hidden")) {
    return false;
  }

  // 2. Force Revealed tag shows it even if world is hidden
  if (tags.includes("revealed")) {
    return true;
  }

  // 3. Fallback to global setting
  return settings.defaultVisibility === "visible";
}
