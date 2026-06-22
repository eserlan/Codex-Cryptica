import { describe, expect, it, vi } from "vitest";

(global as any).$state = (value: any) => value;

import {
  LayoutUIStore,
  MIN_LEFT_SIDEBAR_WIDTH,
  MIN_RIGHT_SIDEBAR_WIDTH,
  type UIViewport,
} from "./layout-ui.svelte";
import { UIPersistence, type StorageLike } from "./persistence";

function storage(initial: Record<string, string> = {}) {
  const values = { ...initial };
  return {
    values,
    storage: {
      getItem: vi.fn((key: string) => values[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        values[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete values[key];
      }),
    } satisfies StorageLike,
  };
}

function viewport(overrides: Partial<UIViewport> = {}) {
  const mediaListeners = new Map<string, Array<(event: { matches: boolean }) => void>>();
  const mediaState = new Map<string, boolean>();

  const getListeners = (query: string) => {
    let listeners = mediaListeners.get(query);
    if (!listeners) {
      listeners = [];
      mediaListeners.set(query, listeners);
    }
    return listeners;
  };

  return {
    mediaListeners,
    emit(query: string, matches: boolean) {
      mediaState.set(query, matches);
      for (const listener of getListeners(query)) {
        listener({ matches });
      }
    },
    viewport: {
      innerWidth: 1000,
      setTimeout: vi.fn((handler: () => void) => {
        handler();
        return 1;
      }),
      clearTimeout: vi.fn(),
      matchMedia: vi.fn((query: string) => ({
        matches: mediaState.get(query) ?? false,
        addEventListener: vi.fn((_type, listener) => {
          getListeners(query).push(listener);
        }),
      })),
      ...overrides,
    } satisfies UIViewport,
  };
}

describe("LayoutUIStore", () => {
  it("loads persisted widths and clamps invalid small values", () => {
    const backing = storage({
      codex_left_sidebar_width: "-10",
      codex_right_sidebar_width: "100",
    });
    const store = new LayoutUIStore(
      new UIPersistence({ storage: backing.storage }),
      viewport().viewport,
    );

    expect(store.leftSidebarWidth).toBe(MIN_LEFT_SIDEBAR_WIDTH);
    expect(store.rightSidebarWidth).toBe(MIN_RIGHT_SIDEBAR_WIDTH);
  });

  it("persists sidebar widths with the legacy keys", () => {
    const backing = storage();
    const fakeViewport = viewport().viewport;
    const store = new LayoutUIStore(
      new UIPersistence({ storage: backing.storage }),
      fakeViewport,
    );

    store.setLeftSidebarWidth(320);
    store.setRightSidebarWidth(420);

    expect(backing.storage.setItem).toHaveBeenCalledWith(
      "codex_left_sidebar_width",
      "320",
    );
    expect(backing.storage.setItem).toHaveBeenCalledWith(
      "codex_right_sidebar_width",
      "420",
    );
  });

  it("toggles sidebar tools and closes the sidebar when toggling the active tool", () => {
    const store = new LayoutUIStore(new UIPersistence(), null);

    store.toggleSidebarTool("oracle");
    expect(store.leftSidebarOpen).toBe(true);
    expect(store.activeSidebarTool).toBe("oracle");

    store.toggleSidebarTool("oracle");
    expect(store.leftSidebarOpen).toBe(false);
    expect(store.activeSidebarTool).toBe("none");
  });

  it("tracks mobile media query changes", () => {
    const fakeViewport = viewport();
    const store = new LayoutUIStore(new UIPersistence(), fakeViewport.viewport);

    expect(store.isMobile).toBe(false);
    fakeViewport.emit("(max-width: 768px)", true);
    expect(store.isMobile).toBe(true);
  });

  it("tracks wide viewport media query changes and derives Explorer workspace eligibility", () => {
    const fakeViewport = viewport();
    const store = new LayoutUIStore(new UIPersistence(), fakeViewport.viewport);

    expect(store.isWideViewport).toBe(false);
    expect(store.isEntityExplorerWorkspace).toBe(false);

    store.leftSidebarOpen = true;
    store.activeSidebarTool = "explorer";
    expect(store.isEntityExplorerWorkspace).toBe(false);

    fakeViewport.emit("(min-width: 1280px)", true);

    expect(store.isWideViewport).toBe(true);
    expect(store.isEntityExplorerWorkspace).toBe(true);
  });

  it("removes Explorer workspace eligibility when the sidebar closes or another tool becomes active", () => {
    const fakeViewport = viewport();
    const store = new LayoutUIStore(new UIPersistence(), fakeViewport.viewport);

    store.leftSidebarOpen = true;
    store.activeSidebarTool = "explorer";
    fakeViewport.emit("(min-width: 1280px)", true);
    expect(store.isEntityExplorerWorkspace).toBe(true);

    store.activeSidebarTool = "oracle";
    expect(store.isEntityExplorerWorkspace).toBe(false);

    store.activeSidebarTool = "explorer";
    expect(store.isEntityExplorerWorkspace).toBe(true);

    store.leftSidebarOpen = false;
    expect(store.isEntityExplorerWorkspace).toBe(false);
  });

  it("clears workspace focus when the Explorer sidebar closes", () => {
    const store = new LayoutUIStore(new UIPersistence(), null);

    store.leftSidebarOpen = true;
    store.activeSidebarTool = "explorer";
    store.isWideViewport = true;
    store.openEntityExplorerWorkspace("entity-1");

    expect(store.mainViewMode).toBe("focus");
    expect(store.focusedEntityId).toBe("entity-1");

    store.closeSidebar();

    expect(store.mainViewMode).toBe("visualization");
    expect(store.focusedEntityId).toBeNull();
  });

  it("toggles workspace eligibility once per threshold crossing and stays disabled below 1280px", () => {
    const fakeViewport = viewport();
    const store = new LayoutUIStore(new UIPersistence(), fakeViewport.viewport);

    store.leftSidebarOpen = true;
    store.activeSidebarTool = "explorer";

    const states = [store.isEntityExplorerWorkspace];
    fakeViewport.emit("(min-width: 1280px)", true);
    states.push(store.isEntityExplorerWorkspace);
    fakeViewport.emit("(min-width: 1280px)", true);
    states.push(store.isEntityExplorerWorkspace);
    fakeViewport.emit("(min-width: 1280px)", false);
    states.push(store.isEntityExplorerWorkspace);
    fakeViewport.emit("(min-width: 1280px)", false);
    states.push(store.isEntityExplorerWorkspace);

    expect(states).toEqual([false, true, true, false, false]);
    expect(states.filter((state, index) => states[index - 1] !== state)).toEqual(
      [false, true, false],
    );
  });

  it("persists VTT collapse state and increments find counter", () => {
    const backing = storage();
    const store = new LayoutUIStore(
      new UIPersistence({ storage: backing.storage }),
      null,
    );

    store.toggleVttSidebar(true);
    store.toggleVttEntityList(true);
    store.findInGraph();

    expect(store.findNodeCounter).toBe(1);
    expect(backing.storage.setItem).toHaveBeenCalledWith(
      "codex_vtt_sidebar_collapsed",
      "true",
    );
    expect(backing.storage.setItem).toHaveBeenCalledWith(
      "codex_vtt_entity_list_collapsed",
      "true",
    );
  });

  it("persists leftSidebarOpen and activeSidebarTool on modification", () => {
    const backing = storage();
    const store = new LayoutUIStore(
      new UIPersistence({ storage: backing.storage }),
      null,
    );

    store.leftSidebarOpen = true;
    store.activeSidebarTool = "explorer";

    expect(backing.storage.setItem).toHaveBeenCalledWith(
      "codex_left_sidebar_open",
      "true",
    );
    expect(backing.storage.setItem).toHaveBeenCalledWith(
      "codex_active_sidebar_tool",
      "explorer",
    );
  });

  it("loads persisted leftSidebarOpen and activeSidebarTool on construction", () => {
    const backing = storage({
      codex_left_sidebar_open: "true",
      codex_active_sidebar_tool: "oracle",
    });
    const store = new LayoutUIStore(
      new UIPersistence({ storage: backing.storage }),
      null,
    );

    expect(store.leftSidebarOpen).toBe(true);
    expect(store.activeSidebarTool).toBe("oracle");
  });
});
