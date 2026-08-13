import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  VTTSessionLifecycleManager,
  type VTTSessionLifecycleManagerDependencies,
} from "./vtt-session-lifecycle-manager.svelte";
import type { EncounterSnapshotSummary, SessionMode } from "../../../types/vtt";

function createLifecycleHarness() {
  const mockSessionStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
  const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };

  const state = {
    mapId: null as string | null,
    vttEnabled: true,
    sessionId: null as string | null,
    mode: "combat" as SessionMode,
    name: "Existing Encounter",
    fogMask: "fog-mask" as string | null,
    createdAt: 0,
    savedAt: 10 as number | null,
    snapshots: [
      {
        id: "snap-1",
        name: "Saved",
        mapId: "map-1",
        savedAt: 10,
        tokenCount: 1,
        round: 2,
        mode: "combat",
      },
    ] as EncounterSnapshotSummary[],
  };

  const deps: VTTSessionLifecycleManagerDependencies = {
    getMapId: () => state.mapId,
    setMapId: vi.fn((mapId) => {
      state.mapId = mapId;
    }),
    setVttEnabled: vi.fn((enabled) => {
      state.vttEnabled = enabled;
    }),
    clearPendingSessionSnapshotBroadcast: vi.fn(),
    restoreAnyPopoutDraft: vi.fn(() => false),
    restoreDraft: vi.fn(() => false),
    getDraftKey: (mapId) => `draft:${mapId}`,
    getPopoutKey: (mapId) => `popout:${mapId}`,
    loadGridMeasure: vi.fn(),
    setSessionId: vi.fn((sessionId) => {
      state.sessionId = sessionId;
    }),
    setMode: vi.fn((mode) => {
      state.mode = mode;
    }),
    setEncounterName: vi.fn((name) => {
      state.name = name;
    }),
    resetTokenManager: vi.fn(),
    resetInitiativeManager: vi.fn(),
    setSessionFogMask: vi.fn((mask) => {
      state.fogMask = mask;
    }),
    resetMeasurementManager: vi.fn(),
    resetMediaManager: vi.fn(),
    setCreatedAt: vi.fn((createdAt) => {
      state.createdAt = createdAt;
    }),
    setSavedAt: vi.fn((savedAt) => {
      state.savedAt = savedAt;
    }),
    setSnapshots: vi.fn((snapshots) => {
      state.snapshots = snapshots;
    }),
    resetChatManager: vi.fn(),
    resetEncounterManager: vi.fn(),
    sessionStorage: mockSessionStorage,
    localStorage: mockLocalStorage,
  };

  return {
    state,
    deps,
    mockSessionStorage,
    mockLocalStorage,
    manager: new VTTSessionLifecycleManager(deps),
  };
}

describe("VTTSessionLifecycleManager", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("binds to an active map and tracks restored hydration state", () => {
    const { deps, manager } = createLifecycleHarness();
    vi.mocked(deps.restoreDraft).mockReturnValue(true);

    manager.handleActiveMapChange("map-1");

    expect(deps.setMapId).toHaveBeenCalledWith("map-1");
    expect(deps.loadGridMeasure).toHaveBeenCalledWith("map-1");
    expect(deps.restoreDraft).toHaveBeenCalledWith("map-1");
    expect(manager.restoredMapId).toBe("map-1");
    expect(manager.hasHydratedSession).toBe(true);
    expect(deps.resetTokenManager).not.toHaveBeenCalled();
  });

  it("creates a fresh encounter when no draft exists for the active map", () => {
    const { deps, state, manager } = createLifecycleHarness();

    manager.bindToMap("map-1");

    expect(state.mapId).toBe("map-1");
    expect(state.sessionId).toEqual(expect.any(String));
    expect(state.mode).toBe("exploration");
    expect(state.name).toMatch(/^Encounter /);
    expect(state.fogMask).toBeNull();
    expect(state.savedAt).toBeNull();
    expect(state.snapshots).toEqual([]);
    expect(deps.clearPendingSessionSnapshotBroadcast).toHaveBeenCalled();
    expect(deps.resetTokenManager).toHaveBeenCalled();
    expect(deps.resetChatManager).toHaveBeenCalled();
  });

  it("keeps a hydrated session alive while the active map is temporarily absent", () => {
    const { deps, state, manager } = createLifecycleHarness();
    state.mapId = "map-1";
    manager.setHasHydratedSession(true);

    manager.handleActiveMapChange(null);

    expect(state.mapId).toBe("map-1");
    expect(deps.restoreAnyPopoutDraft).not.toHaveBeenCalled();
    expect(deps.resetEncounterManager).not.toHaveBeenCalled();
  });

  it("restores a popout draft before clearing when no active map exists", () => {
    const { deps, manager } = createLifecycleHarness();
    vi.mocked(deps.restoreAnyPopoutDraft).mockReturnValue(true);

    manager.handleActiveMapChange(null);

    expect(deps.restoreAnyPopoutDraft).toHaveBeenCalled();
    expect(deps.resetEncounterManager).not.toHaveBeenCalled();
  });

  it("clears stale session state when popout draft restoration fails", () => {
    const { deps, state, manager } = createLifecycleHarness();
    state.mapId = "stale-map";
    vi.mocked(deps.restoreAnyPopoutDraft).mockReturnValue(false);

    manager.handleActiveMapChange(null);

    expect(deps.restoreAnyPopoutDraft).toHaveBeenCalled();
    expect(state.mapId).toBeNull();
    expect(state.vttEnabled).toBe(false);
    expect(deps.resetEncounterManager).toHaveBeenCalled();
  });

  it("clears drafts and live session state on explicit session clear", () => {
    const { deps, state, mockSessionStorage, mockLocalStorage, manager } =
      createLifecycleHarness();
    state.mapId = "map-1";
    manager.setHasHydratedSession(true);

    manager.clearSession(true);

    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("draft:map-1");
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("popout:map-1");
    expect(state.mapId).toBeNull();
    expect(state.vttEnabled).toBe(false);
    expect(manager.hasHydratedSession).toBe(false);
    expect(deps.resetTokenManager).toHaveBeenCalled();
    expect(deps.resetInitiativeManager).toHaveBeenCalled();
    expect(deps.resetMeasurementManager).toHaveBeenCalled();
    expect(deps.resetMediaManager).toHaveBeenCalled();
    expect(deps.resetChatManager).toHaveBeenCalled();
    expect(deps.resetEncounterManager).toHaveBeenCalled();
  });
});
