/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => {
  const store = {
    tension: 5,
    session: { sceneName: "Arrival" } as { sceneName: string } | null,
    party: [] as { id: string; name: string }[],
    ask: vi.fn((question: string, likelihood: string) => ({
      question: question.trim(),
      likelihood,
      roll: 34,
      answer: "Yes, but",
      event: null as { text: string } | null,
    })),
    randomEvent: vi.fn(() => ({
      text: "A thread moves forward: reveal more about the keeper.",
    })),
    raiseTension: vi.fn(),
    lowerTension: vi.fn(),
  };
  const layout = {
    leftSidebarOpen: false,
    activeSidebarTool: "none" as string,
  };
  const oracleUi = { setPendingPrompt: vi.fn() };
  const policy = { aiDisabled: false };
  return { store, layout, oracleUi, policy };
});

vi.mock("$lib/stores/solo-session-instance", () => ({
  soloSessionStore: env.store,
}));
vi.mock("$lib/stores/ui/layout-ui.svelte", () => ({
  layoutUIStore: env.layout,
}));
vi.mock("$lib/stores/oracle.svelte", () => ({ oracle: { ui: env.oracleUi } }));
vi.mock("$lib/stores/ui/discovery-policy.svelte", () => ({
  discoveryPolicyStore: env.policy,
}));

import SoloYesNoMenu from "./SoloYesNoMenu.svelte";

async function openMenu() {
  await fireEvent.click(screen.getByTestId("solo-yes-no-menu"));
}

beforeEach(() => {
  env.store.tension = 5;
  env.store.ask.mockClear();
  env.store.randomEvent.mockClear();
  env.store.raiseTension.mockClear();
  env.store.lowerTension.mockClear();
  env.oracleUi.setPendingPrompt.mockClear();
  env.layout.leftSidebarOpen = false;
  env.layout.activeSidebarTool = "none";
  env.policy.aiDisabled = false;
});

describe("SoloYesNoMenu", () => {
  it("limits the question to 200 characters and shows how many are left", async () => {
    render(SoloYesNoMenu);
    await openMenu();
    const field = screen.getByTestId(
      "solo-yes-no-question",
    ) as HTMLInputElement;
    expect(field.maxLength).toBe(200);
    expect(screen.getByTestId("solo-yes-no-remaining").textContent).toContain(
      "200 characters left",
    );
    await fireEvent.input(field, { target: { value: "Is the guard asleep?" } });
    expect(screen.getByTestId("solo-yes-no-remaining").textContent).toContain(
      "180 characters left",
    );
  });

  it("defaults the likelihood to even, and asks with the chosen one", async () => {
    render(SoloYesNoMenu);
    await openMenu();
    const even = screen.getByRole("radio", {
      name: "Even",
    }) as HTMLInputElement;
    expect(even.checked).toBe(true);
    await fireEvent.click(screen.getByRole("radio", { name: "Very likely" }));
    await fireEvent.click(screen.getByTestId("solo-yes-no-roll"));
    expect(env.store.ask).toHaveBeenCalledWith("", "very_likely");
  });

  it("shows the answer with its roll after Roll", async () => {
    render(SoloYesNoMenu);
    await openMenu();
    await fireEvent.click(screen.getByTestId("solo-yes-no-roll"));
    expect(screen.getByTestId("solo-yes-no-answer").textContent).toContain(
      "Yes, but",
    );
    expect(screen.getByTestId("solo-yes-no-answer").textContent).toContain(
      "roll 34",
    );
  });

  it("shows a message and no answer when asking fails", async () => {
    env.store.ask.mockImplementationOnce(() => {
      throw new Error("storage");
    });
    render(SoloYesNoMenu);
    await openMenu();
    await fireEvent.click(screen.getByTestId("solo-yes-no-roll"));
    expect(screen.getByRole("alert").textContent).toContain("could not answer");
    expect(screen.queryByTestId("solo-yes-no-answer")).toBeNull();
  });

  it("shows a random event when one is asked for", async () => {
    render(SoloYesNoMenu);
    await openMenu();
    await fireEvent.click(screen.getByTestId("solo-random-event"));
    expect(screen.getByTestId("solo-yes-no-event").textContent).toContain(
      "reveal more about",
    );
  });

  it("disables tension at its bounds and changes it through the store", async () => {
    env.store.tension = 1;
    render(SoloYesNoMenu);
    await openMenu();
    expect(
      (
        screen.getByRole("button", {
          name: "Lower tension",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await fireEvent.click(
      screen.getByRole("button", { name: "Raise tension" }),
    );
    expect(env.store.raiseTension).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("solo-tension-value").textContent).toContain(
      "1 of 9",
    );
  });

  it("offers Interpret only while AI is on, and prefills the Oracle without sending", async () => {
    render(SoloYesNoMenu);
    await openMenu();
    await fireEvent.click(screen.getByTestId("solo-yes-no-roll"));
    await fireEvent.click(screen.getByTestId("solo-yes-no-interpret"));
    expect(env.oracleUi.setPendingPrompt).toHaveBeenCalledWith(
      expect.stringContaining("Yes, but"),
    );
    expect(env.layout.activeSidebarTool).toBe("oracle");
    expect(env.layout.leftSidebarOpen).toBe(true);
  });

  it("hides Interpret when AI is off", async () => {
    env.policy.aiDisabled = true;
    render(SoloYesNoMenu);
    await openMenu();
    await fireEvent.click(screen.getByTestId("solo-yes-no-roll"));
    await waitFor(() =>
      expect(screen.getByTestId("solo-yes-no-answer")).toBeTruthy(),
    );
    expect(screen.queryByTestId("solo-yes-no-interpret")).toBeNull();
  });
});
