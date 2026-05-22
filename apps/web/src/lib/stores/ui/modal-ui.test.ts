import { describe, it, expect } from "vitest";

// Stub $state before importing the store
(global as any).$state = (v: any) => v;

import { ModalUIStore } from "./modal-ui.svelte";

describe("ModalUIStore", () => {
  it("initializes with default values", () => {
    const store = new ModalUIStore();

    expect(store.showSettings).toBe(false);
    expect(store.activeSettingsTab).toBe("vault");
    expect(store.showCanvasSelector).toBe(false);
    expect(store.pendingCanvasEntities).toEqual([]);
    expect(store.isImporting).toBe(false);
    expect(store.showDiceModal).toBe(false);

    expect(store.showZenMode).toBe(false);
    expect(store.zenModeEntityId).toBeNull();
    expect(store.zenModeActiveTab).toBe("overview");

    expect(store.mergeDialog).toEqual({ open: false, sourceIds: [] });
    expect(store.bulkLabelDialog).toEqual({ open: false, entityIds: [] });
    expect(store.lightbox).toEqual({
      show: false,
      imageUrl: "",
      originRect: null,
    });
  });

  it("handles settings modal", () => {
    const store = new ModalUIStore();
    store.openSettings("intelligence");
    expect(store.showSettings).toBe(true);
    expect(store.activeSettingsTab).toBe("intelligence");

    store.closeSettings();
    expect(store.showSettings).toBe(false);

    store.toggleSettings("theme");
    expect(store.showSettings).toBe(true);
    expect(store.activeSettingsTab).toBe("theme");

    store.toggleSettings("theme");
    expect(store.showSettings).toBe(false);
  });

  it("handles zen mode / read mode modal", () => {
    const store = new ModalUIStore();
    store.openZenMode("123", "map");
    expect(store.showZenMode).toBe(true);
    expect(store.zenModeEntityId).toBe("123");
    expect(store.zenModeActiveTab).toBe("map");
    expect(store.readModeNodeId).toBe("123");
    expect(store.showReadModal).toBe(true);

    store.closeZenMode();
    expect(store.showZenMode).toBe(false);
    expect(store.zenModeEntityId).toBeNull();

    store.openReadMode("456");
    expect(store.showZenMode).toBe(true);
    expect(store.zenModeEntityId).toBe("456");
  });

  it("handles merge dialog", () => {
    const store = new ModalUIStore();
    store.openMergeDialog(["a", "b"]);
    expect(store.mergeDialog).toEqual({ open: true, sourceIds: ["a", "b"] });

    store.closeMergeDialog();
    expect(store.mergeDialog).toEqual({ open: false, sourceIds: [] });
  });

  it("handles canvas selection", () => {
    const store = new ModalUIStore();
    store.openCanvasSelection(["e1", "e2"]);
    expect(store.showCanvasSelector).toBe(true);
    expect(store.pendingCanvasEntities).toEqual(["e1", "e2"]);

    store.closeCanvasSelection();
    expect(store.showCanvasSelector).toBe(false);
    expect(store.pendingCanvasEntities).toEqual([]);
  });

  it("handles lightbox", () => {
    const store = new ModalUIStore();
    const rect = { x: 10, y: 20, width: 100, height: 100 };
    store.openLightbox("img.jpg", "A title", rect);
    expect(store.lightbox.show).toBe(true);
    expect(store.lightbox.imageUrl).toBe("img.jpg");
    expect(store.lightbox.title).toBe("A title");
    expect(store.lightbox.originRect).toEqual(rect);

    store.closeLightbox();
    expect(store.lightbox.show).toBe(false);
    expect(store.lightbox.originRect).toBeNull();
  });
});
