/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureProvisionalFacts from "./AdventureProvisionalFacts.svelte";
import { AdventurePromotionSettings } from "#lib/stores/ui/adventure-promotion-settings.svelte.js";
import { UIPersistence } from "#lib/stores/ui/persistence.js";

const fact = {
  id: "barrow",
  kind: "place" as const,
  name: "Sunken Barrow",
  summary: "A barrow drowned by the marsh.",
  introducedOnTurnId: "turn-1",
  visibility: "player-visible" as const,
};

const fact2 = {
  id: "npc-elric",
  kind: "person" as const,
  name: "Elric the Wandering Hermit",
  summary: "A lone survivor in the wetlands.",
  introducedOnTurnId: "turn-2",
  visibility: "player-visible" as const,
};

function makeMockStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: vi.fn((key: string) => (key in store ? store[key] : null)),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  };
}

describe("AdventureProvisionalFacts", () => {
  async function showDiscoveries(): Promise<void> {
    await fireEvent.click(
      screen.getByRole("button", {
        name: /review \d+ adventure discover(?:y|ies)/i,
      }),
    );
  }

  it("shows a typed player-visible suggestion and adds it on request", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(AdventureProvisionalFacts, {
      props: { facts: [fact], existingTitles: [], onAdd },
    });

    expect(screen.queryByText("Sunken Barrow")).toBeNull();
    await showDiscoveries();
    expect(screen.getByText("Place")).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Add Sunken Barrow to Codex" }),
    );

    expect(onAdd).toHaveBeenCalledWith(fact);
    expect(screen.queryByText("Sunken Barrow")).toBeNull();
  });

  it("hides GM-only facts and discards a visible suggestion", async () => {
    render(AdventureProvisionalFacts, {
      props: {
        facts: [
          fact,
          {
            ...fact,
            id: "secret",
            name: "Hidden Crown",
            visibility: "gm-only",
          },
        ],
        existingTitles: [],
        onAdd: vi.fn(),
      },
    });

    expect(screen.queryByText("Hidden Crown")).toBeNull();
    await showDiscoveries();
    await fireEvent.click(
      screen.getByRole("button", { name: "Discard Sunken Barrow suggestion" }),
    );
    expect(screen.queryByText("Sunken Barrow")).toBeNull();
  });

  it("can hide discoveries after opening the section", async () => {
    render(AdventureProvisionalFacts, {
      props: { facts: [fact], existingTitles: [], onAdd: vi.fn() },
    });

    await showDiscoveries();
    expect(screen.getByText("Sunken Barrow")).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Close discoveries" }),
    );

    expect(screen.queryByText("Sunken Barrow")).toBeNull();
  });

  it("does not show a suggestion that already exists in Codex", () => {
    render(AdventureProvisionalFacts, {
      props: {
        facts: [fact],
        existingTitles: ["sunken barrow"],
        onAdd: vi.fn(),
      },
    });

    expect(screen.queryByText("Sunken Barrow")).toBeNull();
  });

  it("supports batch promotion of all discoveries via onAddAll", async () => {
    const onAddAll = vi.fn().mockResolvedValue(undefined);
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(AdventureProvisionalFacts, {
      props: {
        facts: [fact, fact2],
        existingTitles: [],
        onAdd,
        onAddAll,
      },
    });

    await showDiscoveries();
    const batchButton = screen.getByRole("button", {
      name: "Add all discoveries to Codex",
    });
    expect(batchButton).toBeTruthy();
    await fireEvent.click(batchButton);

    expect(onAddAll).toHaveBeenCalledWith([fact, fact2]);
    expect(screen.queryByText("Sunken Barrow")).toBeNull();
    expect(screen.queryByText("Elric the Wandering Hermit")).toBeNull();
  });

  it("supports batch promotion fallback to sequential onAdd when onAddAll is omitted", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(AdventureProvisionalFacts, {
      props: {
        facts: [fact, fact2],
        existingTitles: [],
        onAdd,
      },
    });

    await showDiscoveries();
    const batchButton = screen.getByRole("button", {
      name: "Add all discoveries to Codex",
    });
    await fireEvent.click(batchButton);

    expect(onAdd).toHaveBeenCalledTimes(2);
    expect(onAdd).toHaveBeenCalledWith(fact);
    expect(onAdd).toHaveBeenCalledWith(fact2);
    expect(screen.queryByText("Sunken Barrow")).toBeNull();
    expect(screen.queryByText("Elric the Wandering Hermit")).toBeNull();
  });

  it("toggles the auto-promote setting checkbox", async () => {
    const storage = makeMockStorage();
    const settings = new AdventurePromotionSettings(
      new UIPersistence({ storage }),
    );
    render(AdventureProvisionalFacts, {
      props: {
        facts: [fact],
        existingTitles: [],
        onAdd: vi.fn(),
        settings,
      },
    });

    await showDiscoveries();
    await fireEvent.click(
      screen.getByRole("button", { name: "Review preferences" }),
    );
    const checkbox = screen.getByRole("checkbox", {
      name: /auto-promote discoveries to codex/i,
    });
    expect((checkbox as HTMLInputElement).checked).toBe(false);

    await fireEvent.click(checkbox);
    expect(settings.autoPromote).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      "codex_adventure_auto_promote",
      "true",
    );
  });

  it("searches and filters discoveries without squeezing the summary", async () => {
    render(AdventureProvisionalFacts, {
      props: { facts: [fact, fact2], existingTitles: [], onAdd: vi.fn() },
    });

    await showDiscoveries();
    const searchInput = screen.getByRole("searchbox", {
      name: "Search discoveries",
    });
    await fireEvent.input(searchInput, { target: { value: "hermit" } });
    expect(screen.queryByText("Sunken Barrow")).toBeNull();
    expect(screen.getByText("Elric the Wandering Hermit")).toBeTruthy();

    await fireEvent.input(searchInput, { target: { value: "" } });
    await fireEvent.click(screen.getByRole("button", { name: "People" }));
    expect(screen.queryByText("Sunken Barrow")).toBeNull();
    expect(screen.getByText("Elric the Wandering Hermit")).toBeTruthy();
  });

  it("supports selective batch review and dismissing selected suggestions", async () => {
    const onAddAll = vi.fn().mockResolvedValue(undefined);
    render(AdventureProvisionalFacts, {
      props: {
        facts: [fact, fact2],
        existingTitles: [],
        onAdd: vi.fn(),
        onAddAll,
      },
    });

    await showDiscoveries();
    await fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Sunken Barrow" }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Add selected (1)" }),
    );
    expect(onAddAll).toHaveBeenCalledWith([fact]);
    expect(screen.queryByText("Sunken Barrow")).toBeNull();

    await fireEvent.click(
      screen.getByRole("checkbox", {
        name: "Select Elric the Wandering Hermit",
      }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Dismiss selected" }),
    );
    expect(screen.queryByText("Elric the Wandering Hermit")).toBeNull();
  });

  it("filters GM-only discoveries out of bulk selection", async () => {
    const onAddAll = vi.fn().mockResolvedValue(undefined);
    render(AdventureProvisionalFacts, {
      props: {
        facts: [fact, { ...fact2, visibility: "gm-only" as const }],
        existingTitles: [],
        onAdd: vi.fn(),
        onAddAll,
      },
    });

    await showDiscoveries();
    expect(screen.queryByText("Elric the Wandering Hermit")).toBeNull();
    await fireEvent.click(
      screen.getByRole("checkbox", { name: "Select all filtered discoveries" }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Add selected (1)" }),
    );
    expect(onAddAll).toHaveBeenCalledWith([fact]);
  });

  it("shows a recoverable error if saving a discovery fails", async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error("Storage unavailable"));
    render(AdventureProvisionalFacts, {
      props: { facts: [fact], existingTitles: [], onAdd },
    });

    await showDiscoveries();
    await fireEvent.click(
      screen.getByRole("button", { name: "Add Sunken Barrow to Codex" }),
    );
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "Storage unavailable",
    );
    expect(screen.getByText("Sunken Barrow")).toBeTruthy();
  });

  it("keeps auto-promote opt-in behind review preferences", async () => {
    const settings = new AdventurePromotionSettings(
      new UIPersistence({ storage: makeMockStorage() }),
    );
    render(AdventureProvisionalFacts, {
      props: { facts: [fact], existingTitles: [], onAdd: vi.fn(), settings },
    });

    await showDiscoveries();
    expect(
      screen.queryByRole("checkbox", { name: /auto-promote/i }),
    ).toBeNull();
    await fireEvent.click(
      screen.getByRole("button", { name: "Review preferences" }),
    );
    expect(
      screen.getByRole("checkbox", { name: /auto-promote/i }),
    ).toBeTruthy();
  });

  it("shows the scenario badge when a fact is linked to a scenario", async () => {
    render(AdventureProvisionalFacts, {
      props: {
        facts: [{ ...fact, scenarioId: "scen-1" }],
        existingTitles: [],
        onAdd: vi.fn(),
      },
    });

    await showDiscoveries();
    expect(screen.getByText("Scenario")).toBeTruthy();
  });

  it("remembers a dismissed discovery after remounting the panel from saved session state", async () => {
    const dismissedIds: string[] = [];
    const onDismiss = vi.fn(async (ids: string[]) => {
      dismissedIds.push(...ids);
    });
    const { unmount } = render(AdventureProvisionalFacts, {
      props: {
        facts: [fact, fact2],
        existingTitles: [],
        dismissedIds: [],
        onDismiss,
        onAdd: vi.fn(),
      },
    });
    await showDiscoveries();
    await fireEvent.click(
      screen.getByRole("button", { name: "Discard Sunken Barrow suggestion" }),
    );
    expect(onDismiss).toHaveBeenCalledWith(["barrow"]);
    expect(screen.queryByText("Sunken Barrow")).toBeNull();
    unmount();

    render(AdventureProvisionalFacts, {
      props: {
        facts: [fact, fact2],
        existingTitles: [],
        dismissedIds,
        onDismiss,
        onAdd: vi.fn(),
      },
    });
    expect(
      screen.getByRole("button", { name: "Review 1 adventure discovery" }),
    ).toBeTruthy();
    await showDiscoveries();
    expect(screen.queryByText("Sunken Barrow")).toBeNull();
    expect(screen.getByText("Elric the Wandering Hermit")).toBeTruthy();
  });

  it("persists bulk dismissal as one operation and removes only selected facts", async () => {
    const onDismiss = vi.fn().mockResolvedValue(undefined);
    render(AdventureProvisionalFacts, {
      props: {
        facts: [fact, fact2],
        existingTitles: [],
        dismissedIds: [],
        onDismiss,
        onAdd: vi.fn(),
      },
    });
    await showDiscoveries();
    await fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Sunken Barrow" }),
    );
    await fireEvent.click(
      screen.getByRole("button", { name: "Dismiss selected" }),
    );
    expect(onDismiss).toHaveBeenCalledWith(["barrow"]);
    expect(screen.queryByText("Sunken Barrow")).toBeNull();
    expect(screen.getByText("Elric the Wandering Hermit")).toBeTruthy();
  });

  it("does not hide a discovery if its dismissal cannot be saved", async () => {
    render(AdventureProvisionalFacts, {
      props: {
        facts: [fact],
        existingTitles: [],
        dismissedIds: [],
        onDismiss: vi.fn().mockRejectedValue(new Error("internal secret")),
        onAdd: vi.fn(),
      },
    });
    await showDiscoveries();
    await fireEvent.click(
      screen.getByRole("button", { name: "Discard Sunken Barrow suggestion" }),
    );
    expect(screen.getByText("Sunken Barrow")).toBeTruthy();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Could not save dismissed discoveries");
    expect(alert.textContent).not.toContain("internal secret");
  });

  it("disables dismissing while the session is read-only or generating", async () => {
    render(AdventureProvisionalFacts, {
      props: {
        facts: [fact],
        existingTitles: [],
        dismissedIds: [],
        onDismiss: vi.fn(),
        onAdd: vi.fn(),
        canDismiss: false,
      },
    });
    await showDiscoveries();
    const button = screen.getByRole("button", {
      name: "Discard Sunken Barrow suggestion",
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
