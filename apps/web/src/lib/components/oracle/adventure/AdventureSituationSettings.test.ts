/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureSituationSettings from "./AdventureSituationSettings.svelte";

function manager(
  items: unknown[],
  extra: Record<string, unknown> = {},
  pendingRoll: unknown = null,
) {
  return {
    session: {
      scenarioCollection: { items, focusedScenarioId: null },
      pendingRoll,
    },
    readOnly: false,
    setScenarioStatus: vi.fn(async () => {}),
    ...extra,
  } as any;
}

const lead = (id: string, status: string, knowledge = "heard") => ({
  id,
  knowledge,
  status,
  playerVisible: { rumour: `Rumour ${id}`, lead: `Lead ${id}` },
  events: [],
});

describe("AdventureSituationSettings", () => {
  it("offers conclude and leave-behind for open leads and reopen for closed ones", async () => {
    const m = manager([
      lead("a", "open"),
      lead("b", "resolved"),
      lead("c", "abandoned"),
      lead("hidden", "open", "unheard"),
    ]);
    render(AdventureSituationSettings, { props: { manager: m } });
    const section = screen.getByTestId("adventure-situation-settings");
    expect(section.textContent).not.toContain("Lead hidden");
    expect(section.querySelectorAll("li")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Reopen" })).toHaveLength(2);

    await fireEvent.click(
      screen.getByRole("button", { name: "Mark as concluded" }),
    );
    expect(m.setScenarioStatus).toHaveBeenLastCalledWith("a", "resolved");
    await fireEvent.click(
      screen.getByRole("button", { name: "Leave it behind" }),
    );
    expect(m.setScenarioStatus).toHaveBeenLastCalledWith("a", "abandoned");
    await fireEvent.click(screen.getAllByRole("button", { name: "Reopen" })[0]);
    expect(m.setScenarioStatus).toHaveBeenLastCalledWith("b", "open");
  });

  it("renders Look for local rumours when no lead has been heard yet, but no situation items", async () => {
    const onAction = vi.fn();
    const m = manager([lead("hidden", "open", "unheard")], {
      phase: "ready",
      submitAction: vi.fn(async () => {
        m.phase = "generating";
      }),
    });
    render(AdventureSituationSettings, {
      props: { manager: m, onAction },
    });
    const section = screen.getByTestId("adventure-situation-settings");
    expect(section.querySelectorAll("li")).toHaveLength(0);
    const lookBtn = screen.getByRole("button", {
      name: "Look for local rumours",
    });
    expect(lookBtn).toBeDefined();

    await fireEvent.click(lookBtn);
    expect(m.submitAction).toHaveBeenCalledWith(
      "Ask around for local rumours and news.",
    );
    expect(onAction).toHaveBeenCalled();
  });

  it("disables Look for local rumours when generating", () => {
    const m = manager([lead("hidden", "open", "unheard")], {
      phase: "generating",
    });
    render(AdventureSituationSettings, {
      props: { manager: m },
    });
    const lookBtn = screen.getByRole("button", {
      name: "Look for local rumours",
    }) as HTMLButtonElement;
    expect(lookBtn.disabled).toBe(true);
  });

  it("does not call onAction if submitAction did not transition to generating", async () => {
    const onAction = vi.fn();
    const m = manager([lead("hidden", "open", "unheard")], {
      phase: "ready",
      submitAction: vi.fn(async () => {}),
    });
    render(AdventureSituationSettings, {
      props: { manager: m, onAction },
    });
    const lookBtn = screen.getByRole("button", {
      name: "Look for local rumours",
    });
    await fireEvent.click(lookBtn);
    expect(onAction).not.toHaveBeenCalled();
  });

  it("renders nothing when there is no active session", () => {
    const { container } = render(AdventureSituationSettings, {
      props: { manager: { session: null, readOnly: false } as any },
    });
    expect(container.querySelector("section")).toBeNull();
  });

  it("disables every action while read-only or a roll is pending", () => {
    const readOnly = manager([lead("a", "open"), lead("b", "resolved")], {
      readOnly: true,
    });
    const { unmount } = render(AdventureSituationSettings, {
      props: { manager: readOnly },
    });
    for (const button of screen.getAllByRole("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    unmount();
    render(AdventureSituationSettings, {
      props: { manager: manager([lead("a", "open")], {}, { id: "roll" }) },
    });
    for (const button of screen.getAllByRole("button")) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it("shows fixed recovery copy, not the raw error, when a change fails", async () => {
    const m = manager([lead("a", "open")]);
    m.setScenarioStatus.mockRejectedValue(new Error("invalid-transition"));
    render(AdventureSituationSettings, { props: { manager: m } });
    await fireEvent.click(
      screen.getByRole("button", { name: "Mark as concluded" }),
    );
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("can no longer be changed");
    expect(alert.textContent).not.toContain("invalid-transition");
    // The button is usable again after the failure.
    expect(
      (
        screen.getByRole("button", {
          name: "Mark as concluded",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });

  it("ignores a second click while a change is in flight", async () => {
    let finish!: () => void;
    const m = manager([lead("a", "open")]);
    m.setScenarioStatus.mockReturnValue(
      new Promise<void>((resolve) => (finish = resolve)),
    );
    render(AdventureSituationSettings, { props: { manager: m } });
    const button = screen.getByRole("button", { name: "Mark as concluded" });
    await fireEvent.click(button);
    await fireEvent.click(button);
    expect(m.setScenarioStatus).toHaveBeenCalledTimes(1);
    finish();
  });

  it("displays elapsed fictional time and offline advancement guidance when world time has advanced", () => {
    const m = manager([lead("a", "open")]);
    m.session.worldTime = {
      version: 1,
      elapsedMinutes: 5760,
      events: [],
    };
    render(AdventureSituationSettings, { props: { manager: m } });
    const elapsedTime = screen.getByTestId("adventure-elapsed-time");
    expect(elapsedTime.textContent).toContain("4d");
    expect(
      screen.getByTestId("adventure-situation-settings").textContent,
    ).toContain("Advances the local world clock deterministically offline");
  });
});
