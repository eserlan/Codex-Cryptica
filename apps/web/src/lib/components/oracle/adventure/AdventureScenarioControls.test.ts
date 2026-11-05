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
  it("shows only heard leads and exposes focus and clear, but no status buttons", async () => {
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
    expect(details.textContent).toContain("Resolved");
    expect(details.textContent).toContain("The letter was delivered.");
    expect(details.textContent).not.toContain("Secret rumour");
    await fireEvent.change(focus, { target: { value: "" } });
    expect(m.focusScenario).toHaveBeenCalledWith(null);
    // Closing a lead is a deliberate act in Adventure tools, not a main-row click.
    for (const name of ["Resolve", "Abandon", "Reopen"]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    expect(m.setScenarioStatus).not.toHaveBeenCalled();
  });

  it("does not expose unheard counts and disables focus while a roll is pending", () => {
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

  it("labels each lead with a plain-language status badge and quotes the rumour", () => {
    const abandoned = {
      ...heard,
      id: "known-3",
      status: "abandoned",
      playerVisible: { rumour: "A drowned bell", lead: "The quay" },
    };
    const m = manager([heard, resolved, abandoned], null);
    render(AdventureScenarioControls, { props: { manager: m } });
    const details = screen.getByRole("list", {
      name: "Known situation details",
    });
    const cards = details.querySelectorAll(":scope > li");
    expect(cards).toHaveLength(3);
    expect(cards[0].textContent).toContain("Open");
    expect(cards[1].textContent).toContain("Resolved");
    expect(cards[2].textContent).toContain("Left behind");
    expect(cards[0].querySelector("blockquote")?.textContent).toContain(
      "The mill bell rang",
    );
    // Only resolved lead has player events; open one renders no empty list.
    expect(cards[0].querySelector("ul")).toBeNull();
    expect(cards[1].querySelector("ul")?.textContent).toContain(
      "The letter was delivered.",
    );
  });

  it("falls back to the open badge for an unknown status", () => {
    const odd = { ...heard, status: "mystery" };
    render(AdventureScenarioControls, {
      props: { manager: manager([odd], null) },
    });
    expect(
      screen.getByRole("list", { name: "Known situation details" }).textContent,
    ).toContain("Open");
  });
});
