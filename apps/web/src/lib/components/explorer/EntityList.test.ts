/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EntityList from "./EntityList.svelte";
import { explorerUIStore } from "$lib/stores/ui/explorer-ui.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

vi.mock("$app/paths", () => ({
  base: "",
}));

// Setup standard mock vault data with hierarchy, using vi.hoisted to prevent hoisting order issues
const mockVault = vi.hoisted(() => {
  const vaultData = {
    activeVaultId: "vault-1",
    allEntities: [
      {
        id: "quest-only",
        title: "Broken Seal",
        type: "npc",
        tags: [],
        labels: ["Quest"],
        connections: [],
        content: "",
        updatedAt: 0,
      },
      {
        id: "npc-only",
        title: "Ava",
        type: "npc",
        tags: [],
        labels: ["NPC"],
        connections: [],
        content: "",
        updatedAt: 0,
      },
      {
        id: "both",
        title: "Mira",
        type: "npc",
        tags: [],
        labels: ["NPC", "Quest"],
        connections: [],
        content: "",
        updatedAt: 0,
      },
      {
        id: "parent-1",
        title: "Parent Entity",
        type: "location",
        tags: [],
        labels: [],
        connections: [],
        content: "",
        updatedAt: 0,
      },
      {
        id: "child-1",
        title: "Child Entity",
        type: "location",
        tags: [],
        labels: [],
        connections: [],
        content: "",
        updatedAt: 0,
        parent: "parent-1",
      },
      {
        id: "draft-1",
        title: "Pending Draft",
        type: "npc",
        tags: [],
        labels: [],
        connections: [],
        content: "",
        updatedAt: 0,
        status: "draft",
      },
    ] as any[],
    entities: {} as Record<string, any>,
    createEntity: vi.fn(),
    updateEntity: vi.fn(),
  };

  // Populate the entities lookup map
  for (const e of vaultData.allEntities) {
    vaultData.entities[e.id] = e;
  }

  return vaultData;
});

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: mockVault,
}));

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {
    list: [
      { id: "npc", label: "NPC", icon: "user", color: "#fff" },
      { id: "location", label: "Locations", icon: "map-pin", color: "#fff" },
    ],
    getCategory: (id: string) =>
      id === "location"
        ? { label: "Locations", icon: "map-pin" }
        : { label: "NPC", icon: "user" },
  },
}));

vi.mock("$lib/utils/icon", () => ({
  getIconClass: () => "",
}));

