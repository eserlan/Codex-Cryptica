import type { UIPersistence } from "./persistence";
import {
  UIPersistence as DefaultPersistence,
  UI_STORAGE_KEYS,
} from "./persistence";

export const MIN_LEFT_SIDEBAR_WIDTH = 240;
export const MIN_RIGHT_SIDEBAR_WIDTH = 320;
export const MAX_SIDEBAR_VW = 40;

export type SidebarTool = "oracle" | "explorer" | "none";

function isSidebarTool(value: string): value is SidebarTool {
  return value === "oracle" || value === "explorer" || value === "none";
}
export type MainViewMode = "visualization" | "focus" | "guest-chat";

type MediaQueryListLike = {
  matches: boolean;
  addEventListener?: (
    type: "change",
    listener: (event: { matches: boolean }) => void,
  ) => void;
  removeEventListener?: (
    type: "change",
    listener: (event: { matches: boolean }) => void,
  ) => void;
  addListener?: (listener: (event: { matches: boolean }) => void) => void;
  removeListener?: (listener: (event: { matches: boolean }) => void) => void;
};

export interface UIViewport {
  innerWidth: number;
  setTimeout(handler: () => void, timeout: number): number;
  clearTimeout(id: number): void;
  matchMedia?(query: string): MediaQueryListLike;
}

function browserViewport(): UIViewport | null {
  if (typeof window === "undefined") return null;
  return {
    innerWidth: window.innerWidth,
    setTimeout: (handler, timeout) => window.setTimeout(handler, timeout),
    clearTimeout: (id) => window.clearTimeout(id),
    matchMedia: window.matchMedia
      ? (query) => window.matchMedia(query)
      : undefined,
  };
}

export class LayoutUIStore {
  private leftSidebarSaveTimeout: number | null = null;
  private rightSidebarSaveTimeout: number | null = null;
  private cleanupMobileWatch: (() => void) | null = null;
  private cleanupWideWatch: (() => void) | null = null;

  #leftSidebarOpen = $state(false);
  #activeSidebarTool = $state<SidebarTool>("none");

  get leftSidebarOpen() {
    return this.#leftSidebarOpen;
  }
  set leftSidebarOpen(value: boolean) {
    this.#leftSidebarOpen = value;
    this.persistence.write(UI_STORAGE_KEYS.LEFT_SIDEBAR_OPEN, value, String);
  }

  get activeSidebarTool() {
    return this.#activeSidebarTool;
  }
  set activeSidebarTool(value: SidebarTool) {
    this.#activeSidebarTool = value;
    this.persistence.write(UI_STORAGE_KEYS.ACTIVE_SIDEBAR_TOOL, value, String);
  }

  leftSidebarWidth = $state(280);
  rightSidebarWidth = $state(380);
  mainViewMode = $state<MainViewMode>("visualization");
  focusedEntityId = $state<string | null>(null);
  isMobile = $state(false);
  isWideViewport = $state(false);
  vttSidebarCollapsed = $state(false);
  vttChatSidebarCollapsed = $state(false);
  vttEntityListCollapsed = $state(false);
  findNodeCounter = $state(0);
  lastSelectedNodePosition = $state<{ x: number; y: number } | null>(null);

  constructor(
    private persistence: UIPersistence = new DefaultPersistence(),
    private viewport: UIViewport | null = browserViewport(),
  ) {
    this.loadPersistedState();
    this.cleanupMobileWatch = this.watchMobileState();
    this.cleanupWideWatch = this.watchWideViewportState();
  }

  get isEntityExplorerWorkspace() {
    return (
      this.isWideViewport &&
      this.leftSidebarOpen &&
      this.activeSidebarTool === "explorer"
    );
  }

  disconnect() {
    this.cleanupMobileWatch?.();
    this.cleanupMobileWatch = null;
    this.cleanupWideWatch?.();
    this.cleanupWideWatch = null;
    if (this.leftSidebarSaveTimeout !== null) {
      this.viewport?.clearTimeout(this.leftSidebarSaveTimeout);
    }
    if (this.rightSidebarSaveTimeout !== null) {
      this.viewport?.clearTimeout(this.rightSidebarSaveTimeout);
    }
  }

  toggleSidebarTool(tool: SidebarTool) {
    if (tool === "none" || this.activeSidebarTool === tool) {
      this.closeSidebar();
    } else {
      this.leftSidebarOpen = true;
      this.activeSidebarTool = tool;
    }
  }

  closeSidebar() {
    this.leftSidebarOpen = false;
    this.activeSidebarTool = "none";
  }

  setLeftSidebarWidth(width: number) {
    this.leftSidebarWidth = width;
    this.debounceWrite("left", UI_STORAGE_KEYS.LEFT_SIDEBAR_WIDTH, width);
  }

