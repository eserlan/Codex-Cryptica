/** @vitest-environment jsdom */
import { render } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import DetailTabs from "./DetailTabs.svelte";

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    isGuest: false,
  },
}));

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {
    list: [
      { id: "npc", label: "Npc" },
      { id: "character", label: "Character" },
      { id: "faction", label: "Faction" },
    ],
  },
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    activeTheme: { id: "fantasy" },
    jargon: {
      tab_status: "Status",
      tab_lore: "Lore",
    },
  },
}));

vi.mock("$lib/stores/calendar.svelte", () => {
  const mockCalendarConfig = {
    useGregorian: false,
    months: [{ id: "m1", name: "Alpha", days: 10 }],
    daysPerWeek: 5,
    anchors: [],
    revision: 1,
  };
  return {
    calendarStore: {
      config: mockCalendarConfig,
    },
  };
});

describe("DetailTabs Date Display", () => {
  it("renders single date for events/entities with exact date", () => {
    const mockEntity = {
      id: "entity-1",
      title: "Test Event",
      type: "Event",
      date: { year: 1005 },
    } as any;

    const { getByText } = render(DetailTabs, {
      entity: mockEntity,
      activeTab: "status",
      isEditing: false,
      editType: "event",
      idPrefix: "test-prefix",
    });

    // It should render "Event" and "(1005)" in the header area
    expect(getByText("Event")).toBeTruthy();
    expect(getByText("(1005)")).toBeTruthy();
  });

  it("renders start and end dates with temporal labels next to category name", () => {
    const mockEntity = {
      id: "entity-2",
      title: "Test Character",
      type: "Character",
      start_date: { year: 1005 },
      end_date: { year: 1080 },
    } as any;

    const { getByText } = render(DetailTabs, {
      entity: mockEntity,
      activeTab: "status",
      isEditing: false,
      editType: "character",
      idPrefix: "test-prefix",
    });

    expect(getByText("Character")).toBeTruthy();
    expect(getByText("(Born: 1005 – Died: 1080)")).toBeTruthy();
  });

  it("renders start date only when end date is missing", () => {
    const mockEntity = {
      id: "entity-3",
      title: "Test Character missing end",
      type: "Character",
      start_date: { year: 1005 },
    } as any;

    const { getByText } = render(DetailTabs, {
      entity: mockEntity,
      activeTab: "status",
      isEditing: false,
      editType: "character",
      idPrefix: "test-prefix",
    });

    expect(getByText("(Born: 1005)")).toBeTruthy();
  });

  it("renders end date only when start date is missing", () => {
    const mockEntity = {
      id: "entity-4",
      title: "Test Character missing start",
      type: "Character",
      end_date: { year: 1080 },
    } as any;

    const { getByText } = render(DetailTabs, {
      entity: mockEntity,
      activeTab: "status",
      isEditing: false,
      editType: "character",
      idPrefix: "test-prefix",
    });

    expect(getByText("(Died: 1080)")).toBeTruthy();
  });

  it("hides temporal metadata when in edit mode", () => {
    const mockEntity = {
      id: "entity-5",
      title: "Test Event Edit",
      type: "Event",
      date: { year: 1005 },
    } as any;

    const { queryByText } = render(DetailTabs, {
      entity: mockEntity,
      activeTab: "status",
      isEditing: true,
      editType: "event",
      idPrefix: "test-prefix",
    });

    expect(queryByText("(1005)")).toBeNull();
  });
});