describe("EntityList", () => {
  beforeEach(() => {
    explorerUIStore.explorerViewMode = "list";
    explorerUIStore.clearLabelFilters();
    explorerUIStore.explorerCollapsedCategoryGroups = {};
    explorerUIStore.explorerCollapsedLabelGroups = {};
    explorerUIStore.explorerCollapsedEntityIds = {};
    window.localStorage.removeItem("codex_explorer_collapsed_category_groups");
    window.localStorage.removeItem("codex_explorer_collapsed_label_groups");
    window.localStorage.removeItem("codex_explorer_collapsed_entity_ids");
    sessionModeStore.isGuestMode = false;
    mockVault.createEntity.mockReset();
    mockVault.updateEntity.mockReset();
  });

  it("shows and hides entities within a label group", async () => {
    explorerUIStore.setExplorerViewMode("label");

    render(EntityList);

    expect(screen.getByText("Broken Seal")).not.toBeNull();

    const questToggle = screen
      .getAllByRole("button")
      .find(
        (button) =>
          button.getAttribute("aria-expanded") === "true" &&
          button.textContent?.includes("Quest"),
      );

    expect(questToggle).not.toBeUndefined();

    await fireEvent.click(questToggle!);

    expect(screen.queryByText("Broken Seal")).toBeNull();
    expect(
      explorerUIStore.getCollapsedLabelGroups("vault-1").has("Quest"),
    ).toBe(true);

    const collapsedQuestToggle = screen
      .getAllByRole("button")
      .find(
        (button) =>
          button.getAttribute("aria-expanded") === "false" &&
          button.textContent?.includes("Quest"),
      );

    expect(collapsedQuestToggle).not.toBeUndefined();

    await fireEvent.click(collapsedQuestToggle!);

    expect(screen.getByText("Broken Seal")).not.toBeNull();
    expect(
      explorerUIStore.getCollapsedLabelGroups("vault-1").has("Quest"),
    ).toBe(false);
  });

  it("shows and hides entities within a category group", async () => {
    explorerUIStore.setExplorerViewMode("category");

    render(EntityList);

    expect(screen.getByText("Ava")).not.toBeNull();
    expect(screen.getByText("Parent Entity")).not.toBeNull();

    const locationToggle = screen
      .getAllByRole("button")
      .find(
        (button) =>
          button.getAttribute("aria-expanded") === "true" &&
          button.textContent?.includes("Locations") &&
          button.textContent?.includes("2"),
      );

    expect(locationToggle).not.toBeUndefined();

    await fireEvent.click(locationToggle!);

    expect(screen.queryByText("Parent Entity")).toBeNull();
    expect(screen.queryByText("Child Entity")).toBeNull();
    expect(screen.getByText("Ava")).not.toBeNull();
    expect(
      explorerUIStore.getCollapsedCategoryGroups("vault-1").has("location"),
    ).toBe(true);
  });

  it("renders category grouping as a plain list when one category filter is active", async () => {
    explorerUIStore.setExplorerViewMode("category");

    render(EntityList);

    const npcFilterButton = screen.getByLabelText("Filter by NPC");
    await fireEvent.click(npcFilterButton);
    await tick();

    expect(
      (screen.getByLabelText("Group by Category") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      screen.getByLabelText("List View").getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByLabelText("Group by Category").getAttribute("aria-pressed"),
    ).toBe("false");
    expect(screen.queryByRole("button", { expanded: true })).toBeNull();
    expect(screen.getByText("Ava")).not.toBeNull();
    expect(screen.queryByText("Parent Entity")).toBeNull();
  });

  it("clears the search query when the clear button is clicked", async () => {
    render(EntityList);

    const input = screen.getByLabelText("Search entities") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "Mira" } });
    expect(input.value).toBe("Mira");

    const clearButton = screen.getByLabelText("Clear search");
    await fireEvent.click(clearButton);

    expect(input.value).toBe("");
  });

  it("automatically applies the label in the graph filter when an autocomplete option is selected", async () => {
    explorerUIStore.clearLabelFilters();
    expect(explorerUIStore.labelFilters.has("Quest")).toBe(false);

    render(EntityList);

    const input = screen.getByLabelText("Search entities") as HTMLInputElement;
    await fireEvent.focus(input);
    await fireEvent.input(input, { target: { value: "#Qu" } });

    // Flush Svelte's pending state updates and render the autocomplete dropdown.
    await tick();

    // Find the autocomplete option for "Quest" (which displays as "#Quest")
    const buttons = screen.getAllByRole("button");
    const questOption = buttons.find(
      (b) => b.textContent?.replace(/\s+/g, "") === "#Quest",
    );
    expect(questOption).not.toBeUndefined();

    await fireEvent.click(questOption!);

    // Flush Svelte's pending reactive updates.
    await tick();

    // Verify label is auto-applied to active filters
    expect(explorerUIStore.labelFilters.has("Quest")).toBe(true);
  });

  it("should render hierarchical nesting of entities", async () => {
    render(EntityList);

    // Both parent and child should be rendered initially
    expect(screen.getByText("Parent Entity")).not.toBeNull();
    expect(screen.getByText("Child Entity")).not.toBeNull();

    // Find collapse button for "Parent Entity"
    const collapseButton = screen.getByTitle("Collapse");
    expect(collapseButton).not.toBeNull();

    // Click to collapse
    await fireEvent.click(collapseButton);
    await tick();

    // Child should be hidden now
    expect(screen.queryByText("Child Entity")).toBeNull();

    // Click again to expand
    const expandButton = screen.getByTitle("Expand");
    await fireEvent.click(expandButton);
    await tick();

    // Child should be visible again
    expect(screen.getByText("Child Entity")).not.toBeNull();
  });

  it("should force expand and show ancestor path (dimmed) when a child matches search query", async () => {
    render(EntityList);

    // Pre-collapse parent so that child is hidden
    explorerUIStore.toggleExplorerEntityCollapse("vault-1", "parent-1");
    await tick();
    expect(screen.queryByText("Child Entity")).toBeNull();

    // Search for "Child"
    const input = screen.getByLabelText("Search entities") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "Child" } });
    await tick();

    // Both should be visible now because child matches query and forced expand is active
    expect(screen.getByText("Child Entity")).not.toBeNull();
    const parentContainer = screen
      .getByText("Parent Entity")
      .closest("[data-testid='entity-list-item']");
    expect(parentContainer).not.toBeNull();
    // Non-matching ancestor should have opacity-50 (dimmed) class applied
    expect(parentContainer?.className).toContain("opacity-50");
  });

  it("should support inline creation of a child entity when not in guest mode", async () => {
    mockVault.createEntity.mockResolvedValue("new-child-id");
    render(EntityList);

    // Find "+" button for parent entity
    const addButton = screen.getByLabelText(
      "Add child entity to Parent Entity",
    );
    expect(addButton).not.toBeNull();

    // Click "+" button to open form
    await fireEvent.click(addButton);
    await tick();

    // Fill in new child name
    const nameInput = screen.getByLabelText(
      "New entity name",
    ) as HTMLInputElement;
    await fireEvent.input(nameInput, { target: { value: "Baby Entity" } });

    // Submit form by clicking check button
    const submitBtn = screen.getByLabelText("Create child entity");
    await fireEvent.click(submitBtn);
    await tick();

    // Verify vault.createEntity was called
    expect(mockVault.createEntity).toHaveBeenCalledWith("npc", "Baby Entity", {
      parent: "parent-1",
    });
  });

  it("should hide child creation and drag-and-drop options when in guest mode", async () => {
    sessionModeStore.isGuestMode = true;
    render(EntityList);

    // "+" button should not be present
    expect(
      screen.queryByLabelText("Add child entity to Parent Entity"),
    ).toBeNull();

    // Drag-and-drop draggable should be false or not active
    const parentRow = screen
      .getByText("Parent Entity")
      .closest("[data-testid='entity-list-item']");
    expect(parentRow?.getAttribute("draggable")).toBe("false");
  });

  it("toggles multiple category filters sequentially to show OR filtered entities", async () => {
    render(EntityList);

    const npcButton = screen.getByLabelText("Filter by NPC");
    const locationsButton = screen.getByLabelText("Filter by Locations");

    // Initially, both npc and location entities are visible
    expect(screen.queryByText("Ava")).not.toBeNull();
    expect(screen.queryByText("Parent Entity")).not.toBeNull();

    // Click NPC button -> filters to only NPC
    await fireEvent.click(npcButton);
    await tick();
    expect(screen.queryByText("Ava")).not.toBeNull();
    expect(screen.queryByText("Parent Entity")).toBeNull();

    // Click Locations button -> toggles Locations ON as well (OR filtering: NPC or Location)
    await fireEvent.click(locationsButton);
    await tick();
    expect(screen.queryByText("Ava")).not.toBeNull();
    expect(screen.queryByText("Parent Entity")).not.toBeNull();

    // Click NPC button again -> toggles NPC OFF (only Locations remains)
    await fireEvent.click(npcButton);
    await tick();
    expect(screen.queryByText("Ava")).toBeNull();
    expect(screen.queryByText("Parent Entity")).not.toBeNull();
  });

  it("hides draft entities in the default list view", () => {
    render(EntityList);

    expect(screen.queryByText("Pending Draft")).toBeNull();
  });

  it("shows draft entities in review mode and wires approve and reject actions", async () => {
    const onApproveDraft = vi.fn();
    const onRejectDraft = vi.fn();

    render(EntityList, {
      showDraftsOnly: true,
      onApproveDraft,
      onRejectDraft,
    });

    expect(screen.getByText("Pending Draft")).not.toBeNull();
    expect(screen.queryByText("Ava")).toBeNull();

    await fireEvent.click(screen.getByLabelText("Approve Pending Draft"));
    expect(onApproveDraft).toHaveBeenCalledWith(
      expect.objectContaining({ id: "draft-1" }),
    );

    await fireEvent.click(screen.getByLabelText("Reject Pending Draft"));
    expect(onRejectDraft).toHaveBeenCalledWith(
      expect.objectContaining({ id: "draft-1" }),
    );
  });
});
