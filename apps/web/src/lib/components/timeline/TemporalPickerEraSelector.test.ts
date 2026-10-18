import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import TemporalPickerEraSelector from "./TemporalPickerEraSelector.svelte";
import type { WorldCalendar, DateSelection } from "chronology-engine";
import { DEFAULT_CALENDAR } from "chronology-engine";

describe("TemporalPickerEraSelector", () => {
  const calendarWithEras: WorldCalendar = {
    ...DEFAULT_CALENDAR,
    eras: [
      {
        id: "era-bf",
        name: "Before Fall",
        label: "BF",
        startYear: -1,
        yearAtStart: 1,
        direction: "backward",
      },
      {
        id: "era-af",
        name: "After Fall",
        label: "AF",
        startYear: 0,
        yearAtStart: 1,
        direction: "forward",
      },
    ],
  };

  const sampleSelection: DateSelection = {
    precision: "year",
    year: 10,
    calendarRevision: 1,
  };

  it("renders nothing when calendar has no eras", () => {
    const onSelectEra = vi.fn();
    render(TemporalPickerEraSelector, {
      selection: sampleSelection,
      config: { ...DEFAULT_CALENDAR, eras: [] },
      onSelectEra,
    });

    expect(screen.queryByTestId("calendar-era-selector")).toBeNull();
  });

  it("renders era pill buttons when eras exist", () => {
    const onSelectEra = vi.fn();
    render(TemporalPickerEraSelector, {
      selection: sampleSelection,
      config: calendarWithEras,
      onSelectEra,
    });

    expect(screen.getByTestId("calendar-era-selector")).toBeDefined();
    expect(screen.getByTestId("era-pill-era-bf")).toBeDefined();
    expect(screen.getByTestId("era-pill-era-af")).toBeDefined();
    expect(screen.getByText("BF")).toBeDefined();
    expect(screen.getByText("AF")).toBeDefined();
  });

  it("calls onSelectEra with era startYear when inactive era is clicked", async () => {
    const onSelectEra = vi.fn();
    // Selection is year 10 (AF)
    render(TemporalPickerEraSelector, {
      selection: sampleSelection,
      config: calendarWithEras,
      onSelectEra,
    });

    const bfPill = screen.getByTestId("era-pill-era-bf");
    await fireEvent.click(bfPill);

    expect(onSelectEra).toHaveBeenCalledWith(-1);
  });
});
