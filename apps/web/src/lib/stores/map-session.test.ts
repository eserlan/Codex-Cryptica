import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uiStore } from "./ui.svelte";

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
    deleteEncounterSnapshot: ReturnType<typeof vi.fn>;
  };
  let store: MapSessionStore;

  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    uiStore.isGuestMode = false;
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
      deleteEncounterSnapshot: vi.fn().mockResolvedValue(undefined),
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
    vi.restoreAllMocks();
    uiStore.isGuestMode = false;
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
      ownerGuestName: "Ava",
      visibleTo: "all",
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
    expect(clone?.ownerGuestName).toBe("Ava");
    expect(clone?.visibleTo).toBe("all");
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

  it("debounces session snapshot broadcasts when initiative values change", () => {
    vi.useFakeTimers();
    const broadcaster = vi.fn();
    store.setBroadcaster(broadcaster);
    const token = store.addToken({ name: "C", x: 0, y: 0 });

    broadcaster.mockClear();
    store.setInitiativeValue(token!.id, 16);
    expect(broadcaster).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);

    expect(broadcaster).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SESSION_SNAPSHOT",
        session: expect.objectContaining({
          initiativeValues: expect.objectContaining({
            [token!.id]: 16,
          }),
        }),
      }),
    );
  });

  it("debounces positional token updates into a session snapshot", () => {
    vi.useFakeTimers();
    const broadcaster = vi.fn();
    store.setBroadcaster(broadcaster);
    const token = store.addToken({ name: "Mover", x: 0, y: 0 });

    broadcaster.mockClear();
    store.moveToken(token!.id, 100, 150);
    expect(broadcaster).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);

    expect(broadcaster).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SESSION_SNAPSHOT",
        session: expect.objectContaining({
          tokens: expect.objectContaining({
            [token!.id]: expect.objectContaining({
              x: 100,
              y: 150,
            }),
          }),
        }),
      }),
    );
  });

  it("broadcasts a shared token image reveal without persisting it to the session", () => {
    const broadcaster = vi.fn();
    store.setBroadcaster(broadcaster);
    const token = store.addToken({
      name: "Portrait Token",
      x: 0,
      y: 0,
      imageUrl: "images/portrait.webp",
    });

    broadcaster.mockClear();

    expect(store.showTokenImageToPlayers(token!.id)).toBe(true);
    expect(store.sharedTokenImage).toBeNull();
    expect(broadcaster).toHaveBeenCalledWith({
      type: "SHOW_TOKEN_IMAGE",
      title: "Portrait Token",
      imagePath: "images/portrait.webp",
    });
  });

  it("stores a remote shared token image reveal locally until it is dismissed", () => {
    store.handleRemoteShowTokenImage("Scout", "images/scout.webp");

    expect(store.sharedTokenImage).toEqual({
      title: "Scout",
      imagePath: "images/scout.webp",
    });

    store.clearSharedTokenImage();

    expect(store.sharedTokenImage).toBeNull();
  });

  it("debounces draft persistence while a token is being dragged", async () => {
    vi.useFakeTimers();
    const token = store.addToken({ name: "Saver", x: 0, y: 0 });

    const draftKey = "codex.vtt.session:map-1";
    const popoutKey = "codex.vtt.popout:map-1";
    expect(window.sessionStorage.getItem(draftKey)).toBeTruthy();
    expect(window.localStorage.getItem(popoutKey)).toBeTruthy();

    store.moveToken(token!.id, 140, 180);

    const initialDraft = window.sessionStorage.getItem(draftKey);
    const initialPopout = window.localStorage.getItem(popoutKey);

    await vi.advanceTimersByTimeAsync(250);

    expect(window.sessionStorage.getItem(draftKey)).not.toBe(initialDraft);
    expect(window.localStorage.getItem(popoutKey)).not.toBe(initialPopout);
  });

  it("persists remote session snapshots for popout hydration without rebroadcasting", async () => {
    vi.useFakeTimers();
    const broadcaster = vi.fn();
    store.setBroadcaster(broadcaster);
    const snapshot = {
      id: "enc-remote",
      mapId: "map-1",
      mode: "combat",
      name: "Remote Encounter",
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
        locked: false,
      },
      createdAt: 1,
      savedAt: null,
      chatMessages: [],
      gridSize: 50,
      gridUnit: "ft",
      gridDistance: 5,
    } as any;

    const draftKey = "codex.vtt.session:map-1";
    const initialDraft = window.sessionStorage.getItem(draftKey);

    store.syncFromRemoteSession(snapshot, false);
    expect(broadcaster).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(250);

    expect(window.sessionStorage.getItem(draftKey)).not.toBe(initialDraft);
  });

  it("does not overwrite guest peer identity in host drafts", () => {
    const token = store.addToken({ name: "Host Saver", x: 0, y: 0 });
    store.myPeerId = "host-peer";
    store.setTokenOwner(token!.id, "guest-peer", "Ava");

    const raw = window.localStorage.getItem("codex.vtt.popout:map-1");
    expect(raw).toBeTruthy();

    const parsed = JSON.parse(raw as string) as {
      myPeerId?: string;
      snapshot?: {
        tokens?: Record<
          string,
          { ownerPeerId?: string | null; ownerGuestName?: string | null }
        >;
      };
    };

    expect(parsed.myPeerId).toBeUndefined();
    expect(parsed.snapshot?.tokens?.[token!.id]?.ownerPeerId).toBe(
      "guest-peer",
    );
    expect(parsed.snapshot?.tokens?.[token!.id]?.ownerGuestName).toBe("Ava");
  });

  it("keeps non-hidden tokens visible regardless of ownership", () => {
    const token = store.addToken({
      name: "Scout",
      x: 0,
      y: 0,
      visibleTo: "all",
    });

    expect(store.canViewToken(token!.id, "guest-peer", false)).toBe(true);
    expect(store.canViewToken(token!.id, "other-peer", false)).toBe(true);

    store.setTokenOwner(token!.id, "guest-peer", "Ava");

    expect(store.canViewToken(token!.id, "guest-peer", false)).toBe(true);
    expect(store.canViewToken(token!.id, "other-peer", false)).toBe(true);
  });

  it("keeps hidden tokens hidden regardless of ownership", () => {
    const token = store.addToken({
      name: "Hidden Scout",
      x: 0,
      y: 0,
      visibleTo: "gm-only",
    });

    expect(store.canViewToken(token!.id, "guest-peer", false)).toBe(false);

    store.setTokenOwner(token!.id, "guest-peer", "Ava");

    expect(store.canViewToken(token!.id, "guest-peer", false)).toBe(false);
    expect(store.canViewToken(token!.id, "other-peer", false)).toBe(false);
  });

  it("normalizes legacy owner-only visibility from restored snapshots", () => {
    store.applySnapshot({
      ...store.createSnapshot(),
      tokens: {
        legacy: {
          id: "legacy",
          name: "Scout",
          entityId: null,
          x: 0,
          y: 0,
          width: 50,
          height: 50,
          rotation: 0,
          zIndex: 0,
          ownerPeerId: "guest-peer",
          ownerGuestName: "Ava",
          visibleTo: "owner-only",
          color: "#fff",
          imageUrl: null,
          statusEffects: [],
        } as any,
      },
      initiativeOrder: ["legacy"],
      initiativeValues: { legacy: 0 },
    });

    expect(store.tokens.legacy.visibleTo).toBe("all");
    expect(store.canViewToken("legacy", "guest-peer", false)).toBe(true);
    expect(store.canViewToken("legacy", "other-peer", false)).toBe(true);
  });

  it("rebinds remembered token ownership when a guest rejoins", () => {
    const token = store.addToken({
      name: "Scout",
      x: 0,
      y: 0,
      ownerPeerId: null,
      ownerGuestName: "Ava",
    });

    const changed = store.rebindGuestOwnership("guest-peer-2", "Ava");

    expect(changed).toBe(true);
    expect(store.tokens[token!.id].ownerPeerId).toBe("guest-peer-2");
    expect(store.tokens[token!.id].ownerGuestName).toBe("Ava");
  });

  it("clears transient peer ownership while keeping remembered guest ownership", () => {
    const token = store.addToken({
      name: "Scout",
      x: 0,
      y: 0,
      ownerPeerId: "guest-peer",
      ownerGuestName: "Ava",
    });

    const changed = store.clearGuestOwnership("guest-peer");

    expect(changed).toBe(true);
    expect(store.tokens[token!.id].ownerPeerId).toBeNull();
    expect(store.tokens[token!.id].ownerGuestName).toBe("Ava");
  });

  it("rounds token coordinates before storing and broadcasting", () => {
    vi.useFakeTimers();
    const broadcaster = vi.fn();
    store.setBroadcaster(broadcaster);
    mapStore.gridSize = 0;
    const token = store.addToken({ name: "Rounded", x: 0, y: 0 });

    broadcaster.mockClear();
    store.moveToken(token!.id, 12.3456, 98.7654);
    vi.advanceTimersByTime(250);

    expect(store.tokens[token!.id].x).toBe(12.35);
    expect(store.tokens[token!.id].y).toBe(98.77);
    expect(broadcaster).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SESSION_SNAPSHOT",
        session: expect.objectContaining({
          tokens: expect.objectContaining({
            [token!.id]: expect.objectContaining({
              x: 12.35,
              y: 98.77,
            }),
          }),
        }),
      }),
    );
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

  it("deletes encounter snapshots from the saved list", async () => {
    store.snapshots = [
      {
        id: "enc-1",
        name: "Goblin Ambush",
        mapId: "map-1",
        savedAt: 10,
        tokenCount: 1,
        round: 1,
        mode: "exploration",
      },
      {
        id: "enc-2",
        name: "Ruined Gate",
        mapId: "map-1",
        savedAt: 20,
        tokenCount: 2,
        round: 2,
        mode: "combat",
      },
    ];

    await store.deleteEncounterSnapshot("enc-1");

    expect(service.deleteEncounterSnapshot).toHaveBeenCalledWith(
      "map-1",
      "enc-1",
    );
    expect(store.snapshots).toHaveLength(1);
    expect(store.snapshots[0].id).toBe("enc-2");
  });

  it("mirrors the current session into popout storage", () => {
    uiStore.isGuestMode = true;
    store.setVttEnabled(true);
    store.myPeerId = "guest-peer";
    const token = store.addToken({
      name: "Mirror",
      x: 20,
      y: 20,
    });

    const raw = window.localStorage.getItem("codex.vtt.popout:map-1");
    expect(raw).toBeTruthy();

    const parsed = JSON.parse(raw!);
    expect(parsed.vttEnabled).toBe(true);
    expect(parsed.myPeerId).toBe("guest-peer");
    expect(parsed.snapshot.mapId).toBe("map-1");
    expect(parsed.snapshot.tokens[token!.id].name).toBe("Mirror");
  });

  it("restores a draft from popout storage when the session draft is missing", () => {
    const snapshot = store.createSnapshot();
    snapshot.mapId = "map-1";
    snapshot.mode = "combat";
    snapshot.round = 4;

    window.sessionStorage.clear();
    window.localStorage.setItem(
      "codex.vtt.popout:map-1",
      JSON.stringify({
        vttEnabled: true,
        myPeerId: "guest-peer",
        snapshot,
      }),
    );

    const mirrorStore = new MapSessionStore({
      mapStore,
      vault,
      service: service as any,
    });
    mirrorStore.bindToMap("map-1");

    expect(mirrorStore.vttEnabled).toBe(true);
    expect(mirrorStore.mapId).toBe("map-1");
    expect(mirrorStore.mode).toBe("combat");
    expect(mirrorStore.round).toBe(4);
  });

  it("restores a standalone popout draft without an active map id", () => {
    mapStore.activeMapId = null;
    window.sessionStorage.clear();
    window.localStorage.clear();

    const snapshot = store.createSnapshot();
    snapshot.mapId = "map-1";
    snapshot.initiativeOrder = ["token-1"];
    snapshot.initiativeValues = { "token-1": 14 };
    snapshot.tokens = {
      "token-1": {
        id: "token-1",
        name: "Scout",
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        visibleTo: "all",
        ownerPeerId: null,
        entityId: null,
        imageUrl: null,
        color: null,
        isStatic: false,
      },
    } as any;

    window.localStorage.setItem(
      "codex.vtt.popout:map-1",
      JSON.stringify({
        vttEnabled: true,
        myPeerId: "guest-peer",
        snapshot,
      }),
    );

    const popoutStore = new MapSessionStore({
      mapStore,
      vault,
      service: service as any,
    });

    (popoutStore as any).handleActiveMapChange(null);

    expect(popoutStore.vttEnabled).toBe(true);
    expect(popoutStore.myPeerId).toBe("guest-peer");
    expect(popoutStore.mapId).toBe("map-1");
    expect(popoutStore.initiativeEntries).toHaveLength(1);
  });

  it("rebroadcasts popout draft updates from the main guest window", () => {
    vi.useFakeTimers();
    const broadcaster = vi.fn();
    store.setBroadcaster(broadcaster);

    const snapshot = store.createSnapshot();
    snapshot.mapId = "map-1";
    snapshot.initiativeOrder = ["token-1"];
    snapshot.initiativeValues = { "token-1": 9 };
    snapshot.tokens = {
      "token-1": {
        id: "token-1",
        entityId: null,
        name: "Scout",
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        rotation: 0,
        zIndex: 0,
        ownerPeerId: null,
        ownerGuestName: null,
        visibleTo: "all",
        color: "#fff",
        imageUrl: null,
        statusEffects: [],
      },
    };

    store.syncFromRemoteSession(snapshot, true);
    expect(broadcaster).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);

    expect(store.initiativeValues["token-1"]).toBe(9);
    expect(broadcaster).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SESSION_SNAPSHOT",
      }),
    );
  });

  it("coalesces repeated initiative updates into a single broadcast", () => {
    vi.useFakeTimers();
    const broadcaster = vi.fn();
    store.setBroadcaster(broadcaster);
    const token = store.addToken({ name: "C", x: 0, y: 0 });

    broadcaster.mockClear();
    store.setInitiativeValue(token!.id, 12);
    store.setInitiativeValue(token!.id, 15);
    expect(broadcaster).not.toHaveBeenCalled();

    vi.advanceTimersByTime(250);

    expect(broadcaster).toHaveBeenCalledTimes(1);
    expect(broadcaster).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "SESSION_SNAPSHOT",
        session: expect.objectContaining({
          initiativeValues: expect.objectContaining({
            [token!.id]: 15,
          }),
        }),
      }),
    );
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

  it("keeps a hydrated session alive while the active map id is temporarily null", () => {
    const snapshot = store.createSnapshot();
    snapshot.mapId = "map-1";
    snapshot.initiativeOrder = ["token-1"];
    snapshot.initiativeValues = { "token-1": 17 };
    snapshot.tokens = {
      "token-1": {
        id: "token-1",
        name: "Scout",
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        visibleTo: "all",
        ownerPeerId: null,
        entityId: null,
        imageUrl: null,
        color: null,
        isStatic: false,
      },
    } as any;

    store.syncFromRemoteSession(snapshot);
    expect(store.initiativeEntries).toHaveLength(1);

    mapStore.activeMapId = null;
    (store as any).handleActiveMapChange(null);

    expect(store.mapId).toBe("map-1");
    expect(store.vttEnabled).toBe(true);
    expect(store.initiativeEntries).toHaveLength(1);
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
        timestamp: expect.any(Number),
      }),
    );
  });

  it("broadcasts resolved modal roll results to VTT chat", () => {
    const emitSpy = vi.spyOn(store as any, "emit");
    store.vttEnabled = true;

    store.sendResolvedRollMessage("2d20kh1 + 5", {
      total: 22,
      parts: [
        {
          type: "dice",
          value: 17,
          sides: 20,
          rolls: [17, 9],
          dropped: [9],
        },
        {
          type: "modifier",
          value: 5,
        },
      ],
    } as any);

    expect(store.chatMessages.at(-1)).toMatchObject({
      type: "CHAT_MESSAGE",
      content: "/roll 2d20kh1 + 5",
      roll: {
        formula: "2d20kh1 + 5",
        total: 22,
      },
    });
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CHAT_MESSAGE",
        content: "/roll 2d20kh1 + 5",
        roll: expect.objectContaining({
          formula: "2d20kh1 + 5",
          total: 22,
        }),
      }),
    );
  });

  it("clears chat and emits a shared clear event", () => {
    const emitSpy = vi.spyOn(store as any, "emit");
    store.vttEnabled = true;
    store.chatMessages = [
      {
        type: "CHAT_MESSAGE",
        sender: "GM",
        senderId: "host",
        content: "hello",
        timestamp: Date.now(),
      },
    ];

    store.clearChatMessages();

    expect(store.chatMessages).toEqual([]);
    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CHAT_CLEAR",
      }),
    );
  });

  it("applies remote chat clear events locally", () => {
    store.chatMessages = [
      {
        type: "CHAT_MESSAGE",
        sender: "GM",
        senderId: "host",
        content: "hello",
        timestamp: Date.now(),
      },
    ];

    store.handleRemoteChatClear();

    expect(store.chatMessages).toEqual([]);
  });
});