  setRightSidebarWidth(width: number) {
    this.rightSidebarWidth = width;
    this.debounceWrite("right", UI_STORAGE_KEYS.RIGHT_SIDEBAR_WIDTH, width);
  }

  toggleVttSidebar(collapsed: boolean) {
    this.vttSidebarCollapsed = collapsed;
    this.persistence.write(
      UI_STORAGE_KEYS.VTT_SIDEBAR_COLLAPSED,
      collapsed,
      String,
    );
  }

  toggleVttChatSidebar(collapsed: boolean) {
    this.vttChatSidebarCollapsed = collapsed;
  }

  toggleVttEntityList(collapsed: boolean) {
    this.vttEntityListCollapsed = collapsed;
    this.persistence.write(
      UI_STORAGE_KEYS.VTT_ENTITY_LIST_COLLAPSED,
      collapsed,
      String,
    );
  }

  findInGraph() {
    this.findNodeCounter++;
  }

  setLastSelectedNodePosition(pos: { x: number; y: number } | null) {
    this.lastSelectedNodePosition = pos;
  }

  private loadPersistedState() {
    const maxWidth =
      ((this.viewport?.innerWidth ?? 1024) * MAX_SIDEBAR_VW) / 100;
    const left = this.persistence.read(
      UI_STORAGE_KEYS.LEFT_SIDEBAR_WIDTH,
      (raw) => Number.parseInt(raw, 10),
      this.leftSidebarWidth,
    );
    if (!Number.isNaN(left)) {
      this.leftSidebarWidth = Math.max(
        MIN_LEFT_SIDEBAR_WIDTH,
        Math.min(left, maxWidth),
      );
    }

    const right = this.persistence.read(
      UI_STORAGE_KEYS.RIGHT_SIDEBAR_WIDTH,
      (raw) => Number.parseInt(raw, 10),
      this.rightSidebarWidth,
    );
    if (!Number.isNaN(right)) {
      this.rightSidebarWidth = Math.max(
        MIN_RIGHT_SIDEBAR_WIDTH,
        Math.min(right, maxWidth),
      );
    }

    this.#leftSidebarOpen = this.persistence.read(
      UI_STORAGE_KEYS.LEFT_SIDEBAR_OPEN,
      (raw) => raw === "true",
      false,
    );
    const savedSidebarTool = this.persistence.read(
      UI_STORAGE_KEYS.ACTIVE_SIDEBAR_TOOL,
      (raw) => raw,
      "none",
    );
    this.#activeSidebarTool = isSidebarTool(savedSidebarTool)
      ? savedSidebarTool
      : "none";

    this.vttSidebarCollapsed = this.persistence.read(
      UI_STORAGE_KEYS.VTT_SIDEBAR_COLLAPSED,
      (raw) => raw === "true",
      false,
    );
    this.vttEntityListCollapsed = this.persistence.read(
      UI_STORAGE_KEYS.VTT_ENTITY_LIST_COLLAPSED,
      (raw) => raw === "true",
      false,
    );
  }

  private watchMobileState(): (() => void) | null {
    const mediaQuery = this.viewport?.matchMedia?.("(max-width: 768px)");
    if (!mediaQuery) return null;
    this.isMobile = mediaQuery.matches;
    return this.watchMediaQuery(mediaQuery, (matches) => {
      this.isMobile = matches;
    });
  }

  private watchWideViewportState(): (() => void) | null {
    const mediaQuery = this.viewport?.matchMedia?.("(min-width: 1280px)");
    if (!mediaQuery) return null;
    this.isWideViewport = mediaQuery.matches;
    return this.watchMediaQuery(mediaQuery, (matches) => {
      this.isWideViewport = matches;
    });
  }

  private watchMediaQuery(
    mediaQuery: MediaQueryListLike,
    update: (matches: boolean) => void,
  ): (() => void) | null {
    const handler = (event: { matches: boolean }) => {
      update(event.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener?.("change", handler);
    }
    if (mediaQuery.addListener) {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener?.(handler);
    }
    return null;
  }

  private debounceWrite(side: "left" | "right", key: string, width: number) {
    if (!this.viewport) return;
    const current =
      side === "left"
        ? this.leftSidebarSaveTimeout
        : this.rightSidebarSaveTimeout;
    if (current !== null) this.viewport.clearTimeout(current);
    const next = this.viewport.setTimeout(() => {
      this.persistence.write(key, width, String);
    }, 500);
    if (side === "left") this.leftSidebarSaveTimeout = next;
    else this.rightSidebarSaveTimeout = next;
  }
}

const KEY = "__codex_layout_ui_store__";
export const layoutUIStore: LayoutUIStore =
  (globalThis as any)[KEY] ?? ((globalThis as any)[KEY] = new LayoutUIStore());
