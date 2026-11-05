/** @vitest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureScenarioControls from "./AdventureScenarioControls.svelte";

function manager(
  items: unknown[],
  focusedScenarioId: string | null = null,
  pendingRoll: unknown = null,
) {
  return {
    session: { scenarioCollection: { items, focusedScenarioId }, pendingRoll },
    readOnly: false,
    focusScenario: vi.fn(async () => {}),
    setScenarioStatus: vi.fn(async () => {}),
  } as any;
}

const heard = {
  id: "known-1",
  knowledge: "heard",
  status: "open",
  playerVisible: { rumour: "The mill bell rang", lead: "The old mill" },
  events: [],
};
const resolved = {
  id: "known-2",
  knowledge: "heard",
  status: "resolved",
  playerVisible: { rumour: "A sealed letter", lead: "The north gate" },
  events: [
    { id: "event-1", visibility: "player", text: "The letter was delivered." },
  ],
};
const unheard = {
  id: "hidden-1",
  knowledge: "unheard",
  status: "open",
  playerVisible: { rumour: "Secret rumour", lead: "Secret lead" },
  events: [],
};

describe("AdventureScenarioControls", () => {
  it("shows only heard leads and exposes focus, clear, resolve and abandon controls", async () => {
    const m = manager([heard, resolved, unheard], "known-1");
    render(AdventureScenarioControls, { props: { manager: m } });
    const focus = screen.getByRole("combobox", {
      name: "Focused situation",
    }) as HTMLSelectElement;
    expect(focus.textContent).toContain("The old mill");
    expect(focus.textContent).not.toContain("Secret lead");
    const details = screen.getByRole("list", {
      name: "Known situation details",
    });
    expect(details.textContent).toContain("A sealed letter");
    expect(details.textContent).toContain("resolved");
    expect(details.textContent).toContain("The letter was delivered.");
    expect(details.textContent).not.toContain("Secret rumour");
    await fireEvent.change(focus, { target: { value: "" } });
    expect(m.focusScenario).toHaveBeenCalledWith(null);
    await fireEvent.click(screen.getByRole("button", { name: "Resolve" }));
    expect(m.setScenarioStatus).toHaveBeenCalledWith("known-1", "resolved");
    await fireEvent.click(screen.getByRole("button", { name: "Abandon" }));
    expect(m.setScenarioStatus).toHaveBeenCalledWith("known-1", "abandoned");
  });

  it("does not expose unheard counts and disables mutations while a roll is pending", () => {
    const m = manager([unheard], null);
    const { container } = render(AdventureScenarioControls, {
      props: { manager: m },
    });
    expect(
      container.querySelector("[data-testid='adventure-scenario-controls']"),
    ).toBeNull();
    const pending = manager([heard], "known-1", { id: "roll" });
    render(AdventureScenarioControls, { props: { manager: pending } });
    expect(
      screen
        .getByRole("combobox", { name: "Focused situation" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "Resolve" }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("shows fixed recovery copy when a save fails", async () => {
    const m = manager([heard], "known-1");
    m.focusScenario.mockRejectedValue(new Error("state-budget-exceeded"));
    render(AdventureScenarioControls, { props: { manager: m } });
    await fireEvent.change(
      screen.getByRole("combobox", { name: "Focused situation" }),
      { target: { value: "" } },
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "The adventure is unchanged.",
    );
    expect(screen.getByRole("alert").textContent).not.toContain(
      "state-budget-exceeded",
    );
  });
});
