/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("$lib/stores/vault.svelte", () => ({
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
  },
}));

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: { list: [{ id: "character", label: "Character" }] },
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    jargon: { vault: "World", entity: "Entity" },
    worldThemeId: "fantasy",
    resolveJargon: (key: string) => key,
  },
}));

vi.mock("$lib/services/demo", () => ({
  demoService: {
    startDemo: vi.fn(),
    exitDemo: vi.fn(),
    convertToWorld: vi.fn(),
  },
}));

vi.mock("$lib/cloud-bridge/p2p/guest-service", () => ({
  p2pGuestService: { leaveSession: vi.fn() },
}));

vi.mock("$app/paths", () => ({ base: "" }));
vi.mock("$app/navigation", () => ({ goto: vi.fn() }));

vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: { isDemoMode: false, isGuestMode: false },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { notify: vi.fn() },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    pendingCreateEntity: false,
    pendingCreateDate: null,
    showVaultSwitcher: false,
    openVaultSwitcher: vi.fn(),
    openGeneratorWorkflow: vi.fn(),
    openShare: vi.fn(),
  },
}));

vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: { isMobile: false },
}));

vi.mock("$lib/stores/online.svelte", () => ({
  onlineStatus: { current: true },
}));

vi.mock("$lib/stores/ui/navigation", () => ({
  openImportWindow: vi.fn(),
}));

vi.mock("$lib/services/EntityTemplateService.svelte", () => ({
  entityTemplateService: {
    resolveTemplate: vi.fn(async () => ""),
    extractSummary: vi.fn(() => ""),
  },
}));

vi.mock("$lib/stores/proposer.svelte", () => ({
  proposerStore: { draftEntity: null, clearDraftEntity: vi.fn() },
}));

import VaultControls from "./VaultControls.svelte";
import { guidedModeStore } from "$lib/stores/ui/guided-mode.svelte";

describe("VaultControls", () => {
  beforeEach(() => {
    guidedModeStore.setGuidedMode(true);
  });

  it("hides the import/save/generate/share cluster in Guided Mode", () => {
    render(VaultControls);

    expect(screen.queryByTestId("import-vault-button")).toBeNull();
    expect(screen.queryByTestId("open-generator-button")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /share campaign/i }),
    ).toBeNull();
    // The vault switcher stays available for navigation.
    expect(screen.getByTestId("open-vault-button")).toBeTruthy();
  });

  it("shows the full cluster in Full Toolbox mode", () => {
    guidedModeStore.setGuidedMode(false);
    render(VaultControls);

    expect(screen.getByTestId("import-vault-button")).toBeTruthy();
    expect(screen.getByTestId("open-generator-button")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /share campaign/i }),
    ).toBeTruthy();
  });

  it("no longer exposes the standalone NEW ENTITY toggle (superseded by header + Create)", () => {
    guidedModeStore.setGuidedMode(false);
    render(VaultControls);

    expect(screen.queryByTestId("new-entity-button")).toBeNull();
  });
});
