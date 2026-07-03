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
      imagePath: "",
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

  it("handles vault switcher with create/open intent", () => {
    const store = new ModalUIStore();
    expect(store.showVaultSwitcher).toBe(false);
    expect(store.vaultSwitcherIntent).toBeNull();

    store.openVaultSwitcher("create");
    expect(store.showVaultSwitcher).toBe(true);
    expect(store.vaultSwitcherIntent).toBe("create");

    store.closeVaultSwitcher();
    expect(store.showVaultSwitcher).toBe(false);
    expect(store.vaultSwitcherIntent).toBeNull();

    store.openVaultSwitcher("open");
    expect(store.vaultSwitcherIntent).toBe("open");

    // No-argument call defaults to a null intent (plain switcher)
    store.openVaultSwitcher();
    expect(store.vaultSwitcherIntent).toBeNull();
  });

  it("handles lightbox", () => {
    const store = new ModalUIStore();
    const rect = { x: 10, y: 20, width: 100, height: 100 };
    store.openLightbox("img.jpg", "A title", rect, "images/pic.png");
    expect(store.lightbox.show).toBe(true);
    expect(store.lightbox.imageUrl).toBe("img.jpg");
    expect(store.lightbox.title).toBe("A title");
    expect(store.lightbox.originRect).toEqual(rect);
    expect(store.lightbox.imagePath).toBe("images/pic.png");

    store.closeLightbox();
    expect(store.lightbox.show).toBe(false);
    expect(store.lightbox.originRect).toBeNull();
    expect(store.lightbox.imagePath).toBe("");
  });

  it("openGeneratorWorkflow sets workspace launch mode", () => {
    const store = new ModalUIStore();
    store.openGeneratorWorkflow("npc");
    expect(store.generatorWorkflow).toEqual({
      open: true,
      launchMode: "workspace",
      sourceEntityId: null,
      generatorId: "npc",
      prefillDate: null,
    });
    store.closeGeneratorWorkflow();
    expect(store.generatorWorkflow.open).toBe(false);
    expect(store.generatorWorkflow.generatorId).toBeNull();
  });

  it("openGeneratorWorkflow defaults generatorId to null", () => {
    const store = new ModalUIStore();
    store.openGeneratorWorkflow();
    expect(store.generatorWorkflow.generatorId).toBeNull();
    expect(store.generatorWorkflow.launchMode).toBe("workspace");
  });

  it("openGeneratorWorkflowForEntity sets contextual launch mode", () => {
    const store = new ModalUIStore();
    store.openGeneratorWorkflowForEntity("src-42", "faction");
    expect(store.generatorWorkflow).toEqual({
      open: true,
      launchMode: "contextual",
      sourceEntityId: "src-42",
      generatorId: "faction",
      prefillDate: null,
    });
  });

  it("requestCreateEntity sets pendingCreateEntity and clears date when none given", () => {
    const store = new ModalUIStore();
    store.requestCreateEntity();
    expect(store.pendingCreateEntity).toBe(true);
    expect(store.pendingCreateDate).toBeNull();
  });

  it("requestCreateEntity sets pendingCreateDate when a date is provided", () => {
    const store = new ModalUIStore();
    const date = { year: 1423, month: 7, day: 15 };
    store.requestCreateEntity(date);
    expect(store.pendingCreateEntity).toBe(true);
    expect(store.pendingCreateDate).toEqual(date);
  });

  it("requestCreateEntity treats explicit null as no date", () => {
    const store = new ModalUIStore();
    store.pendingCreateDate = { year: 1, month: 1, day: 1 };
    store.requestCreateEntity(null);
    expect(store.pendingCreateDate).toBeNull();
    expect(store.pendingCreateEntity).toBe(true);
  });

  it("handles revision dialog", () => {
    const store = new ModalUIStore();
    expect(store.revisionDialog).toEqual({
      open: false,
      entityId: null,
      instructions: "",
    });
    expect(store.isAnyModalOpen).toBe(false);

    store.openRevisionDialog("e1");
    expect(store.revisionDialog).toEqual({
      open: true,
      entityId: "e1",
      instructions: "",
    });
    expect(store.isAnyModalOpen).toBe(true);

    store.closeRevisionDialog();
    expect(store.revisionDialog).toEqual({
      open: false,
      entityId: null,
      instructions: "",
    });
    expect(store.isAnyModalOpen).toBe(false);
  });

  it("handles vault theme prompt", () => {
    const store = new ModalUIStore();
    expect(store.vaultThemePrompt).toEqual({
      open: false,
      vaultId: null,
    });
    expect(store.isAnyModalOpen).toBe(false);

    store.openVaultThemePrompt("v1");
    expect(store.vaultThemePrompt).toEqual({
      open: true,
      vaultId: "v1",
    });
    expect(store.isAnyModalOpen).toBe(true);

    store.closeVaultThemePrompt();
    expect(store.vaultThemePrompt).toEqual({
      open: false,
      vaultId: null,
    });
    expect(store.isAnyModalOpen).toBe(false);
  });
});
