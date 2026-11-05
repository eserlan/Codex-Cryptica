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
  soloThreads: {
    threads: [] as unknown[],
    open: [] as unknown[],
    closed: [] as unknown[],
    editable: true,
  },
}));
vi.mock("#lib/stores/solo-session-instance.js", () => instance);
const adventures = vi.hoisted(() => ({
  list: vi.fn(),
  setRootResolver: vi.fn(),
}));
vi.mock("#lib/services/adventure/adventure-session-repository.js", () => ({
  adventureSessionRepository: adventures,
}));

const configure = vi.hoisted(() => ({ configureAdventureRepository: vi.fn() }));
vi.mock(
  "#lib/services/adventure/configure-adventure-repository.js",
  () => configure,
);

import PlayPage from "./PlayPage.svelte";
import { discoveryPolicyStore } from "#lib/stores/ui/discovery-policy.svelte.js";
import { sessionModeStore } from "#lib/stores/ui/session-mode.svelte.js";
import { vault } from "#lib/stores/vault.svelte.js";

beforeEach(() => {
  instance.soloSessionStore.isActive = false;
  instance.soloSessionStore.session = null;
  instance.soloSessionStore.resume.mockReset();
  instance.soloPlayGuard.soloStartBlockedReason.mockReturnValue(null);
  discoveryPolicyStore.aiDisabled = false;
  sessionModeStore.isGuestMode = false;
  vi.spyOn(vault, "activeVaultId", "get").mockReturnValue("vault-1");
  vi.spyOn(vault, "isInitialized", "get").mockReturnValue(true);
  adventures.list.mockReset();
  adventures.list.mockResolvedValue({ effectiveActiveId: null, entries: [] });
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

  it("keeps Threads reachable with no session running", () => {
    render(PlayPage);
    expect(screen.getByTestId("solo-threads-menu")).toBeTruthy();
  });

  it("hides Threads in guest mode, which has no vault to keep them in", () => {
    sessionModeStore.isGuestMode = true;
    render(PlayPage);
    expect(screen.queryByTestId("solo-threads-menu")).toBeNull();
  });

  describe("with an Oracle adventure already in progress", () => {
    const entry = (over: Record<string, unknown> = {}) => ({
      id: "adv-1",
      title: "Rumour 2: Nella",
      status: "active",
      updatedAt: "2026-11-05T10:00:00.000Z",
      loadCondition: "normal",
      ...over,
    });

    it("offers to resume it instead of presenting Adventure Mode as a fresh start", async () => {
      adventures.list.mockResolvedValue({
        effectiveActiveId: "adv-1",
        entries: [entry()],
      });
      render(PlayPage);
      const link = await screen.findByText("Resume your adventure");
      expect(link).toBeTruthy();
      const card = screen.getByTestId("play-adventure-mode");
      expect(card.textContent).toContain("Rumour 2: Nella");
      expect(card.textContent).not.toContain("Let the Oracle run the game");
      expect(card.getAttribute("href")).toMatch(/\/adventure$/);
      // The repository must be pointed at the open Vault before it is read.
      expect(configure.configureAdventureRepository).toHaveBeenCalled();
    });

    it("keeps the normal Adventure Mode card when the only adventure is archived", async () => {
      adventures.list.mockResolvedValue({
        effectiveActiveId: null,
        entries: [entry({ status: "archived" })],
      });
      render(PlayPage);
      await vi.waitFor(() => expect(adventures.list).toHaveBeenCalled());
      expect(screen.getByText("Let the Oracle run the game")).toBeTruthy();
      expect(screen.queryByText("Resume your adventure")).toBeNull();
    });

    it("falls back to the normal card when the lookup fails", async () => {
      adventures.list.mockRejectedValue(new Error("opfs unavailable"));
      render(PlayPage);
      await vi.waitFor(() => expect(adventures.list).toHaveBeenCalled());
      expect(screen.getByText("Let the Oracle run the game")).toBeTruthy();
    });

    it("falls back to the normal card when the vault storage is not open", async () => {
      configure.configureAdventureRepository.mockImplementationOnce(() => {
        throw new Error("vault-not-open");
      });
      render(PlayPage);
      await vi.waitFor(() =>
        expect(configure.configureAdventureRepository).toHaveBeenCalled(),
      );
      expect(adventures.list).not.toHaveBeenCalled();
      expect(screen.getByText("Let the Oracle run the game")).toBeTruthy();
    });

    it("waits for the Vault to finish loading before looking anything up", () => {
      vi.spyOn(vault, "isInitialized", "get").mockReturnValue(false);
      render(PlayPage);
      expect(adventures.list).not.toHaveBeenCalled();
      expect(screen.getByText("Let the Oracle run the game")).toBeTruthy();
    });

    it("does not look anything up when AI is off or in guest mode", () => {
      discoveryPolicyStore.aiDisabled = true;
      const { unmount } = render(PlayPage);
      unmount();
      discoveryPolicyStore.aiDisabled = false;
      sessionModeStore.isGuestMode = true;
      render(PlayPage);
      expect(adventures.list).not.toHaveBeenCalled();
    });
  });
});
