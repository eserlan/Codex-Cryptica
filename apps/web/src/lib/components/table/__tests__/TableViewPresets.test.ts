/** @vitest-environment jsdom */

import { render, fireEvent, screen } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";
import TableViewPresets from "../TableViewPresets.svelte";
import { ViewPresetsStore } from "$lib/stores/view-presets.svelte";
import type { ViewPreset } from "$lib/stores/view-presets";

describe("TableViewPresets component", () => {
  let store: ViewPresetsStore;
  const mockDb = {
    get: vi.fn(),
    put: vi.fn().mockResolvedValue(undefined),
  };

  const initialPresets: ViewPreset[] = [
    {
      id: "p1",
      name: "Villains",
      createdAt: 1000,
      updatedAt: 1000,
      state: {
        activeLabels: ["villain"],
        labelFilterMode: "AND",
        activeCategories: ["npc"],
        searchQuery: "morgath",
        showIncompleteOnly: true,
      },
    },
  ];

  beforeEach(() => {
    store = new ViewPresetsStore({
      getDb: vi.fn().mockResolvedValue(mockDb) as any,
    });
    store.presets = [...initialPresets];
  });

  it("renders trigger and opens panel on click", async () => {
    render(TableViewPresets, {
      activeVaultId: "vault-1",
      currentFilterState: {
        searchQuery: "",
        typeFilters: new Set<string>(),
        labelFilters: new Set<string>(),
        showIncompleteOnly: false,
        columnFilters: {},
      },
      onApplyPreset: vi.fn(),
      onResetFilters: vi.fn(),
      presetsStore: store,
    });

    const toggle = screen.getByTestId("table-view-presets-toggle");
    expect(toggle).toBeTruthy();
    expect(screen.queryByTestId("table-view-presets-panel")).toBeNull();

    await fireEvent.click(toggle);
    expect(screen.getByTestId("table-view-presets-panel")).toBeTruthy();
    expect(screen.getByText("Villains")).toBeTruthy();
  });

  it("applies a preset when clicked", async () => {
    const onApplyPreset = vi.fn();
    render(TableViewPresets, {
      activeVaultId: "vault-1",
      currentFilterState: {
        searchQuery: "",
        typeFilters: new Set<string>(),
        labelFilters: new Set<string>(),
        showIncompleteOnly: false,
        columnFilters: {},
      },
      onApplyPreset,
      onResetFilters: vi.fn(),
      presetsStore: store,
    });

    await fireEvent.click(screen.getByTestId("table-view-presets-toggle"));
    const presetItem = screen.getByTestId("table-preset-item");
    await fireEvent.click(presetItem);

    expect(onApplyPreset).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "p1",
        name: "Villains",
      }),
    );
    expect(store.activePresetId).toBe("p1");
    // Panel should close after applying
    expect(screen.queryByTestId("table-view-presets-panel")).toBeNull();
  });

  it("saves the current filter state as a new view", async () => {
    const saveSpy = vi.spyOn(store, "savePreset");
    render(TableViewPresets, {
      activeVaultId: "vault-1",
      currentFilterState: {
        searchQuery: "dragon",
        typeFilters: new Set<string>(["monster"]),
        labelFilters: new Set<string>(["fire"]),
        showIncompleteOnly: true,
        columnFilters: { summaryMode: "has_summary" },
      },
      onApplyPreset: vi.fn(),
      onResetFilters: vi.fn(),
      presetsStore: store,
    });

    await fireEvent.click(screen.getByTestId("table-view-presets-toggle"));
    const nameInput = screen.getByTestId("table-preset-name-input");
    const saveBtn = screen.getByTestId("table-preset-save");

    await fireEvent.input(nameInput, { target: { value: "Dragon Audit" } });
    await fireEvent.click(saveBtn);

    expect(saveSpy).toHaveBeenCalledWith(
      "vault-1",
      "Dragon Audit",
      expect.objectContaining({
        searchQuery: "dragon",
        activeCategories: ["monster"],
        activeLabels: ["fire"],
        showIncompleteOnly: true,
        columnFilters: { summaryMode: "has_summary" },
      }),
    );
  });

  it("triggers onResetFilters when clicking Reset to default", async () => {
    const onResetFilters = vi.fn();
    render(TableViewPresets, {
      activeVaultId: "vault-1",
      currentFilterState: {
        searchQuery: "something",
        typeFilters: new Set<string>(["item"]),
        labelFilters: new Set<string>(),
        showIncompleteOnly: false,
        columnFilters: {},
      },
      onApplyPreset: vi.fn(),
      onResetFilters,
      presetsStore: store,
    });

    await fireEvent.click(screen.getByTestId("table-view-presets-toggle"));
    const resetBtn = screen.getByText("Reset to default");
    await fireEvent.click(resetBtn);

    expect(onResetFilters).toHaveBeenCalled();
    expect(store.activePresetId).toBeNull();
  });

  it("closes panel on Escape key", async () => {
    render(TableViewPresets, {
      activeVaultId: "vault-1",
      currentFilterState: {
        searchQuery: "",
        typeFilters: new Set<string>(),
        labelFilters: new Set<string>(),
        showIncompleteOnly: false,
        columnFilters: {},
      },
      onApplyPreset: vi.fn(),
      onResetFilters: vi.fn(),
      presetsStore: store,
    });

    await fireEvent.click(screen.getByTestId("table-view-presets-toggle"));
    expect(screen.getByTestId("table-view-presets-panel")).toBeTruthy();

    await fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("table-view-presets-panel")).toBeNull();
  });
});
