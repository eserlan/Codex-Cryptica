/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: {
    isInitialized: true,
    isGuest: false,
    allEntities: [{ id: "e1" }],
    vaultName: "My World",
    status: "idle",
    failedFiles: [],
    hasFolderHandle: false,
    isDirty: false,
    loadPhase: "idle",
    syncStats: { total: 0, progress: 0 },
    createEntity: vi.fn(async () => "new-id"),
    getActiveFolderHandle: vi.fn(async () => null),
    getActiveVaultHandle: vi.fn(async () => null),
  },
}));

const mockEntityTemplateStore = vi.hoisted(() => ({
  loaded: true,
  templatesFor: vi.fn(() => [
    {
      id: "tmpl-char-default",
      name: "Default Character",
      entityType: "character",
    },
    {
      id: "tmpl-char-operative",
      name: "Syndicate Operative",
      entityType: "character",
    },
  ]),
  effectiveDefaultFor: vi.fn(() => "tmpl-char-default"),
}));

vi.mock("#lib/stores/entity-templates/entity-template-store.svelte.js", () => ({
  entityTemplateStore: mockEntityTemplateStore,
}));

const profile = vi.hoisted(() => ({ isTalesOfTheValiant: false }));

vi.mock("#lib/stores/system-profile.svelte.js", () => ({
  systemProfileStore: {
    get isTalesOfTheValiant() {
      return profile.isTalesOfTheValiant;
    },
  },
}));

vi.mock("#lib/stores/categories.svelte.js", () => ({
  categories: { list: [{ id: "character", label: "Character" }] },
}));

vi.mock("#lib/stores/theme.svelte.js", () => ({
  themeStore: {
    jargon: { vault: "World", entity: "Entity" },
    worldThemeId: "fantasy",
    resolveJargon: (key: string) => key,
  },
}));

vi.mock("#lib/services/demo.js", () => ({
  demoService: {
    startDemo: vi.fn(),
    exitDemo: vi.fn(),
    convertToWorld: vi.fn(),
  },
}));

vi.mock("#lib/cloud-bridge/p2p/guest-service.js", () => ({
  p2pGuestService: { leaveSession: vi.fn() },
}));

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));

vi.mock("#lib/stores/ui/session-mode.svelte.js", () => ({
  sessionModeStore: { isDemoMode: false, isGuestMode: false },
}));

vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { notify: vi.fn() },
}));

vi.mock("#lib/stores/ui/modal-ui.svelte.js", () => ({
  modalUIStore: {
    pendingCreateEntity: false,
    pendingCreateDate: null,
    showVaultSwitcher: false,
    openVaultSwitcher: vi.fn(),
    openGeneratorWorkflow: vi.fn(),
    openStatBlockImport: vi.fn(),
    openShare: vi.fn(),
  },
}));

vi.mock("#lib/stores/ui/layout-ui.svelte.js", () => ({
  layoutUIStore: { isMobile: false },
}));

vi.mock("#lib/stores/online.svelte.js", () => ({
  onlineStatus: { current: true },
}));

vi.mock("#lib/stores/ui/navigation.js", () => ({
  openImportWindow: vi.fn(),
}));

vi.mock("#lib/services/EntityTemplateService.svelte.js", () => ({
  entityTemplateService: {
    resolveTemplate: vi.fn(async () => ""),
    extractSummary: vi.fn(() => ""),
  },
}));

vi.mock("#lib/stores/proposer.svelte.js", () => ({
  proposerStore: { draftEntity: null, clearDraftEntity: vi.fn() },
}));

import VaultControls from "./VaultControls.svelte";
import { guidedModeStore } from "#lib/stores/ui/guided-mode.svelte.js";
import { modalUIStore } from "#lib/stores/ui/modal-ui.svelte.js";

describe("VaultControls", () => {
  beforeEach(() => {
    guidedModeStore.setGuidedMode(true);
    modalUIStore.pendingCreateEntity = false;
  });

  it("hides the vault-actions/save cluster in Guided Mode", () => {
    render(VaultControls);

    expect(screen.queryByTestId("vault-actions-menu-button")).toBeNull();
    // The vault switcher stays available for navigation.
    expect(
      screen.getByRole("button", { name: "Switch Vault: My World" }),
    ).toBeTruthy();
  });

  it("shows the grouped vault actions in Full Toolbox mode", () => {
    guidedModeStore.setGuidedMode(false);
    render(VaultControls);

    expect(screen.getByTestId("vault-actions-menu-button")).toBeTruthy();
  });

  it("no longer exposes the redundant generator button in the header (superseded by sidebar and footer)", () => {
    guidedModeStore.setGuidedMode(false);
    render(VaultControls);

    expect(screen.queryByTestId("open-generator-button")).toBeNull();
  });

  it("no longer exposes the standalone NEW ENTITY toggle (superseded by header + Create)", () => {
    guidedModeStore.setGuidedMode(false);
    render(VaultControls);

    expect(screen.queryByTestId("new-entity-button")).toBeNull();
  });

  it("renders template archetype selector when multiple templates exist for new entity type", () => {
    guidedModeStore.setGuidedMode(false);
    modalUIStore.pendingCreateEntity = true;
    render(VaultControls);

    const templateSelect = screen.getByTestId(
      "new-entity-template-select",
    ) as HTMLSelectElement;
    expect(templateSelect).toBeTruthy();
    expect(templateSelect.value).toBe("tmpl-char-default");
  });

  it("passes selected templateId to entityTemplateService.resolveTemplate on entity creation", async () => {
    const { entityTemplateService } =
      await import("#lib/services/EntityTemplateService.svelte.js");
    guidedModeStore.setGuidedMode(false);
    modalUIStore.pendingCreateEntity = true;
    render(VaultControls);

    const titleInput = screen.getByTestId("new-entity-title-input");
    await fireEvent.input(titleInput, { target: { value: "Bob Operative" } });

    const templateSelect = screen.getByTestId("new-entity-template-select");
    await fireEvent.change(templateSelect, {
      target: { value: "tmpl-char-operative" },
    });

    const form = titleInput.closest("form")!;
    await fireEvent.submit(form);

    expect(entityTemplateService.resolveTemplate).toHaveBeenCalledWith(
      "character",
      "fantasy",
      null,
      { templateId: "tmpl-char-operative" },
    );
  });
});

describe("VaultControls: stat block import entry point", () => {
  beforeEach(() => {
    guidedModeStore.setGuidedMode(false);
    profile.isTalesOfTheValiant = false;
  });

  it("offers FROM STAT BLOCK in a ToV vault and opens the import", async () => {
    profile.isTalesOfTheValiant = true;
    modalUIStore.pendingCreateEntity = true;
    render(VaultControls);
    await fireEvent.click(screen.getByTestId("new-entity-from-stat-block"));
    expect(modalUIStore.openStatBlockImport).toHaveBeenCalledWith({});
  });

  it("does not offer FROM STAT BLOCK in other vaults", () => {
    modalUIStore.pendingCreateEntity = true;
    render(VaultControls);
    expect(screen.queryByTestId("new-entity-from-stat-block")).toBeNull();
  });
});
