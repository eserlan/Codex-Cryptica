import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, it, expect, vi, beforeEach } from "vitest";
import CalendarEraSettings from "./CalendarEraSettings.svelte";
import { calendarStore } from "$lib/stores/calendar.svelte";
import { DEFAULT_CALENDAR } from "chronology-engine";

describe("CalendarEraSettings", () => {
  beforeEach(() => {
    calendarStore.config = {
      ...DEFAULT_CALENDAR,
      revision: 1,
      eras: [],
    };
    vi.spyOn(calendarStore, "setConfig").mockImplementation(
      async (newConfig) => {
        calendarStore.config = newConfig;
      },
    );
  });

  it("renders empty state when no eras are defined", () => {
    render(CalendarEraSettings);
    expect(screen.getByText(/No custom eras defined/i)).toBeDefined();
  });

  it("adds a new era when ADD ERA button is clicked", async () => {
    render(CalendarEraSettings);
    const addBtn = screen.getByTestId("add-era-btn");
    await fireEvent.click(addBtn);

    expect(calendarStore.setConfig).toHaveBeenCalled();
    expect(calendarStore.config.eras?.length).toBe(1);
    expect(calendarStore.config.eras?.[0].name).toBe("Era 1");
    expect(calendarStore.config.eras?.[0].startYear).toBe(0);
  });

  it("updates era name and label on input", async () => {
    calendarStore.config = {
      ...DEFAULT_CALENDAR,
      eras: [
        {
          id: "era-1",
          name: "Old Name",
          label: "ON",
          startYear: 0,
          yearAtStart: 1,
          direction: "forward",
        },
      ],
    };

    render(CalendarEraSettings);

    expect(screen.getByRole("textbox", { name: "Era name #1" })).toBeDefined();
    expect(
      screen.getByRole("textbox", { name: "Era abbreviation #1" }),
    ).toBeDefined();

    const nameInput = screen.getByTestId("era-name-input-0");
    await fireEvent.input(nameInput, { target: { value: "After the Fall" } });

    expect(calendarStore.setConfig).toHaveBeenCalled();
    expect(calendarStore.config.eras?.[0].name).toBe("After the Fall");

    const labelInput = screen.getByTestId("era-label-input-0");
    await fireEvent.input(labelInput, { target: { value: "AF" } });
    expect(calendarStore.config.eras?.[0].label).toBe("AF");
  });

  it("removes an era when remove button is clicked", async () => {
    calendarStore.config = {
      ...DEFAULT_CALENDAR,
      eras: [
        {
          id: "era-1",
          name: "Era To Remove",
          startYear: 0,
          yearAtStart: 1,
          direction: "forward",
        },
      ],
    };

    render(CalendarEraSettings);

    const removeBtn = screen.getByTestId("remove-era-btn-0");
    await fireEvent.click(removeBtn);

    expect(calendarStore.setConfig).toHaveBeenCalled();
    expect(calendarStore.config.eras?.length).toBe(0);
  });
});
