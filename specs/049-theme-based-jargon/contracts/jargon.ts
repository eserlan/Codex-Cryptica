/**
 * Defined jargon tokens used throughout the UI.
 * This contract ensures that all themes use the same keys for terminology.
 */
export interface JargonMap {
  vault: string;
  entity: string;
  entity_plural: string;
  save: string;
  delete: string;
  search: string;
  new: string;
  syncing: string;
  [key: string]: string; // Allow for extensibility
}

/**
 * The lookup function signature for UI components.
 * Resolved by the ThemeStore.
 */
export type JargonResolver = (key: keyof JargonMap, count?: number) => string;
