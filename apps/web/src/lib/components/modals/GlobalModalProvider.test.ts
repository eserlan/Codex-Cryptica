/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$app/state", () => ({
  page: {
    url: new URL("http://localhost/"),
  },
}));

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$app/environment", () => ({
  browser: true,
}));

vi.mock("$lib/stores/help.svelte", () => ({
  helpStore: {
    activeTour: null,
  },
}));

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: {
    isOpen: false,
  },
}));

vi.mock("$lib/stores/search.svelte", () => ({
  searchStore: {
    isOpen: false,
  },
}));

vi.mock("$lib/stores/ui/onboarding.svelte", () => ({
  onboardingStore: {
    showChangelog: false,
  },
}));

vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: {
    confirmationDialog: {
      open: false,
    },
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    showSettings: false,
    mergeDialog: { open: false, sourceIds: [] },
    bulkLabelDialog: { open: false, entityIds: [] },
    soundBite: { show: false, entityId: null },
    relatedEntityDialog: { open: false, sourceEntityId: null },
    showVaultSwitcher: false,
    vaultThemePrompt: { open: false, vaultId: null },
    showShare: false,
    imagePromptReview: { open: false, target: null, prompt: "" },
    revisionDialog: { open: false, entityId: null, instructions: "" },
    generatorWorkflow: {
      open: false,
      launchMode: "workspace",
      sourceEntityId: null,
      generatorId: null,
    },
    lightbox: { show: false, imageUrl: "", title: "" },
    showCanvasSelector: false,
    showMobileCreateSheet: false,
    closeMergeDialog: vi.fn(),
    closeBulkLabelDialog: vi.fn(),
    closeRelatedEntityDialog: vi.fn(),
    closeVaultSwitcher: vi.fn(),
    closeShare: vi.fn(),
  },
}));

vi.mock("./ZenModeModal.svelte", async () => ({
  default: (await import("./__tests__/ModalStub.svelte")).default,
}));

vi.mock("$lib/components/dice/DiceModal.svelte", async () => ({
  default: (await import("./__tests__/ModalStub.svelte")).default,
}));

vi.mock("$lib/components/modals/GuestChatModal.svelte", async () => ({
  default: (await import("./__tests__/ModalStub.svelte")).default,
}));

vi.mock("$lib/components/canvas/CanvasSelectionModal.svelte", async () => ({
  default: (await import("./__tests__/CanvasSelectionModalStub.svelte"))
    .default,
}));

vi.mock("./MobileCreateEntitySheet.svelte", async () => ({
  default: (await import("./__tests__/MobileCreateEntitySheetStub.svelte"))
    .default,
}));

import GlobalModalProvider from "./GlobalModalProvider.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";

describe("GlobalModalProvider", () => {
  beforeEach(() => {
    modalUIStore.showCanvasSelector = false;
    modalUIStore.showMobileCreateSheet = false;
  });

  it("renders CanvasSelectionModal from the global provider when the modal state is open", async () => {
    modalUIStore.showCanvasSelector = true;

    render(GlobalModalProvider);

    expect(
      await screen.findByTestId("canvas-selection-modal-stub"),
    ).toBeTruthy();
  });

  it("does not render CanvasSelectionModal content when the modal state is closed", () => {
    render(GlobalModalProvider);

    expect(screen.queryByTestId("canvas-selection-modal-stub")).toBeNull();
  });

  it("renders MobileCreateEntitySheet when showMobileCreateSheet is true", async () => {
    modalUIStore.showMobileCreateSheet = true;

    render(GlobalModalProvider);

    expect(
      await screen.findByTestId("mobile-create-entity-sheet-stub"),
    ).toBeTruthy();
  });

  it("does not render MobileCreateEntitySheet when showMobileCreateSheet is false", () => {
    render(GlobalModalProvider);

    expect(screen.queryByTestId("mobile-create-entity-sheet-stub")).toBeNull();
  });
});
