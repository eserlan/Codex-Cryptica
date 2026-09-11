/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  useZenModeActions: vi.fn().mockReturnValue({
    handleClose: vi.fn((cb) => cb()),
    handlePopOut: vi.fn(),
    discardEdits: vi.fn(),
    isDirty: false,
    isSaving: false,
  }),
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

vi.mock(
  "$lib/components/entity-detail/DetailFactionTurnTab.svelte",
  async () => ({
    default: (await import("./__tests__/ModalStub.svelte")).default,
  }),
);

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
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { vault } from "$lib/stores/vault.svelte";

describe("ZenModeModal", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    modalUIStore.showZenMode = true;
    modalUIStore.zenModeEntityId = "entity-1";
    modalUIStore.zenModeActiveTab = "overview";
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

  it("shows and opens the Faction Turns tab for faction entities", async () => {
    vault.entities["entity-1"] = {
      ...vault.entities["entity-1"],
      type: "faction",
    };

    render(ZenModeModal);

    const turnsTab = screen.getByRole("tab", { name: "TURNS" });
    expect(turnsTab).toBeTruthy();

    await fireEvent.click(turnsTab);

    expect(turnsTab.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").id).toBe("panel-faction");
  });

  it("does not show the Faction Turns tab for non-faction entities", async () => {
    vault.entities["entity-1"] = {
      ...vault.entities["entity-1"],
      type: "location",
    };

    render(ZenModeModal);

    expect(screen.queryByRole("tab", { name: "TURNS" })).toBeNull();
  });
});
