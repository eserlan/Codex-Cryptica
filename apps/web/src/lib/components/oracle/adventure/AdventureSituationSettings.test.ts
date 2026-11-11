/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import AdventureSituationSettings from "./AdventureSituationSettings.svelte";

vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { notify: vi.fn() },
}));

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
      const isCopy = /Copy (Markdown|JSON)/.test(button.textContent ?? "");
      expect((button as HTMLButtonElement).disabled).toBe(!isCopy);
    }
    unmount();
    render(AdventureSituationSettings, {
      props: { manager: manager([lead("a", "open")], {}, { id: "roll" }) },
    });
    for (const button of screen.getAllByRole("button")) {
      const isCopy = /Copy (Markdown|JSON)/.test(button.textContent ?? "");
      expect((button as HTMLButtonElement).disabled).toBe(!isCopy);
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

  it("copies a full GM-only snapshot as Markdown or JSON from the tools panel", async () => {
    const writeText = vi.fn(async (_value: string) => {});
    const previous = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    try {
      const m = manager([lead("unheard-1", "open", "unheard")], {
        phase: "ready",
      });
      m.session = {
        id: "session-1",
        title: "Northbrook",
        status: "active",
        revision: 2,
        premise: "Explore a quiet town.",
        lastPlayedAt: "2026-11-11T10:00:00.000Z",
        playerCharacter: { kind: "provisional", name: "Mara" },
        sourceRecords: [],
        visibleState: {
          objectives: [],
          activeCharacters: [],
          knownFacts: [],
          relationships: [],
        },
        hiddenState: {
          secrets: [
            {
              id: "secret-1",
              text: "The reeve stole the grain",
              status: "hidden",
            },
          ],
          gmThreads: [],
        },
        scenarioCollection: {
          items: [
            {
              ...lead("unheard-1", "open", "unheard"),
              stage: "hearsay",
              gmOnly: { truth: "The reeve stole the grain" },
            },
          ],
          focusedScenarioId: null,
        },
        provisionalFacts: [],
        turns: [
          {
            id: "turn-1",
            sequence: 0,
            playerAction: "Buy a loaf of bread.",
            narration: "The baker counts your coins.",
            committedAt: "2026-11-11T10:00:00.000Z",
          },
        ],
        pendingRoll: null,
      };
      render(AdventureSituationSettings, { props: { manager: m } });
      expect(screen.getByTestId("adventure-review-copy").textContent).toContain(
        "GM-only",
      );
      await fireEvent.click(
        screen.getByRole("button", { name: "Copy Markdown" }),
      );
      expect(writeText).toHaveBeenCalledOnce();
      const markdown = writeText.mock.calls[0]![0];
      expect(markdown).toContain("Buy a loaf of bread.");
      expect(markdown).toContain("The reeve stole the grain");

      await fireEvent.click(screen.getByRole("button", { name: "Copy JSON" }));
      const json = writeText.mock.calls[1]![0];
      expect(JSON.parse(json).hiddenState.secrets[0].text).toBe(
        "The reeve stole the grain",
      );
      expect(JSON.parse(json).turns[0].playerAction).toBe(
        "Buy a loaf of bread.",
      );
    } finally {
      if (previous) {
        Object.defineProperty(navigator, "clipboard", previous);
      } else {
        Reflect.deleteProperty(navigator, "clipboard");
      }
    }
  });

  it("reports a fixed failure when clipboard permission is denied", async () => {
    const previous = Object.getOwnPropertyDescriptor(navigator, "clipboard");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("secret data")) },
    });
    try {
      render(AdventureSituationSettings, {
        props: { manager: manager([]) },
      });
      await fireEvent.click(screen.getByRole("button", { name: "Copy JSON" }));
      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain("Check clipboard permissions");
      expect(alert.textContent).not.toContain("secret data");
    } finally {
      if (previous) {
        Object.defineProperty(navigator, "clipboard", previous);
      } else {
        Reflect.deleteProperty(navigator, "clipboard");
      }
    }
  });
});
