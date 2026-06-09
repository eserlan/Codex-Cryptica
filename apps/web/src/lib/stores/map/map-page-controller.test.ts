/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";

vi.mock("$lib/stores/map.svelte", () => ({
  mapStore: {},
}));

vi.mock("$lib/stores/map-session.svelte", () => ({
  mapSession: {},
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {},
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {},
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {},
}));

vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: {},
}));

vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: {
    vttChatSidebarCollapsed: false,
    toggleVttChatSidebar: vi.fn(),
  },
}));

import { MapPageController } from "./map-page-controller.svelte";

function createRectTarget() {
  return {
    getBoundingClientRect: () => ({
      left: 10,
      top: 20,
      right: 210,
      bottom: 220,
      width: 200,
      height: 200,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    }),
  } as HTMLElement;
}

function createDragEvent({
  dataTransfer,
  clientX = 50,
  clientY = 80,
}: {
  dataTransfer: Partial<DataTransfer>;
  clientX?: number;
  clientY?: number;
}) {
  return {
    dataTransfer,
    clientX,
    clientY,
    currentTarget: createRectTarget(),
    preventDefault: vi.fn(),
  } as unknown as DragEvent;
}

function createFileList(files: File[]) {
  return {
    ...files,
    length: files.length,
    item: (index: number) => files[index] ?? null,
  } as unknown as FileList;
}

function createController(overrides: Record<string, unknown> = {}) {
  const mapStore = {
    activeMap: { id: "map-1" },
    unproject: vi.fn((point) => ({ x: point.x + 1, y: point.y + 2 })),
    uploadMap: vi.fn().mockResolvedValue("map-2"),
    addPin: vi.fn(),
  };
  const mapSession = {
    vttEnabled: false,
    mode: "exploration",
    selectedToken: null,
    dragPreview: null,
    clearDragPreview: vi.fn(),
    setDragPreview: vi.fn(),
    addToken: vi.fn(),
    requestTokenAdd: vi.fn(),
  };
  const vault = {
    activeVaultId: "vault-1",
    allEntities: [
      { id: "entity-1", type: "character", title: "Mira", content: "" },
    ],
    entities: {
      "entity-1": {
        id: "entity-1",
        type: "character",
        title: "Mira",
        content: "",
        image: "mira.png",
      },
    },
  };
  const notificationStore = {
    notify: vi.fn(),
  };
  const modalUIStore = {
    openShare: vi.fn(),
  };
  const sessionModeStore = {
    isGuestMode: false,
  };
  const layoutUIStore = {
    vttChatSidebarCollapsed: false,
    toggleVttChatSidebar: vi.fn((collapsed: boolean) => {
      layoutUIStore.vttChatSidebarCollapsed = collapsed;
    }),
  };

  const deps = {
    mapStore,
    mapSession,
    vault,
    modalUIStore,
    notificationStore,
    sessionModeStore,
    layoutUIStore,
    ...overrides,
  } as any;

  return {
    controller: new MapPageController(deps),
    mapStore,
    mapSession,
    vault,
    modalUIStore,
    notificationStore,
    sessionModeStore,
    layoutUIStore,
  };
}

function createEntityTransfer(entityId = "entity-1") {
  return {
    types: ["application/codex-entity"],
    getData: vi.fn(() => entityId),
    setData: vi.fn(),
    effectAllowed: "copy",
    dropEffect: "none",
  } as unknown as DataTransfer;
}

describe("MapPageController", () => {
  it("adds a standard map pin when a host drops an entity", () => {
    const { controller, mapStore, mapSession } = createController();

    controller.onDrop(
      createDragEvent({
        dataTransfer: createEntityTransfer(),
      }),
    );

    expect(mapStore.unproject).toHaveBeenCalledWith({ x: 40, y: 60 });
    expect(mapStore.addPin).toHaveBeenCalledWith("entity-1", {
      x: 41,
      y: 62,
    });
    expect(mapSession.clearDragPreview).toHaveBeenCalled();
  });

  it("adds a VTT token when a host drops a supported entity in VTT mode", () => {
    const { controller, mapSession, mapStore } = createController();
    mapSession.vttEnabled = true;

    controller.onDrop(
      createDragEvent({
        dataTransfer: createEntityTransfer(),
      }),
    );

    expect(mapStore.addPin).not.toHaveBeenCalled();
    expect(mapSession.addToken).toHaveBeenCalledWith({
      name: "Mira",
      entityId: "entity-1",
      imageUrl: "mira.png",
      x: 41,
      y: 62,
    });
  });

  it("blocks guest entity drops with a guest-safe notification", () => {
    const {
      controller,
      mapStore,
      mapSession,
      notificationStore,
      sessionModeStore,
    } = createController();
    sessionModeStore.isGuestMode = true;
    mapSession.vttEnabled = true;

    controller.onDrop(
      createDragEvent({
        dataTransfer: createEntityTransfer(),
      }),
    );

    expect(mapStore.addPin).not.toHaveBeenCalled();
    expect(mapSession.addToken).not.toHaveBeenCalled();
    expect(mapSession.requestTokenAdd).not.toHaveBeenCalled();
    expect(notificationStore.notify).toHaveBeenCalledWith(
      "Guests cannot add map pins or tokens.",
      "info",
    );
  });

  it("opens the upload session when files are dropped", () => {
    const { controller } = createController();
    const files = createFileList([
      new File(["map"], "map.png", { type: "image/png" }),
    ]);

    controller.onDrop(
      createDragEvent({
        dataTransfer: {
          types: ["Files"],
          files,
        },
      }),
    );

    expect(controller.showUpload).toBe(true);
    expect(controller.files?.[0]?.name).toBe("map.png");
  });

  it("uploads the selected file and clears upload state", async () => {
    const { controller, mapStore } = createController();
    const files = createFileList([
      new File(["map"], "map.png", { type: "image/png" }),
    ]);
    controller.files = files;
    controller.mapName = "World Map";
    controller.showUpload = true;

    await controller.handleUpload();

    expect(mapStore.uploadMap).toHaveBeenCalledWith(files[0], "World Map");
    expect(controller.showUpload).toBe(false);
    expect(controller.mapName).toBe("");
    expect(controller.files).toBeNull();
  });

  it("cancels pending upload state when the active vault changes", () => {
    const { controller } = createController();
    controller.showUpload = true;
    controller.mapName = "Stale Map";
    controller.files = [new File(["map"], "map.png")] as unknown as FileList;

    controller.syncActiveVault("vault-2");

    expect(controller.showUpload).toBe(false);
    expect(controller.mapName).toBe("");
    expect(controller.files).toBeNull();
  });

  it("routes map share actions through the global modal store", () => {
    const { controller, modalUIStore } = createController();

    controller.openShareModal();

    expect(modalUIStore.openShare).toHaveBeenCalledTimes(1);
  });
});
