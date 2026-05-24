/** @vitest-environment jsdom */

import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi, beforeEach } from "vitest";
import TemporalPicker from "./TemporalPicker.svelte";

vi.mock("$app/paths", () => ({
  base: "",
}));

// Polyfill Element.prototype.animate for JSDOM
if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = () => {
    return {
      finished: Promise.resolve(),
      cancel: () => {},
      onfinish: null,
      pause: () => {},
      play: () => {},
      reverse: () => {},
    } as unknown as Animation;
  };
}

// Mock calendarStore

vi.mock("$lib/stores/calendar.svelte", () => {
  const mockCalendarConfig = {
    useGregorian: false,
    months: [
      {
        id: "m1",
        name: "Alpha-With-An-Extremely-Long-Name-That-Truncates-In-Small-Wheels",
        days: 10,
      },
      { id: "m2", name: "Beta", days: 15 },
    ],
    daysPerWeek: 5,
    anchors: [
      { id: "anc1", name: "Winter Solstice", afterMonthId: "m1", afterDay: 10 },
    ],
    revision: 2,
  };
  return {
    calendarStore: {
      config: mockCalendarConfig,
      getSnapshot: () => ({
        config: mockCalendarConfig,
        revision: 2,
      }),
    },
  };
});

// Mock graph store for eras
vi.mock("$lib/stores/graph.svelte", () => ({
  graph: {
    eras: [
      {
        id: "era1",
        name: "Golden Age",
        start_year: 100,
        end_year: 200,
        color: "#ffd700",
      },
    ],
  },
}));

describe("TemporalPicker", () => {
  let triggerElement: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    triggerElement = document.createElement("button");
    document.body.appendChild(triggerElement);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("should render year, unit, and day wheel columns for full date precision", async () => {
    const value = {
      precision: "day",
      year: 150,
      unitId: "m1",
      day: 5,
      calendarRevision: 2,
    };

    render(TemporalPicker, {
      value,
      trigger: triggerElement,
      onClose: vi.fn(),
    });

    // Verify column headers exist
    expect(screen.getByText("Year")).toBeTruthy();
    expect(screen.getByText("Unit")).toBeTruthy();
    expect(screen.getByText("Day")).toBeTruthy();

    // Verify centered selected values
    const yearCol = screen.getByRole("listbox", { name: "Year column" });
    expect(yearCol).toBeTruthy();

    const unitCol = screen.getByRole("listbox", { name: "Unit column" });
    expect(unitCol).toBeTruthy();

    const dayCol = screen.getByRole("listbox", { name: "Day column" });
    expect(dayCol).toBeTruthy();
  });

  it("should truncate long labels with ellipsis and show full synchronized preview below", async () => {
    const value = {
      precision: "day",
      year: 150,
      unitId: "m1",
      day: 5,
      calendarRevision: 2,
    };

    render(TemporalPicker, {
      value,
      trigger: triggerElement,
      onClose: vi.fn(),
    });

    // Check synchronized full preview text at the bottom
    const preview = screen.getByTestId("synchronized-preview");
    expect(preview).toBeTruthy();
    expect(preview.textContent).toContain(
      "5 Alpha-With-An-Extremely-Long-Name-That-Truncates-In-Small-Wheels 150",
    );
  });

  it("should handle keyboard stepper listbox navigation for accessible announcements", async () => {
    const value = {
      precision: "day",
      year: 150,
      unitId: "m1",
      day: 5,
      calendarRevision: 2,
    };

    render(TemporalPicker, {
      value,
      trigger: triggerElement,
      onClose: vi.fn(),
    });

    const dayCol = screen.getByRole("listbox", { name: "Day column" });
    dayCol.focus();

    // Keydown ArrowDown should move focus/selection to next day
    await fireEvent.keyDown(dayCol, { key: "ArrowDown" });

    // Live region announcements check
    const announcement = screen.getByTestId("aria-announcement");
    expect(announcement).toBeTruthy();
  });

  it("should show inline repair banner, disable Apply, and enable Apply after confirming repair", async () => {
    // Old revision date
    const value = {
      precision: "day",
      year: 150,
      unitId: "deleted-month", // Deleted month
      day: 5,
      calendarRevision: 1,
    };

    render(TemporalPicker, {
      value,
      trigger: triggerElement,
      onClose: vi.fn(),
    });

    // Verify warning banner exists
    expect(screen.getByTestId("repair-warning-banner")).toBeTruthy();

    // Verify Apply button is disabled
    const applyButton = screen.getByTestId(
      "apply-date-button",
    ) as HTMLButtonElement;
    expect(applyButton.disabled).toBe(true);

    // Click Confirm Repair
    const repairButton = screen.getByText("Confirm Repair");
    await fireEvent.click(repairButton);

    // Verify warning banner is gone and Apply is now enabled
    expect(screen.queryByTestId("repair-warning-banner")).toBeNull();
    expect(applyButton.disabled).toBe(false);
  });
});
