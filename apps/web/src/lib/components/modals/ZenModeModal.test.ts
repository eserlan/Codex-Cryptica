/** @vitest-environment jsdom */

import { render, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$app/state", () => ({
  page: {
    url: {
      pathname: "/vault/guest/entity/entity-1",
    },
  },
}));

vi.mock("$lib/services/ClipboardService", () => ({
  clipboardService: {
    copyEntity: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("$lib/hooks/useEditState.svelte", () => ({
  createEditState: vi.fn(() => ({
    isEditing: false,
    cancel: vi.fn(),
    start: vi.fn(),
  })),
}));

vi.mock("$lib/hooks/useZenModeActions.svelte", () => ({
  createZenModeActions: vi.fn(() => ({
    isSaving: false,
    saveChanges: vi.fn(),
    handleDelete: vi.fn(),
    handleClose: vi.fn(),
  })),
}));

vi.mock("../zen/ZenImageLightbox.svelte", async () => ({
  default: (await import("./__tests__/ModalStub.svelte")).default,
}));

vi.mock("../zen/ZenHeader.svelte", async () => ({
  default: (await import("./__tests__/ModalStub.svelte")).default,
}));

vi.mock("../zen/ZenSidebar.svelte", async () => ({
  default: (await import("./__tests__/ModalStub.svelte")).default,
}));

vi.mock("../zen/ZenContent.svelte", async () => ({
  default: (await import("./__tests__/ModalStub.svelte")).default,
}));

vi.mock("$lib/components/entity-detail/DetailMapTab.svelte", async () => ({
  default: (await import("./__tests__/ModalStub.svelte")).default,
}));

vi.mock("$lib/stores/ui.svelte", () => ({
  uiStore: {
    showZenMode: true,
    zenModeEntityId: "entity-1",
    zenModeActiveTab: "overview",
    openZenMode: vi.fn(),
    closeZenMode: vi.fn(),
    confirm: vi.fn(),
  },
}));

vi.mock("$lib/stores/vault.svelte", () => {
  const entities: Record<string, any> = {
    "entity-1": {
      id: "entity-1",
      title: "Faerun",
      content: "A realm of ancient forests and buried empires.",
      _path: ["faerun.md"],
    },
  };

  return {
    vault: {
      activeVaultId: null,
      isGuest: true,
      entities,
      loadEntityContent: vi.fn(async (id: string) => {
        entities[id] = {
          ...entities[id],
          content: "Hydrated content from host",
        };
      }),
      resolveImageUrl: vi.fn().mockResolvedValue(""),
    },
  };
});

vi.mock("$lib/utils/zen-popout", async () => {
  const actual = await import("../../utils/zen-popout");
  return {
    ...actual,
    openEntityPopout: vi.fn(),
  };
});

import ZenModeModal from "./ZenModeModal.svelte";

describe("ZenModeModal", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("persists the guest entity snapshot after zen mode opens", async () => {
    render(ZenModeModal);

    await waitFor(() => {
      expect(
        JSON.parse(
          window.sessionStorage.getItem("codex.zen-popout.guest.entity-1") ??
            "null",
        ),
      ).toEqual(
        expect.objectContaining({
          isGuest: true,
          entity: expect.objectContaining({
            id: "entity-1",
            content: "A realm of ancient forests and buried empires.",
          }),
        }),
      );
    });
  });
});
