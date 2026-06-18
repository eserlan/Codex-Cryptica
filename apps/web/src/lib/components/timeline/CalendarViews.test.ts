/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import CalendarAgendaView from "./CalendarAgendaView.svelte";
import CalendarMonthView from "./CalendarMonthView.svelte";

const exactEntry = {
  entityId: "event-1",
  title: "Coronation",
  entityType: "event",
  dateKind: "exact" as const,
  date: { year: 2026, month: 6, day: 18 },
  exactDate: { year: 2026, month: 6, day: 18 },
  displayDateLabel: "June 18, 2026",
  sortKey: 1,
  relatedEntityIds: ["faction-1"],
  labels: ["royal"],
};

describe("Calendar month and agenda views", () => {
  it("renders exact-dated entries in their month cell", () => {
    render(CalendarMonthView, {
      month: {
        year: 2026,
        month: 6,
        title: "June 2026",
        weeks: [
          {
            days: [
              {
                date: { year: 2026, month: 6, day: 15 },
                inCurrentMonth: true,
                entries: [],
                overflowCount: 0,
                hiddenEntries: [],
              },
              {
                date: { year: 2026, month: 6, day: 16 },
                inCurrentMonth: true,
                entries: [],
                overflowCount: 0,
                hiddenEntries: [],
              },
              {
                date: { year: 2026, month: 6, day: 17 },
                inCurrentMonth: true,
                entries: [],
                overflowCount: 0,
                hiddenEntries: [],
              },
              {
                date: { year: 2026, month: 6, day: 18 },
                inCurrentMonth: true,
                entries: [exactEntry],
                overflowCount: 0,
                hiddenEntries: [],
              },
              {
                date: { year: 2026, month: 6, day: 19 },
                inCurrentMonth: true,
                entries: [],
                overflowCount: 0,
                hiddenEntries: [],
              },
              {
                date: { year: 2026, month: 6, day: 20 },
                inCurrentMonth: true,
                entries: [],
                overflowCount: 0,
                hiddenEntries: [],
              },
              {
                date: { year: 2026, month: 6, day: 21 },
                inCurrentMonth: true,
                entries: [],
                overflowCount: 0,
                hiddenEntries: [],
              },
            ],
          },
        ],
      },
      onSelect: vi.fn(),
    });

    expect(screen.getByText("Coronation")).toBeTruthy();
  });

  it("reveals overflowed entries accessibly", async () => {
    const onSelect = vi.fn();
    render(CalendarMonthView, {
      month: {
        year: 2026,
        month: 6,
        title: "June 2026",
        weeks: [
          {
            days: [
              {
                date: { year: 2026, month: 6, day: 18 },
                inCurrentMonth: true,
                entries: [exactEntry],
                overflowCount: 1,
                hiddenEntries: [
                  { ...exactEntry, entityId: "event-2", title: "Afterparty" },
                ],
              },
              ...Array.from({ length: 6 }, (_, index) => ({
                date: { year: 2026, month: 6, day: index + 19 },
                inCurrentMonth: true,
                entries: [],
                overflowCount: 0,
                hiddenEntries: [],
              })),
            ],
          },
        ],
      },
      onSelect,
    });

    await fireEvent.click(
      screen.getByRole("button", {
        name: "Show more events for June 18, 2026",
      }),
    );
    expect(screen.getByText("Afterparty")).toBeTruthy();

    await fireEvent.click(screen.getByText("Afterparty"));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: "event-2" }),
    );
  });

  it("renders agenda sections including undated or approximate entries", () => {
    render(CalendarAgendaView, {
      sections: [
        {
          id: "2026-6-18",
          label: "June 18, 2026",
          entries: [exactEntry],
        },
        {
          id: "undated-approximate",
          label: "Undated/Approximate",
          entries: [
            {
              ...exactEntry,
              entityId: "event-3",
              title: "Rumored Prophecy",
              dateKind: "approximate",
              exactDate: undefined,
              displayDateLabel: "2027",
            },
          ],
        },
      ],
      onSelect: vi.fn(),
    });

    expect(screen.getAllByText("June 18, 2026").length).toBeGreaterThan(0);
    expect(screen.getByText("Undated/Approximate")).toBeTruthy();
    expect(screen.getByText("Rumored Prophecy")).toBeTruthy();
  });
});
