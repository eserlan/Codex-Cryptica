/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import DetailTabs from "./DetailTabs.svelte";

// Minimal mocks required by DetailTabs

vi.mock("$lib/stores/categories.svelte", () => ({
  categories: {
    list: [
      { id: "character", label: "Character", icon: "user", color: "#fff" },
    ],
  },
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: { isGuest: false },
}));

vi.mock("$lib/stores/theme.svelte", () => ({
  themeStore: {
    activeTheme: { id: "default" },
    jargon: { tab_status: "Status", tab_lore: "Lore" },
  },
}));

vi.mock("$lib/stores/calendar.svelte", () => ({
  calendarStore: {
    config: {
      useGregorian: false,
      months: [
        { id: "january", name: "January", days: 31 },
        { id: "february", name: "February", days: 28 },
        { id: "march", name: "March", days: 31 },
        { id: "april", name: "April", days: 30 },
        { id: "may", name: "May", days: 31 },
        { id: "june", name: "June", days: 30 },
      ],
      daysPerWeek: 7,
      epochWeekday: 0,
    },
  },
}));

vi.mock("chronology-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("chronology-engine")>();
  return { ...actual };
});

vi.mock("./detail-tabs", () => ({
  createEntityDetailTabIds: () => ({
    tabIds: {
      status: "tab-status",
      lore: "tab-lore",
      map: "tab-map",
      chats: "tab-chats",
    },
    panelIds: {
      status: "panel-status",
      lore: "panel-lore",
      map: "panel-map",
      chats: "panel-chats",
    },
  }),
  getNextEntityDetailTabInList: vi.fn(),
  entityDetailTabs: ["status", "lore", "map"],
  getTemporalLabel: (_type: string, kind: string) =>
    kind === "start" ? "Born" : "Died",
}));

function makeEntity(overrides = {}) {
  return {
    id: "e1",
    title: "Aragorn",
    type: "character",
    tags: [],
    labels: [],
    aliases: [],
    content: "",
    status: "active" as const,
    connections: [],
    ...overrides,
  };
}

const baseProps = {
  activeTab: "status" as const,
  isEditing: false,
  editType: "character",
  idPrefix: "test",
  canGuestEdit: false,
};

describe("DetailTabs getNavigableDate", () => {
  it("does not render calendar-navigate button when entity has no dates", () => {
    const onDateClick = vi.fn();
    render(DetailTabs, {
      entity: makeEntity(),
      ...baseProps,
      onDateClick,
    });
    expect(screen.queryByTitle("Go to this date in the calendar")).toBeNull();
  });

  it("does not render calendar-navigate button when onDateClick is not provided", () => {
    render(DetailTabs, {
      entity: makeEntity({ date: { year: 2030, month: 6, day: 1 } }),
      ...baseProps,
    });
    expect(screen.queryByTitle("Go to this date in the calendar")).toBeNull();
  });

  it("renders navigate button for legacy date and calls onDateClick with correct year/month", async () => {
    const onDateClick = vi.fn();
    render(DetailTabs, {
      entity: makeEntity({ date: { year: 2030, month: 6, day: 1 } }),
      ...baseProps,
      onDateClick,
    });

    const btn = screen.getByTitle("Go to this date in the calendar");
    await fireEvent.click(btn);
    expect(onDateClick).toHaveBeenCalledWith(2030, 6);
  });

  it("resolves DateSelection unitId to month index + 1", async () => {
    const onDateClick = vi.fn();
    render(DetailTabs, {
      entity: makeEntity({
        date: {
          precision: "day",
          year: 2031,
          unitId: "june",
          day: 15,
          calendarRevision: 1,
        },
      }),
      ...baseProps,
      onDateClick,
    });

    const btn = screen.getByTitle("Go to this date in the calendar");
    await fireEvent.click(btn);
    // "june" is index 5 → month 6
    expect(onDateClick).toHaveBeenCalledWith(2031, 6);
  });

  it("falls back to month 1 when DateSelection unitId is unknown", async () => {
    const onDateClick = vi.fn();
    render(DetailTabs, {
      entity: makeEntity({
        date: {
          precision: "day",
          year: 2032,
          unitId: "unknown-month",
          day: 1,
          calendarRevision: 1,
        },
      }),
      ...baseProps,
      onDateClick,
    });

    const btn = screen.getByTitle("Go to this date in the calendar");
    await fireEvent.click(btn);
    expect(onDateClick).toHaveBeenCalledWith(2032, 1);
  });

  it("prefers start_date over date when both are present", async () => {
    const onDateClick = vi.fn();
    render(DetailTabs, {
      entity: makeEntity({
        start_date: { year: 2025, month: 3 },
        date: { year: 2030, month: 6 },
      }),
      ...baseProps,
      onDateClick,
    });

    const btn = screen.getByTitle("Go to this date in the calendar");
    await fireEvent.click(btn);
    expect(onDateClick).toHaveBeenCalledWith(2025, 3);
  });
});
