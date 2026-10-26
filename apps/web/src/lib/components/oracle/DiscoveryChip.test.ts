/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockVault, mockOracle, mockFocusEntity } = vi.hoisted(() => ({
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
    reviseDiscoveryProposal: vi.fn(),
    reviseNewEntityDraft: vi
      .fn()
      .mockResolvedValue({ content: "new content", lore: "new lore" }),
    proposeConnectionsForEntity: vi.fn().mockResolvedValue(0),
    handleDiscoveryConnectionsForEntity: vi.fn().mockResolvedValue(0),
  },
  mockFocusEntity: vi.fn(),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: mockVault,
}));

vi.mock("$lib/stores/oracle.svelte", () => ({
  oracle: mockOracle,
}));

vi.mock("$lib/components/search/search-focus", () => ({
  DEFAULT_SEARCH_ENTITY_ZOOM: 2,
  dispatchSearchEntityFocus: mockFocusEntity,
}));

import DiscoveryChip from "./DiscoveryChip.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";

describe("DiscoveryChip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVault.isGuest = false;
    sessionModeStore.isDemoMode = false;
    discoveryPolicyStore.connectionDiscoveryMode = "suggest";
    notificationStore.notify = vi.fn();
    mockVault.selectedEntityId = null;
  });

  it("shows a spinner while committing a Gemini-backed update", async () => {
    let resolvePromise!: (value: { content: string; lore: string }) => void;
    mockOracle.reviseDiscoveryProposal.mockReturnValue(
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
      expect(
        mockOracle.handleDiscoveryConnectionsForEntity,
      ).toHaveBeenCalledWith("new-id");
      expect(notificationStore.notify).toHaveBeenCalledWith(
        "Created Target; connection suggestions queued",
        "success",
      );
    });
  });

  it("seeds connection proposals after updating an existing entity", async () => {
    mockOracle.reviseDiscoveryProposal.mockResolvedValue({
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
      expect(
        mockOracle.handleDiscoveryConnectionsForEntity,
      ).toHaveBeenCalledWith("target");
      expect(notificationStore.notify).toHaveBeenCalledWith(
        "Updated Target; connection suggestions queued",
        "success",
      );
    });
  });

  it("overrides the initial type guess with the AI-refined categoryId when provided", async () => {
    mockOracle.reviseNewEntityDraft.mockResolvedValue({
      content: "refined content",
      lore: "refined lore",
      categoryId: "location", // Refined from 'npc'
    });

    render(DiscoveryChip, {
      proposal: {
        title: "The Iron Keep",
        type: "npc", // Initial guess
        draft: {
          chronicle: "a scary place",
          lore: "full of knights",
        },
        confidence: 0.8,
      },
    });

    await fireEvent.click(screen.getByLabelText("Create The Iron Keep"));

    await waitFor(() => {
      expect(mockVault.createEntity).toHaveBeenCalledWith(
        "location",
        "The Iron Keep",
        {
          content: "refined content",
          lore: "refined lore",
        },
      );
    });
  });
});
