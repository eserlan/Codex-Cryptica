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
    recordScenarioTheory: vi.fn(async () => {}),
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

  it("lets players follow or unfollow a known lead without exposing hidden leads", async () => {
    const m = manager([heard, unheard], null);
    render(AdventureScenarioControls, { props: { manager: m } });
    await fireEvent.click(
      screen.getByRole("button", { name: "Follow The old mill" }),
    );
    expect(m.focusScenario).toHaveBeenCalledWith("known-1");
    expect(
      screen.queryByRole("button", { name: "Follow Secret lead" }),
    ).toBeNull();
  });

  it("can unfollow the currently focused lead", async () => {
    const m = manager([heard], "known-1");
    render(AdventureScenarioControls, { props: { manager: m } });
    const follow = screen.getByRole("button", {
      name: "Unfollow The old mill",
    });
    expect(follow.getAttribute("aria-pressed")).toBe("true");
    await fireEvent.click(follow);
    expect(m.focusScenario).toHaveBeenCalledWith(null);
  });

  it("labels player-known developments without exposing private events", () => {
    const item = {
      ...heard,
      events: [
        {
          id: "visible-1",
          kind: "discovery",
          visibility: "player",
          text: "Found the missing grain",
        },
        {
          id: "hidden-1",
          kind: "consequence",
          visibility: "gm",
          text: "The culprit is the priest",
        },
      ],
    };
    const m = manager([item], null);
    render(AdventureScenarioControls, { props: { manager: m } });
    const details = screen.getByRole("list", {
      name: "Known situation details",
    });
    expect(details.textContent).toContain("Observed");
    expect(details.textContent).toContain("Found the missing grain");
    expect(details.textContent).not.toContain("The culprit is the priest");
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

  it("distinguishes rumour, observed fact, consequence, and player conjecture across multiple leads", () => {
    const lead1 = {
      ...heard,
      id: "lead-1",
      playerVisible: { rumour: "A lost lantern", lead: "Lantern trail" },
      events: [
        {
          id: "obs-1",
          kind: "discovery",
          visibility: "player",
          text: "Found oil spill on the rocks",
        },
        {
          id: "theory-1",
          kind: "theory",
          visibility: "player",
          text: "Someone dropped it running away",
        },
      ],
    };
    const lead2 = {
      ...resolved,
      id: "lead-2",
      playerVisible: { rumour: "The bridge toll", lead: "Old toll bridge" },
      events: [
        {
          id: "cq-1",
          kind: "consequence",
          visibility: "player",
          text: "The bridge collapsed in the rain",
        },
      ],
    };
    const m = manager([lead1, lead2], "lead-1");
    render(AdventureScenarioControls, { props: { manager: m } });

    const details = screen.getByRole("list", {
      name: "Known situation details",
    });
    // Unverified rumour disclaimer
    expect(details.textContent).toContain("Reported rumour · not yet verified");
    // Distinction of labels
    expect(details.textContent).toContain(
      "Observed: Found oil spill on the rocks",
    );
    expect(details.textContent).toContain(
      "Conjecture: Someone dropped it running away",
    );
    expect(details.textContent).toContain(
      "Consequence: The bridge collapsed in the rain",
    );
  });

  it("submits a conjecture for an open heard lead", async () => {
    const m = manager([heard], null);
    render(AdventureScenarioControls, { props: { manager: m } });

    const input = screen.getByRole("textbox", {
      name: "Record conjecture for The old mill",
    });
    const saveButton = screen.getByRole("button", { name: "Save conjecture" });

    await fireEvent.input(input, {
      target: { value: "The miller fled to the mountains" },
    });
    await fireEvent.click(saveButton);

    expect(m.recordScenarioTheory).toHaveBeenCalledWith(
      "known-1",
      "The miller fled to the mountains",
    );
  });

  it("renders Vault entity badges and Solo Thread status, and allows saving to Solo Threads without duplicates", async () => {
    const { soloThreads } =
      await import("#lib/stores/solo-session-instance.js");
    const { vault } = await import("#lib/stores/vault.svelte.js");

    const entity1 = {
      id: "ent-1",
      title: "The Old Mill",
      visibility: "player" as const,
    };
    const entity2 = {
      id: "ent-2",
      title: "Hidden Cellar",
      visibility: "hidden" as const,
    };
    vi.spyOn(vault, "allEntities", "get").mockReturnValue([
      entity1,
      entity2,
    ] as any);
    vi.spyOn(soloThreads, "editable", "get").mockReturnValue(true);
    vi.spyOn(soloThreads, "threads", "get").mockReturnValue([]);

    const addSpy = vi.spyOn(soloThreads, "add").mockReturnValue({
      ok: true,
      thread: {
        id: "th-new",
        title: "The old mill",
        kind: "lead",
        status: "open",
        entityIds: [],
      },
    } as any);
    const linkSpy = vi
      .spyOn(soloThreads, "link")
      .mockReturnValue({ ok: true } as any);

    const itemWithAnchors = {
      ...heard,
      id: "known-anchors",
      playerVisible: { rumour: "The mill bell rang", lead: "The old mill" },
      anchorRefs: ["ent-1", "ent-2"],
    };

    const m = manager([itemWithAnchors], null);
    render(AdventureScenarioControls, { props: { manager: m } });

    // Renders player-visible entity badge, but NOT hidden entity
    expect(screen.getByText("The Old Mill")).toBeTruthy();
    expect(screen.queryByText("Hidden Cellar")).toBeNull();

    // Renders Save to Solo Threads button
    const saveThreadBtn = screen.getByRole("button", {
      name: "Save to Solo Threads",
    });
    await fireEvent.click(saveThreadBtn);

    expect(addSpy).toHaveBeenCalledWith({
      title: "The old mill",
      kind: "lead",
      note: "The mill bell rang",
    });
    // Links the player-visible entity
    expect(linkSpy).toHaveBeenCalledWith("th-new", "ent-1");
    // Does not link hidden entity
    expect(linkSpy).not.toHaveBeenCalledWith("th-new", "ent-2");
  });

  it("displays existing Solo Thread badge instead of save button and does not create duplicate", async () => {
    const { soloThreads } =
      await import("#lib/stores/solo-session-instance.js");
    const existingThread = {
      id: "th-existing",
      title: "The old mill",
      kind: "lead" as const,
      status: "open" as const,
      entityIds: [],
    };
    vi.spyOn(soloThreads, "threads", "get").mockReturnValue([
      existingThread,
    ] as any);
    const addSpy = vi.spyOn(soloThreads, "add");

    const m = manager([heard], null);
    render(AdventureScenarioControls, { props: { manager: m } });

    expect(screen.getByText("Solo Thread · Open")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Save to Solo Threads" }),
    ).toBeNull();
    expect(addSpy).not.toHaveBeenCalled();
  });
});
