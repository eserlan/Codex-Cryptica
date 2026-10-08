/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const instance = vi.hoisted(() => ({
  soloSessionStore: {
    isActive: false,
    session: null as null | { mapId: string | null },
    resume: vi.fn(),
    start: vi.fn(),
    defaultMapId: () => null,
  },
  soloPlayGuard: { soloStartBlockedReason: vi.fn(() => null as string | null) },
}));
vi.mock("$lib/stores/solo-session-instance", () => instance);

import PlayPage from "./PlayPage.svelte";
import { discoveryPolicyStore } from "$lib/stores/ui/discovery-policy.svelte";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";

beforeEach(() => {
  instance.soloSessionStore.isActive = false;
  instance.soloSessionStore.session = null;
  instance.soloSessionStore.resume.mockReset();
  instance.soloPlayGuard.soloStartBlockedReason.mockReturnValue(null);
  discoveryPolicyStore.aiDisabled = false;
  sessionModeStore.isGuestMode = false;
});

describe("PlayPage", () => {
  it("offers Start Solo Session as the main action when no session is running", () => {
    render(PlayPage);
    const start = screen.getByTestId("play-start-solo");
    expect(start.textContent).toMatch(/Start Solo Session/);
    expect(screen.queryByTestId("play-resume-solo")).toBeNull();
  });

  it("offers Adventure Mode below it as the optional choice, when AI is on", () => {
    render(PlayPage);
    const adventure = screen.getByTestId("play-adventure-mode");
    expect(adventure.getAttribute("href")).toMatch(/\/adventure$/);
    expect(adventure.textContent).toMatch(/Let the Oracle run the game/);
  });

  it("hides Adventure Mode when AI is turned off", () => {
    discoveryPolicyStore.aiDisabled = true;
    render(PlayPage);
    expect(screen.queryByTestId("play-adventure-mode")).toBeNull();
    expect(screen.getByTestId("play-start-solo")).toBeTruthy();
  });

  it("shows Resume Solo Session in place of Start while a session is running", () => {
    instance.soloSessionStore.isActive = true;
    instance.soloSessionStore.session = { mapId: "m1" };
    render(PlayPage);
    expect(screen.getByTestId("play-resume-solo").textContent).toMatch(
      /Resume Solo Session/,
    );
    expect(screen.queryByTestId("play-start-solo")).toBeNull();
  });

  it("resumes the session when Resume is pressed", async () => {
    instance.soloSessionStore.isActive = true;
    instance.soloSessionStore.session = { mapId: "m1" };
    render(PlayPage);
    await fireEvent.click(screen.getByTestId("play-resume-solo"));
    expect(instance.soloSessionStore.resume).toHaveBeenCalledTimes(1);
  });

  it("shows the blocking note and disables Start while shared play is on", () => {
    instance.soloPlayGuard.soloStartBlockedReason.mockReturnValue(
      "End shared play to start a solo session.",
    );
    render(PlayPage);
    const start = screen.getByTestId("play-start-solo") as HTMLButtonElement;
    expect(start.disabled).toBe(true);
    expect(
      screen.getByText(/End shared play to start a solo session/),
    ).toBeTruthy();
  });

  it("explains that guests cannot use solo sessions and offers no Start", () => {
    sessionModeStore.isGuestMode = true;
    render(PlayPage);
    expect(screen.queryByTestId("play-start-solo")).toBeNull();
    expect(screen.getByText(/not available in guest/i)).toBeTruthy();
  });
});
