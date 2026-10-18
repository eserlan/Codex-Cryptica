/** @vitest-environment jsdom */

import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureResourceCounters from "./AdventureResourceCounters.svelte";

function manager(overrides: Record<string, unknown> = {}) {
  return {
    session: { resourceCounters: [] },
    readOnly: false,
    addResourceCounter: vi.fn(async () => undefined),
    adjustResourceCounter: vi.fn(async () => undefined),
    removeResourceCounter: vi.fn(async () => undefined),
    ...overrides,
  } as any;
}

describe("AdventureResourceCounters", () => {
  it("adds a counter with a label and numeric starting value", async () => {
    const m = manager();
    render(AdventureResourceCounters, { manager: m });

    await fireEvent.input(screen.getByLabelText("New resource counter label"), {
      target: { value: "Ammo" },
    });
    await fireEvent.input(
      screen.getByLabelText("New resource counter starting value"),
      { target: { value: "6" } },
    );
    await fireEvent.click(screen.getByText("Track it"));

    await waitFor(() =>
      expect(m.addResourceCounter).toHaveBeenCalledWith("Ammo", 6),
    );
  });

  it("rejects an empty label", async () => {
    const m = manager();
    render(AdventureResourceCounters, { manager: m });

    await fireEvent.click(screen.getByText("Track it"));

    expect(m.addResourceCounter).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("required");
  });

  it("adjusts a counter value with +/- and removes it", async () => {
    const m = manager({
      session: {
        resourceCounters: [{ id: "counter-1", label: "Ammo", value: 6 }],
      },
    });
    render(AdventureResourceCounters, { manager: m });

    await fireEvent.click(
      screen.getByRole("button", { name: "Increase Ammo" }),
    );
    expect(m.adjustResourceCounter).toHaveBeenCalledWith("counter-1", 7);

    await fireEvent.click(
      screen.getByRole("button", { name: "Decrease Ammo" }),
    );
    expect(m.adjustResourceCounter).toHaveBeenCalledWith("counter-1", 5);

    await fireEvent.click(screen.getByRole("button", { name: "Remove Ammo" }));
    expect(m.removeResourceCounter).toHaveBeenCalledWith("counter-1");
  });
});
