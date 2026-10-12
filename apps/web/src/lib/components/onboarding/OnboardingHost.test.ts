/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { flushSync, tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  helpStore: {
    activeTour: null as unknown,
    hasSeen: vi.fn(() => false),
    startTour: vi.fn(),
    skipTour: vi.fn(),
  },
  vault: { isInitialized: true, activeVaultId: "v1" as string | null },
  session: { isGuestMode: false, isDemoMode: false },
  modal: {
    isAnyModalOpen: false,
    showZenMode: false,
    showVaultSwitcher: false,
  },
  milestones: { start: vi.fn(() => () => {}) },
}));

vi.mock("$app/environment", () => ({ browser: true }));
vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/") },
}));
vi.mock("$lib/content/changelog/releases.json", () => ({
  default: [{ version: "0.9.0" }],
}));
vi.mock("$lib/stores/help.svelte", async () => {
  const { reactiveHelp } = await import("./test-help-store.svelte");
  return {
    helpStore: new Proxy(h.helpStore, {
      get(target, key) {
        if (key === "activeTour") return reactiveHelp.activeTour;
        return Reflect.get(target, key);
      },
      set(target, key, value) {
        if (key === "activeTour") reactiveHelp.activeTour = value;
        else Reflect.set(target, key, value);
        return true;
      },
    }),
  };
});
vi.mock("$lib/stores/vault.svelte", () => ({ vault: h.vault }));
vi.mock("$lib/stores/ui/session-mode.svelte", () => ({
  sessionModeStore: h.session,
}));
vi.mock("$lib/stores/ui/modal-ui.svelte", () => ({ modalUIStore: h.modal }));
vi.mock("$lib/stores/help-assistant/help-runtime", () => ({
  helpContext: { current: { area: "other" } },
}));
vi.mock("$lib/services/help-assistant/help-highlight.svelte", () => ({
  helpHighlight: { current: null },
}));
vi.mock("$lib/services/help-assistant/help-availability", () => ({
  isHelpAssistantAvailable: () => false,
}));
vi.mock("$lib/app/onboarding/journey/journey-milestones-runtime", () => ({
  journeyMilestones: h.milestones,
}));
vi.mock("$lib/app/onboarding/journey/journey-runtime", async () => {
  const { JourneyStore } =
    await import("$lib/app/onboarding/journey/journey-store.svelte");
  const memory = () => {
    const data = new Map<string, string>();
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    };
  };
  return {
    journeyStore: new JourneyStore({
      storage: memory(),
      sessionStorage: memory(),
      clock: { now: () => 1 },
      area: () => "other",
      runGuide: async () => true,
      categoryIds: () => ["character", "location", "note"],
      askCifAvailable: () => false,
      askCif: () => {},
      tour: h.helpStore,
    }),
  };
});

import OnboardingHost from "./OnboardingHost.svelte";
import { onboardingStore } from "$lib/stores/ui/onboarding.svelte";
import { reactiveHelp } from "./test-help-store.svelte";
import { journeyStore } from "$lib/app/onboarding/journey/journey-runtime";

describe("OnboardingHost", () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    h.helpStore.hasSeen.mockReturnValue(false);
    reactiveHelp.activeTour = null;
    h.helpStore.startTour.mockClear();
    h.modal.isAnyModalOpen = false;
    h.session.isDemoMode = false;
    onboardingStore.goalInvitation = null;
    onboardingStore.chosenGoal = null;
    onboardingStore.lastSeenVersion = null;
    onboardingStore.showChangelog = false;
    onboardingStore.dismissedLandingPage = true;
    onboardingStore.firstRunGuidanceActive = false;
    journeyStore.exit();
    journeyStore.done();
  });

  it("shows the goal invitation instead of starting the tour", async () => {
    render(OnboardingHost);
    await tick();
    expect(screen.getByTestId("goal-invitation")).toBeTruthy();
    expect(h.helpStore.startTour).not.toHaveBeenCalled();
    expect(onboardingStore.firstRunGuidanceActive).toBe(true);
  });

  it("does not show it to a user who already took the tour, or in a demo", async () => {
    h.helpStore.hasSeen.mockReturnValue(true);
    const first = render(OnboardingHost);
    await tick();
    expect(screen.queryByTestId("goal-invitation")).toBeNull();
    first.unmount();

    h.helpStore.hasSeen.mockReturnValue(false);
    h.session.isDemoMode = true;
    render(OnboardingHost);
    await tick();
    expect(screen.queryByTestId("goal-invitation")).toBeNull();
  });

  it("closing records the dismissal and frees other prompts", async () => {
    render(OnboardingHost);
    await tick();
    await fireEvent.click(screen.getByTestId("goal-invitation-close"));
    expect(onboardingStore.goalInvitation).toBe("dismissed");
    expect(screen.queryByTestId("goal-invitation")).toBeNull();
    flushSync();
    expect(onboardingStore.firstRunGuidanceActive).toBe(false);
    expect(h.helpStore.startTour).not.toHaveBeenCalled();
  });

  it("choosing a goal starts its journey card and remembers the goal", async () => {
    render(OnboardingHost);
    await tick();
    await fireEvent.click(screen.getByTestId("goal-invitation-world"));
    expect(onboardingStore.goalInvitation).toBe("goal");
    expect(onboardingStore.chosenGoal).toBe("world");
    expect(screen.getByTestId("journey-card")).toBeTruthy();
    expect(screen.queryByTestId("goal-invitation")).toBeNull();
    flushSync();
    expect(onboardingStore.firstRunGuidanceActive).toBe(true);
  });

  it("explore offers the tour, which starts only on tap", async () => {
    render(OnboardingHost);
    await tick();
    await fireEvent.click(screen.getByTestId("goal-invitation-explore"));
    expect(onboardingStore.goalInvitation).toBe("explore");
    expect(h.helpStore.startTour).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByTestId("goal-invitation-tour"));
    expect(h.helpStore.startTour).toHaveBeenCalledWith("initial-onboarding");
    expect(screen.queryByTestId("goal-invitation")).toBeNull();
  });

  it("waits while a modal is open", async () => {
    h.modal.isAnyModalOpen = true;
    render(OnboardingHost);
    await tick();
    expect(screen.queryByTestId("goal-invitation")).toBeNull();
  });

  it("listens for milestones while mounted", () => {
    render(OnboardingHost);
    expect(h.milestones.start).toHaveBeenCalled();
  });

  it("shows the changelog to an onboarded user with an unseen release", async () => {
    vi.useFakeTimers();
    h.helpStore.hasSeen.mockReturnValue(true);
    onboardingStore.lastSeenVersion = "0.1.0";
    render(OnboardingHost);
    await vi.advanceTimersByTimeAsync(2100);
    expect(onboardingStore.showChangelog).toBe(true);
  });

  it("steps aside when a tour starts, so the two never show together", async () => {
    render(OnboardingHost);
    await tick();
    expect(screen.getByTestId("goal-invitation")).toBeTruthy();
    reactiveHelp.activeTour = { id: "initial-onboarding" };
    await tick();
    flushSync();
    await tick();
    expect(screen.queryByTestId("goal-invitation")).toBeNull();
    expect(onboardingStore.goalInvitation).toBeNull();
  });
});
