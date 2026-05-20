/**
 * Typed, injectable wrapper over `localStorage`. Owns every key name the UI
 * stores persist; gracefully no-ops when `window` is unavailable (SSR).
 */
export interface UIPersistenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface UIPersistenceOptions {
  /**
   * Backing store. Defaults to `globalThis.localStorage` when present.
   * Injectable so tests can pass an in-memory implementation.
   */
  storage?: UIPersistenceStorage;
}

export interface UIPersistence {
  /**
   * Read + parse a key. Returns `fallback` on missing key or parse failure.
   * Parse failures are logged as warnings but never thrown.
   */
  read<T>(key: string, parse: (raw: string) => T, fallback: T): T;

  /**
   * Serialize + write a value. Uses `JSON.stringify` if no `serialize` provided.
   */
  write<T>(key: string, value: T, serialize?: (value: T) => string): void;

  /**
   * Remove a key. No-op if missing.
   */
  remove(key: string): void;
}

/**
 * Canonical list of every `localStorage` key the UI stores own.
 * MUST match the strings used in the current `ui.svelte.ts` byte-for-byte.
 */
export const UI_STORAGE_KEYS = {
  ACTIVE_THEME: "codex-cryptica-active-theme",
  VTT_SIDEBAR_COLLAPSED: "codex_vtt_sidebar_collapsed",
  VTT_ENTITY_LIST_COLLAPSED: "codex_vtt_entity_list_collapsed",
  ENTITY_DISCOVERY_MODE: "codex_entity_discovery_mode",
  CONNECTION_DISCOVERY_MODE: "codex_connection_discovery_mode",
  LAST_CONNECTION_LABEL: "codex_last_connection_label",
  RECENT_CONNECTION_LABELS: "codex_recent_connection_labels",
  LEFT_SIDEBAR_WIDTH: "codex_left_sidebar_width",
  RIGHT_SIDEBAR_WIDTH: "codex_right_sidebar_width",
  EXPLORER_VIEW_MODE: "codex_explorer_view_mode",
  EXPLORER_COLLAPSED_LABEL_GROUPS: "codex_explorer_collapsed_label_groups",
  DISMISSED_LANDING: "codex_dismissed_landing",
  WORLD_PAGE_DISMISSED_AT: "codex_world_page_dismissed_at",
  SKIP_LANDING: "codex_skip_landing",
  LAST_SEEN_VERSION: "codex_last_seen_version",
  AI_DISABLED: "codex_ai_disabled",
  LITE_MODE: "codex_lite_mode",
  AUTO_ARCHIVE: "codex_auto_archive",
} as const;

export type UIStorageKey =
  (typeof UI_STORAGE_KEYS)[keyof typeof UI_STORAGE_KEYS];
