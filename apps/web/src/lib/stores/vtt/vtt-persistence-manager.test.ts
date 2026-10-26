import { describe, expect, it, vi } from "vitest";
import {
  VTTPersistenceManager,
  type VTTPersistenceDependencies,
} from "./vtt-persistence-manager.svelte";
import { createEncounterSession } from "$lib/services/vtt-session";
import type { StorageLike } from "$lib/utils/runtime-deps";

function createMockStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    get length() {
      return store.size;
    },
    key: vi.fn((index: number) => {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    }),
  };
}

function createPersistenceHarness() {
  const mockSessionStorage = createMockStorage();
  const mockLocalStorage = createMockStorage();
  let mapId: string | null = "map-1";
  let vttEnabled = true;
  let myPeerId: string | null = "peer-1";
  let restoring = false;

  const mockSnapshot = createEncounterSession("map-1");

  const deps: VTTPersistenceDependencies = {
    createSnapshot: vi.fn(() => mockSnapshot),
    applySnapshot: vi.fn(),
    emit: vi.fn(),
    getMapId: () => mapId,
    getVttEnabled: () => vttEnabled,
    setVttEnabled: vi.fn((enabled) => {
      vttEnabled = enabled;
    }),
    getMyPeerId: () => myPeerId,
    setMyPeerId: vi.fn((id) => {
      myPeerId = id;
    }),
    getRestoring: () => restoring,
    setRestoring: vi.fn((val) => {
      restoring = val;
    }),
    setHasHydratedSession: vi.fn(),
    sessionStorage: mockSessionStorage,
    localStorage: mockLocalStorage,
  };

  const manager = new VTTPersistenceManager(deps);

  return {
    deps,
    manager,
    mockSessionStorage,
    mockLocalStorage,
    mockSnapshot,
    setMapId: (id: string | null) => {
      mapId = id;
    },
    setRestoring: (val: boolean) => {
      restoring = val;
    },
  };
}

describe("VTTPersistenceManager", () => {
  it("persists draft to injected sessionStorage and localStorage", () => {
    const { manager, deps, mockSessionStorage, mockLocalStorage } =
      createPersistenceHarness();

    manager.persistDraft();

    expect(deps.createSnapshot).toHaveBeenCalled();
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      "codex.vtt.session:map-1",
      expect.any(String),
    );
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "codex.vtt.popout:map-1",
      expect.any(String),
    );
  });

  it("does not persist draft if mapId is null or if restoring", () => {
    const { manager, mockSessionStorage, setMapId, setRestoring } =
      createPersistenceHarness();

    setMapId(null);
    manager.persistDraft();
    expect(mockSessionStorage.setItem).not.toHaveBeenCalled();

    setMapId("map-1");
    setRestoring(true);
    manager.persistDraft();
    expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
  });

  it("scans and finds popout draft keys using storage length and key()", () => {
    const { manager, mockLocalStorage } = createPersistenceHarness();

    mockLocalStorage.setItem("other.key", "foo");
    mockLocalStorage.setItem("codex.vtt.popout:map-99", "payload");

    const foundKey = manager.findPopoutDraftKey();
    expect(foundKey).toBe("codex.vtt.popout:map-99");
  });

  it("restores draft successfully from sessionStorage", () => {
    const { manager, deps, mockSessionStorage, mockSnapshot } =
      createPersistenceHarness();

    const payload = JSON.stringify({
      vttEnabled: true,
      snapshot: mockSnapshot,
    });
    mockSessionStorage.setItem("codex.vtt.session:map-1", payload);

    const restored = manager.restoreDraft("map-1");

    expect(restored).toBe(true);
    expect(deps.applySnapshot).toHaveBeenCalledWith(mockSnapshot, true);
    expect(deps.setHasHydratedSession).toHaveBeenCalledWith(true);
  });

  it("fails to restore draft if snapshot mapId does not match requested mapId", () => {
    const { manager, deps, mockSessionStorage, mockSnapshot } =
      createPersistenceHarness();

    const payload = JSON.stringify({
      vttEnabled: true,
      snapshot: { ...mockSnapshot, mapId: "map-different" },
    });
    mockSessionStorage.setItem("codex.vtt.session:map-1", payload);

    const restored = manager.restoreDraft("map-1");

    expect(restored).toBe(false);
    expect(deps.applySnapshot).not.toHaveBeenCalled();
  });

  it("restores any popout draft if available", () => {
    const { manager, deps, mockLocalStorage, mockSnapshot } =
      createPersistenceHarness();

    const payload = JSON.stringify({
      vttEnabled: true,
      myPeerId: "peer-popout",
      snapshot: mockSnapshot,
    });
    mockLocalStorage.setItem("codex.vtt.popout:map-1", payload);

    const restored = manager.restoreAnyPopoutDraft();

    expect(restored).toBe(true);
    expect(deps.applySnapshot).toHaveBeenCalledWith(mockSnapshot, true);
    expect(deps.setMyPeerId).toHaveBeenCalledWith("peer-popout");
  });
});
