/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";

const { dismissedIds } = vi.hoisted(() => ({
  dismissedIds: new Set<string>(),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { entities: {} as Record<string, any> },
}));

vi.mock("$lib/stores/ui/guided-mode.svelte", () => ({
  guidedModeStore: {
    isRecommendationDismissed: (id: string) => dismissedIds.has(id),
    dismissRecommendation: vi.fn((id: string) => dismissedIds.add(id)),
  },
}));

vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({
  modalUIStore: {
    openIntentGeneratorWorkflow: vi.fn(),
    openGeneratorWorkflowForEntity: vi.fn(),
  },
}));

import StructuralSuggestionBanner from "./StructuralSuggestionBanner.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { modalUIStore } from "$lib/stores/ui/modal-ui.svelte";
import { guidedModeStore } from "$lib/stores/ui/guided-mode.svelte";

describe("StructuralSuggestionBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dismissedIds.clear();
    (vault as any).entities = {};
  });

  it("shows a recommendation for a leaderless faction", () => {
    (vault as any).entities = {
      f1: {
        id: "f1",
        type: "faction",
        title: "Iron Syndicate",
        connections: [],
      },
    };

    render(StructuralSuggestionBanner, { entityId: "f1" });
    expect(screen.getByTestId("structural-suggestion-banner")).toBeTruthy();
    expect(screen.getByText("Who leads Iron Syndicate?")).toBeTruthy();
  });

  it("shows nothing when the entity's structural links are already satisfied", () => {
    (vault as any).entities = {
      f1: {
        id: "f1",
        type: "faction",
        title: "Iron Syndicate",
        connections: [{ target: "c1", type: "leads" }],
      },
      c1: { id: "c1", type: "character", title: "Mira", connections: [] },
    };

    render(StructuralSuggestionBanner, { entityId: "f1" });
    expect(screen.queryByTestId("structural-suggestion-banner")).toBeNull();
  });

  it("opens the intent-first create workflow pre-filled with the parent entity when the action is clicked", async () => {
    (vault as any).entities = {
      f1: {
        id: "f1",
        type: "faction",
        title: "Iron Syndicate",
        connections: [],
      },
    };

    render(StructuralSuggestionBanner, { entityId: "f1" });
    await fireEvent.click(screen.getByTestId("structural-suggestion-action"));

    expect(modalUIStore.openIntentGeneratorWorkflow).toHaveBeenCalledWith(
      "npc",
      "f1",
    );
  });

  it("dismisses the recommendation and hides the banner", async () => {
    (vault as any).entities = {
      f1: {
        id: "f1",
        type: "faction",
        title: "Iron Syndicate",
        connections: [],
      },
    };

    render(StructuralSuggestionBanner, { entityId: "f1" });
    await fireEvent.click(screen.getByTestId("structural-suggestion-dismiss"));

    expect(guidedModeStore.dismissRecommendation).toHaveBeenCalledWith(
      "f1:leader",
    );
  });
});
