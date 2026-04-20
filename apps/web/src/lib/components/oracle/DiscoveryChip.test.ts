/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

const { mockVault, mockOracle, mockUiStore, mockFocusEntity } = vi.hoisted(
  () => ({
    mockVault: {
      isGuest: false,
      entities: {
        target: {
          id: "target",
          title: "Target",
          content: "old chronicle",
          lore: "old lore",
        },
      },
      selectedEntityId: null as string | null,
      updateEntity: vi.fn().mockResolvedValue(undefined),
      createEntity: vi.fn().mockResolvedValue("new-id"),
    },
    mockOracle: {
      reconcileDiscoveryProposal: vi.fn(),
      proposeConnectionsForEntity: vi.fn().mockResolvedValue(0),
    },
    mockUiStore: {
      isDemoMode: false,
      notify: vi.fn(),
    },
    mockFocusEntity: vi.fn(),
  }),
);

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: mockVault,
}));

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: mockOracle,
}));

vi.mock("$stores/ui.svelte", () => ({
  uiStore: mockUiStore,
}));

vi.mock("$lib/components/search/search-focus", () => ({
  DEFAULT_SEARCH_ENTITY_ZOOM: 2,
  dispatchSearchEntityFocus: mockFocusEntity,
}));

import DiscoveryChip from "./DiscoveryChip.svelte";

describe("DiscoveryChip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVault.isGuest = false;
    mockUiStore.isDemoMode = false;
    mockVault.selectedEntityId = null;
  });

  it("shows a spinner while committing a Gemini-backed update", async () => {
    let resolvePromise!: (value: { content: string; lore: string }) => void;
    mockOracle.reconcileDiscoveryProposal.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    const proposal = {
      entityId: "target",
      title: "Target",
      type: "npc",
      draft: {
        chronicle: "new chronicle",
        lore: "new lore",
      },
      confidence: 0.95,
    } as const;

    const { container } = render(DiscoveryChip, { proposal });
    const updateButton = screen.getByLabelText("Update Target");

    await fireEvent.click(updateButton);

    expect(updateButton.getAttribute("aria-busy")).toBe("true");
    expect(
      container.querySelector(".icon-\\[lucide--loader-2\\]"),
    ).toBeTruthy();

    resolvePromise({ content: "updated chronicle", lore: "updated lore" });
  });

  it("seeds connection proposals after creating a new entity", async () => {
    render(DiscoveryChip, {
      proposal: {
        title: "Target",
        type: "npc",
        draft: {
          chronicle: "new chronicle",
          lore: "new lore",
        },
        confidence: 0.95,
      },
    });

    await fireEvent.click(screen.getByLabelText("Create Target"));

    await waitFor(() => {
      expect(mockVault.createEntity).toHaveBeenCalled();
      expect(mockOracle.proposeConnectionsForEntity).toHaveBeenCalledWith(
        "new-id",
      );
      expect(mockUiStore.notify).toHaveBeenCalledWith(
        "Created Target",
        "success",
      );
    });
  });

  it("seeds connection proposals after updating an existing entity", async () => {
    mockOracle.reconcileDiscoveryProposal.mockResolvedValue({
      content: "updated chronicle",
      lore: "updated lore",
    });

    render(DiscoveryChip, {
      proposal: {
        entityId: "target",
        title: "Target",
        type: "npc",
        draft: {
          chronicle: "new chronicle",
          lore: "new lore",
        },
        confidence: 0.95,
      },
    });

    await fireEvent.click(screen.getByLabelText("Update Target"));

    await waitFor(() => {
      expect(mockVault.updateEntity).toHaveBeenCalledWith("target", {
        content: "updated chronicle",
        lore: "updated lore",
      });
      expect(mockOracle.proposeConnectionsForEntity).toHaveBeenCalledWith(
        "target",
      );
      expect(mockUiStore.notify).toHaveBeenCalledWith(
        "Updated Target",
        "success",
      );
    });
  });
});
