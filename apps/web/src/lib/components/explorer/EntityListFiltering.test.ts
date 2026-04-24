/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uiStore } from "$lib/stores/ui.svelte";
import EntityList from "./EntityList.svelte";

vi.mock("svelte", async () => {
  // @ts-expect-error - force the client Svelte runtime so testing-library can mount
  return await import("../../../../../../node_modules/svelte/src/index-client.js");
});

vi.mock("$app/paths", () => ({
  base: "",
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    activeVaultId: "vault-1",
    allEntities: [
      {
        id: "e1",
        title: "City Guard",
        type: "npc",
        labels: ["NPC", "Guard"],
        status: "active",
        content: "",
      },
      {
        id: "e2",
        title: "Castle Guard",
        type: "npc",
        labels: ["Guard", "Castle"],
        status: "active",
        content: "",
      },
      {
        id: "e3",
        title: "Merchant",
        type: "npc",
        labels: ["NPC", "MerchantLabel"], // Avoid title collision
        status: "active",
        content: "",
      },
      {
        id: "e4",
        title: "King Arthur",
        type: "npc",
        aliases: ["Wart", "High King"],
        status: "active",
        content: "",
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

describe("EntityList Filtering", () => {
  beforeEach(() => {
    uiStore.explorerViewMode = "list";
    uiStore.clearLabelFilters();
  });

  it("filters entities when a label pill is clicked", async () => {
    render(EntityList);

    // Initial state: all 3 entities visible
    expect(screen.getByText("City Guard")).not.toBeNull();
    expect(screen.getByText("Castle Guard")).not.toBeNull();
    expect(screen.getByText("Merchant")).not.toBeNull();

    // Find and click "MerchantLabel" label pill
    const merchantPill = screen.getByText("MerchantLabel");
    await fireEvent.click(merchantPill);

    // Should only show Merchant
    expect(screen.queryByText("City Guard")).toBeNull();
    expect(screen.queryByText("Castle Guard")).toBeNull();
    expect(screen.getByText("Merchant")).not.toBeNull();
  });

  it("applies AND logic for multiple label filters", async () => {
    render(EntityList);

    // Click "Guard" pill
    const guardPill = screen.getAllByText("Guard")[0];
    await fireEvent.click(guardPill);

    // Shows both guards
    expect(screen.getByText("City Guard")).not.toBeNull();
    expect(screen.getByText("Castle Guard")).not.toBeNull();
    expect(screen.queryByText("Merchant")).toBeNull();

    // Ctrl+Click "NPC" pill
    const npcPill = screen.getAllByText("NPC")[0];
    await fireEvent.click(npcPill, { ctrlKey: true });

    // Should only show "City Guard" (has both Guard and NPC)
    expect(screen.getByText("City Guard")).not.toBeNull();
    expect(screen.queryByText("Castle Guard")).toBeNull();
    expect(screen.queryByText("Merchant")).toBeNull();
  });

  it("surfaces entities when searching for their labels", async () => {
    render(EntityList);

    const searchInput = screen.getByPlaceholderText("Search entities...");
    await fireEvent.input(searchInput, { target: { value: "MerchantLabel" } });

    // Should show "Merchant" because it has the "MerchantLabel" label
    // "Merchant" title doesn't contain "MerchantLabel"
    expect(screen.queryByText("City Guard")).toBeNull();
    expect(screen.queryByText("Castle Guard")).toBeNull();
    expect(screen.getByText("Merchant")).not.toBeNull();
  });

  it("surfaces entities when searching for their aliases", async () => {
    render(EntityList);

    const searchInput = screen.getByPlaceholderText("Search entities...");
    await fireEvent.input(searchInput, { target: { value: "Wart" } });

    // Should show "King Arthur" because it has the "Wart" alias
    expect(screen.queryByText("City Guard")).toBeNull();
    expect(screen.getByText("King Arthur")).not.toBeNull();
  });

  it("clears label filters when removal button is clicked", async () => {
    render(EntityList);

    // Apply filter
    await fireEvent.click(screen.getByText("MerchantLabel"));
    expect(screen.queryByText("City Guard")).toBeNull();

    // Find removal button (X) for the active filter pill
    const clearButton = screen.getByLabelText("Remove MerchantLabel filter");
    await fireEvent.click(clearButton);

    // All should be back
    expect(screen.getByText("City Guard")).not.toBeNull();
    expect(screen.getByText("Castle Guard")).not.toBeNull();
    expect(screen.getByText("Merchant")).not.toBeNull();
  });
});
