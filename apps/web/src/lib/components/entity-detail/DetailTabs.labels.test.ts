/** @vitest-environment jsdom */
import { render, screen, cleanup } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import DetailTabs from "./DetailTabs.svelte";

const mocks = vi.hoisted(() => ({
  vault: { isGuest: false },
  theme: {
    activeTheme: { id: "fantasy" },
    jargon: { tab_status: "Attributes", tab_lore: "Mythos" },
  },
}));

vi.mock("#lib/stores/vault.svelte.js", () => ({ vault: mocks.vault }));
vi.mock("#lib/stores/theme.svelte.js", () => ({ themeStore: mocks.theme }));
vi.mock("#lib/stores/categories.svelte.js", () => ({
  categories: { list: [{ id: "npc", label: "Npc" }] },
}));
vi.mock("#lib/stores/calendar.svelte.js", () => ({
  calendarStore: { config: { useGregorian: true, months: [], anchors: [] } },
}));

const renderTabs = (type: string, canGuestEdit = false) =>
  render(DetailTabs, {
    entity: { id: "e1", type, title: "E" } as never,
    activeTab: "status",
    isEditing: false,
    editType: type,
    idPrefix: "t",
    canGuestEdit,
  });

const tabText = () =>
  screen.getAllByRole("tab").map((t) => t.textContent?.trim());

afterEach(() => {
  cleanup();
  mocks.vault.isGuest = false;
});

describe.each([
  ["fantasy", "Attributes", "Mythos"],
  ["scifi", "Diagnostics", "Data Streams"],
])("DetailTabs labels in %s", (id, status, lore) => {
  it("shows plain labels for an owner", () => {
    mocks.theme.activeTheme.id = id;
    mocks.theme.jargon = { tab_status: status, tab_lore: lore };
    renderTabs("location");
    expect(tabText()).toEqual([
      "Overview",
      "Connections",
      "GM notes",
      "Map",
      "Stats",
      "Timeline",
    ]);
    expect(screen.queryByText(status)).toBeNull();
    expect(screen.queryByText(lore)).toBeNull();
  });

  it("adds Chats and Family for a character", () => {
    mocks.theme.activeTheme.id = id;
    mocks.theme.jargon = { tab_status: status, tab_lore: lore };
    renderTabs("character");
    expect(tabText()).toContain("Chats");
    expect(tabText()).toContain("Family");
  });

  it("hides GM notes from a guest", () => {
    mocks.theme.activeTheme.id = id;
    mocks.vault.isGuest = true;
    renderTabs("location");
    expect(tabText()).not.toContain("GM notes");
  });
});
