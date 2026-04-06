import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const effect = vi.fn();
  (effect as any).root = (fn: any) => fn?.();
  (globalThis as any).$state = (value: any) => value;
  (globalThis as any).$state.raw = (value: any) => value;
  (globalThis as any).$derived = (value: any) => value;
  (globalThis as any).$derived.by = (fn: any) => fn();
  (globalThis as any).$effect = effect;
});

vi.mock("./map.svelte", () => ({
  mapStore: {
    activeMapId: "map-1",
    activeMap: {
      id: "map-1",
      dimensions: { width: 300, height: 300 },
    },
    gridSize: 50,
    showGrid: true,
    isGMMode: true,
    viewport: {
      pan: { x: 0, y: 0 },
      zoom: 1,
    },
    selectMap: vi.fn(),
  },
}));

vi.mock("./vault.svelte", () => ({
  vault: {
    getActiveVaultHandle: vi.fn(),
  },
}));

import { mapStore } from "./map.svelte";
import { vault } from "./vault.svelte";
import { MapSessionStore } from "./map-session.svelte";

describe("MapSessionStore", () => {
  let service: {
    saveEncounterSnapshot: ReturnType<typeof vi.fn>;
    listEncounterSnapshots: ReturnType<typeof vi.fn>;
    loadEncounterSnapshot: ReturnType<typeof vi.fn>;
  };
  let store: MapSessionStore;

  beforeEach(() => {
    window.sessionStorage.clear();
    mapStore.activeMapId = "map-1";
    mapStore.gridSize = 50;
    service = {
      saveEncounterSnapshot: vi.fn().mockResolvedValue({
        encounterId: "enc-1",
        summary: {
          id: "enc-1",
          name: "Goblin Ambush",
          mapId: "map-1",
          savedAt: 10,
          tokenCount: 1,
          round: 1,
          mode: "exploration",
        },
        path: "maps/map-1_encounter_enc-1.json",
      }),
      listEncounterSnapshots: vi.fn().mockResolvedValue([]),
      loadEncounterSnapshot: vi.fn().mockResolvedValue({
        id: "enc-2",
        name: "Ruined Gate",
        mapId: "map-1",
        mode: "combat",
        tokens: {},
        initiativeOrder: [],
        initiativeValues: {},
        round: 2,
        turnIndex: 0,
        selection: null,
        sessionFogMask: null,
        lastPing: null,
        measurement: {
          active: false,
          start: null,
          end: null,
        },
        createdAt: 1,
        savedAt: 2,
      }),
    };
    store = new MapSessionStore({
      mapStore,
      vault,
      service: service as any,
    });
    store.bindToMap("map-1");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds and moves tokens with grid snapping", () => {
    const token = store.addToken({
      name: "Goblin",
      x: 73,
      y: 126,
      width: 50,
      height: 50,
    });

    expect(token?.x).toBe(50);
    expect(token?.y).toBe(150);
    expect(store.tokens[token!.id]).toBeDefined();

    const moved = store.moveToken(token!.id, 99, 101, true);
    expect(moved?.x).toBe(100);
    expect(moved?.y).toBe(100);
  });

  it("clones a token with an offset and preserved state", () => {
    const source = store.addToken({
      name: "Scout",
      x: 40,
      y: 60,
      entityId: "entity-1",
      ownerPeerId: "peer-1",
      visibleTo: "owner-only",
      color: "#22c55e",
      imageUrl: "image.png",
    });
    store.setInitiativeValue(source!.id, 14);
    store.setSelection(source!.id);

    const clone = store.cloneToken(source!.id);

    expect(clone).toBeTruthy();
    expect(clone?.id).not.toBe(source!.id);
    expect(clone?.name).toBe("Scout #2");
    expect(clone?.x).toBe(source!.x + 50);
    expect(clone?.y).toBe(source!.y + 50);
    expect(clone?.entityId).toBe("entity-1");
    expect(clone?.ownerPeerId).toBe("peer-1");
    expect(clone?.visibleTo).toBe("owner-only");
    expect(clone?.imageUrl).toBe("image.png");
    expect(store.selection).toBe(clone?.id);
    expect(store.initiativeValues[clone!.id]).toBe(14);
    expect(store.initiativeOrder).toContain(clone!.id);
  });

  it("sorts initiative values and advances turns", () => {
    const first = store.addToken({ name: "A", x: 0, y: 0 });
    const second = store.addToken({ name: "B", x: 0, y: 0 });
    store.setInitiativeValue(first!.id, 8);
    store.setInitiativeValue(second!.id, 12);

    expect(store.initiativeOrder[0]).toBe(second!.id);
    expect(store.activeTokenId).toBe(first!.id);

    expect(store.advanceTurn()).toBe(second!.id);
    expect(store.round).toBe(2);
    expect(store.advanceTurn()).toBe(first!.id);
  });

  it("stores remote ping state and snapshot sync", async () => {
    store.handleRemotePing(10, 20, "peer-1");
    expect(store.lastPing).toMatchObject({
      x: 10,
      y: 20,
      peerId: "peer-1",
    });
    expect(store.pings["peer-1"]).toMatchObject({
      x: 10,
      y: 20,
      peerId: "peer-1",
    });

    await store.saveEncounterSnapshot("enc-1");
    expect(service.saveEncounterSnapshot).toHaveBeenCalled();
    expect(store.snapshots[0].id).toBe("enc-1");
    expect(store.snapshots[0].name).toBe("Goblin Ambush");

    await store.loadEncounterSnapshot("enc-2");
    expect(service.loadEncounterSnapshot).toHaveBeenCalledWith(
      "map-1",
      "enc-2",
    );
    expect(store.sessionId).toBe("enc-2");
    expect(store.name).toBe("Ruined Gate");
    expect(store.mode).toBe("combat");
  });

  it("selects the host map when syncing a remote session", () => {
    vi.mocked(mapStore.selectMap).mockClear();
    mapStore.activeMapId = "map-2";

    store.syncFromRemoteSession({
      id: "enc-3",
      name: "Host Encounter",
      mapId: "map-1",
      mode: "combat",
      tokens: {},
      initiativeOrder: [],
      initiativeValues: {},
      round: 1,
      turnIndex: 0,
      selection: null,
      sessionFogMask: null,
      lastPing: null,
      measurement: {
        active: false,
        start: null,
        end: null,
      },
      createdAt: 1,
      savedAt: null,
      chatMessages: [],
      gridSize: 50,
      gridUnit: "ft",
      gridDistance: 5,
    });
  });

  it("syncs from a remote session and updates mapStore", () => {
    const snapshot = store.createSnapshot();
    snapshot.mapId = "map-1";
    snapshot.gridSize = 75;
    snapshot.gridUnit = "m";
    snapshot.gridDistance = 1.5;

    store.syncFromRemoteSession(snapshot);

    expect(mapStore.selectMap).toHaveBeenCalledWith("map-1");
    expect(store.mapId).toBe("map-1");
    expect(store.vttEnabled).toBe(true);
    expect(mapStore.gridSize).toBe(75);
    expect(store.gridUnit).toBe("m");
    expect(store.gridDistance).toBe(1.5);
  });

  it("starts a new encounter", () => {
    store.name = "Old Encounter";
    store.addToken({
      name: "Scout",
      x: 20,
      y: 20,
      ownerPeerId: "peer-1",
    });
    store.setInitiativeValue(Object.keys(store.tokens)[0], 11);
    store.vttEnabled = true;

    const next = store.startNewEncounter("Fresh Ambush");

    expect(next?.mapId).toBe("map-1");
    expect(next?.name).toBe("Fresh Ambush");
    expect(store.mapId).toBe("map-1");
    expect(store.name).toBe("Fresh Ambush");
    expect(store.sessionId).toBe(next?.id);
    expect(store.tokens).toEqual({});
    expect(store.initiativeOrder).toEqual([]);
    expect(store.initiativeValues).toEqual({});
    expect(store.round).toBe(1);
    expect(store.turnIndex).toBe(0);
    expect(store.selection).toBeNull();
    expect(store.vttEnabled).toBe(true);
    expect(store.savedAt).toBeNull();
  });

  it("reverts optimistic guest token moves when the host stays silent", () => {
    vi.useFakeTimers();
    const token = store.addToken({
      name: "Scout",
      x: 20,
      y: 20,
      ownerPeerId: "peer-1",
    });

    store.requestTokenMove(token!.id, 120, 120);
    expect(store.tokens[token!.id].x).toBe(100);
    expect(store.tokens[token!.id].y).toBe(100);

    vi.advanceTimersByTime(500);

    expect(store.tokens[token!.id].x).toBe(0);
    expect(store.tokens[token!.id].y).toBe(0);
    vi.useRealTimers();
  });

  it("triggers local pings and emits messages", () => {
    const emitSpy = vi.spyOn(store as any, "emit");
    store.ping(150, 250);

    expect(store.lastPing).toMatchObject({
      x: 150,
      y: 250,
      peerId: "host",
    });
    expect(store.pings["host"]).toMatchObject({
      x: 150,
      y: 250,
      peerId: "host",
    });
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "PING",
        x: 150,
        y: 250,
      }),
    );
  });
});
