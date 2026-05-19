/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EntityList from "./EntityList.svelte";
import { explorerUIStore } from "$lib/stores/ui/explorer-ui.svelte";

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
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
    ],
  },
}));

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {
    list: [{ id: "npc", label: "NPC", icon: "user", color: "#fff" }],
    getCategory: () => ({ icon: "user" }),
  },
}));

vi.mock("$lib/utils/icon", () => ({
  getIconClass: () => "",
}));

describe("EntityList", () => {
  beforeEach(() => {
    explorerUIStore.explorerViewMode = "list";
    explorerUIStore.explorerCollapsedLabelGroups = {};
    window.localStorage.removeItem("codex_explorer_collapsed_label_groups");
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

  it("clears the search query when the clear button is clicked", async () => {
    render(EntityList);

    const input = screen.getByLabelText("Search entities") as HTMLInputElement;
    await fireEvent.input(input, { target: { value: "Mira" } });
    expect(input.value).toBe("Mira");

    const clearButton = screen.getByLabelText("Clear search");
    await fireEvent.click(clearButton);

    expect(input.value).toBe("");
  });
});
