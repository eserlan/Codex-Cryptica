export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  length?: number;
  key?(index: number): string | null;
}

export const UI_STORAGE_KEYS = {
  ACTIVE_THEME: "codex-cryptica-active-theme",
  AI_DISABLED: "codex_ai_disabled",
  AUTO_ARCHIVE: "codex_auto_archive",
  CONNECTION_DISCOVERY_MODE: "codex_connection_discovery_mode",
  DISMISSED_LANDING: "codex_dismissed_landing",
  ENTITY_DISCOVERY_MODE: "codex_entity_discovery_mode",
  EXPLORER_COLLAPSED_CATEGORY_GROUPS:
    "codex_explorer_collapsed_category_groups",
  EXPLORER_COLLAPSED_LABEL_GROUPS: "codex_explorer_collapsed_label_groups",
  EXPLORER_COLLAPSED_ENTITY_IDS: "codex_explorer_collapsed_entity_ids",
  EXPLORER_VIEW_MODE: "codex_explorer_view_mode",
  LAST_CONNECTION_LABEL: "codex_last_connection_label",
  LAST_SEEN_VERSION: "codex_last_seen_version",
  LEFT_SIDEBAR_WIDTH: "codex_left_sidebar_width",
  LITE_MODE: "codex_lite_mode",
  RECENT_CONNECTION_LABELS: "codex_recent_connection_labels",
  RIGHT_SIDEBAR_WIDTH: "codex_right_sidebar_width",
  SKIP_LANDING: "codex_skip_landing",
  LEFT_SIDEBAR_OPEN: "codex_left_sidebar_open",
  ACTIVE_SIDEBAR_TOOL: "codex_active_sidebar_tool",
  VTT_ENTITY_LIST_COLLAPSED: "codex_vtt_entity_list_collapsed",
  VTT_SIDEBAR_COLLAPSED: "codex_vtt_sidebar_collapsed",
  WORLD_PAGE_DISMISSED_AT: "codex_world_page_dismissed_at",
  MOBILE_GRAPH_COACH_MARKS_SEEN: "codex_mobile_graph_coach_marks_seen",
} as const;

export type UIStorageKey =
  (typeof UI_STORAGE_KEYS)[keyof typeof UI_STORAGE_KEYS];

export class UIPersistence {
  private storage: StorageLike | null;

  constructor(options?: { storage?: StorageLike }) {
    if (options?.storage) {
      this.storage = options.storage;
    } else if (typeof window !== "undefined" && window.localStorage) {
      this.storage = window.localStorage;
    } else {
      this.storage = null;
    }
  }

  read<T>(key: string, parse: (raw: string) => T, fallback: T): T {
    if (!this.storage) return fallback;

    try {
      const raw = this.storage.getItem(key);
      if (raw === null) return fallback;
      return parse(raw);
    } catch (e) {
      console.warn(`[UIPersistence] Failed to parse key "${key}":`, e);
      return fallback;
    }
  }

  write<T>(
    key: string,
    value: T,
    serialize: (v: T) => string = (v) =>
      v === undefined ? "" : JSON.stringify(v),
  ): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(key, serialize(value));
    } catch (e) {
      console.warn(`[UIPersistence] Failed to write key "${key}":`, e);
    }
  }

  remove(key: string): void {
    if (!this.storage) return;
    try {
      this.storage.removeItem(key);
    } catch (e) {
      console.warn(`[UIPersistence] Failed to remove key "${key}":`, e);
    }
  }
}
