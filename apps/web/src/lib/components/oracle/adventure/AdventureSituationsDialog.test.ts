/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureSituationsDialog from "./AdventureSituationsDialog.svelte";

function createMockManager(
  items: unknown[] = [],
  focusedScenarioId: string | null = null,
  pendingRoll: unknown = null,
) {
  return {
    session: {
      scenarioCollection: {
        items,
        focusedScenarioId,
      },
      pendingRoll,
    },
    phase: "ready",
    readOnly: false,
    focusScenario: vi.fn().mockResolvedValue(undefined),
    setScenarioStatus: vi.fn().mockResolvedValue(undefined),
    recordScenarioTheory: vi.fn().mockResolvedValue(undefined),
    submitAction: vi.fn().mockResolvedValue(undefined),
  } as any;
}

const heard1 = {
  id: "sit-1",
  knowledge: "heard",
  status: "open",
  playerVisible: {
    rumour: "The old bell rings at midnight without a ringer.",
    lead: "The Sunken Belfry",
  },
  events: [],
  anchorRefs: [],
};

const heard2 = {
  id: "sit-2",
  knowledge: "heard",
  status: "open",
  playerVisible: {
    rumour: "Caravan guards reported tracks of giant crabs.",
    lead: "Mud Flats Crossing",
  },
  events: [],
  anchorRefs: [],
};

const hidden = {
  id: "sit-3",
  knowledge: "unheard",
  status: "open",
  playerVisible: {
    rumour: "Secret cult gathering.",
    lead: "Hidden Vault",
  },
  events: [],
  anchorRefs: [],
};

describe("AdventureSituationsDialog", () => {
  it("renders a trigger button with badge count for heard situations", () => {
    const manager = createMockManager([heard1, heard2, hidden], "sit-1");
    render(AdventureSituationsDialog, { props: { manager } });

    const trigger = screen.getByRole("button", {
      name: /adventure situations \(2 known\)/i,
    });
    expect(trigger).toBeTruthy();
    expect(trigger.textContent).toContain("2");
    expect(trigger.textContent).toContain("Situations");
  });

  it("renders trigger button without a badge when 0 situations are heard", () => {
    const manager = createMockManager([hidden]);
    render(AdventureSituationsDialog, { props: { manager } });

    const trigger = screen.getByRole("button", {
      name: /^adventure situations$/i,
    });
    expect(trigger).toBeTruthy();
    expect(trigger.textContent).not.toContain("0");
    expect(trigger.textContent).toContain("Situations");
  });

  it("opens dialog on click and displays heard situations and focus control", async () => {
    const manager = createMockManager([heard1, heard2], "sit-1");
    render(AdventureSituationsDialog, { props: { manager } });

    const trigger = screen.getByRole("button", {
      name: /adventure situations/i,
    });
    await fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", {
      name: /situations & rumours/i,
    });
    expect(dialog).toBeTruthy();
    expect(screen.getAllByText("The Sunken Belfry").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mud Flats Crossing").length).toBeGreaterThan(0);

    const focusSelect = screen.getByRole("combobox", {
      name: /focused situation/i,
    }) as HTMLSelectElement;
    expect(focusSelect.value).toBe("sit-1");

    await fireEvent.change(focusSelect, { target: { value: "sit-2" } });
    expect(manager.focusScenario).toHaveBeenCalledWith("sit-2");
  });

  it("shows an empty state when no situations are heard and allows asking for rumours", async () => {
    const manager = createMockManager([]);
    render(AdventureSituationsDialog, { props: { manager } });

    await fireEvent.click(
      screen.getByRole("button", { name: /adventure situations/i }),
    );

    expect(
      screen.getAllByText(/no situations heard yet/i).length,
    ).toBeGreaterThan(0);

    const rumourBtn = screen.getByRole("button", {
      name: /look for local rumours/i,
    });
    await fireEvent.click(rumourBtn);

    expect(manager.submitAction).toHaveBeenCalledWith(
      "Ask around for local rumours and news.",
    );
  });

  it("closes dialog on close button click or Escape key and restores focus", async () => {
    const manager = createMockManager([heard1]);
    render(AdventureSituationsDialog, { props: { manager } });

    const trigger = screen.getByRole("button", {
      name: /adventure situations/i,
    });
    trigger.focus();
    await fireEvent.click(trigger);

    expect(screen.getByRole("dialog")).toBeTruthy();

    const closeBtn = screen.getByRole("button", { name: "Close situations" });
    await fireEvent.click(closeBtn);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);

    // Reopen and test Escape
    await fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeTruthy();

    await fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("disables mutation actions when manager is busy, generating, or has a pending roll", async () => {
    const manager = createMockManager([heard1], null, { id: "roll-1" });
    render(AdventureSituationsDialog, { props: { manager } });

    await fireEvent.click(
      screen.getByRole("button", { name: /adventure situations/i }),
    );

    const rumourBtn = screen.getByRole("button", {
      name: /look for local rumours/i,
    });
    expect(rumourBtn.hasAttribute("disabled")).toBe(true);

    const focusSelect = screen.getByRole("combobox", {
      name: /focused situation/i,
    });
    expect(focusSelect.hasAttribute("disabled")).toBe(true);
  });
});
