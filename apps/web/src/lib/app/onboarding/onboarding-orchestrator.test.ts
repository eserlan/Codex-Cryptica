import { describe, it, expect } from "vitest";
import {
  decideFirstRunAction,
  hasUnseenMinorRelease,
  isOnboarded,
  type FirstRunState,
} from "./onboarding-orchestrator";

const base: FirstRunState = {
  isInitialized: true,
  isGuestMode: false,
  isDemoMode: false,
  isLandingVisible: false,
  vaultSwitcherOpen: false,
  hasDemoQueryParam: false,
  hasSeenTour: false,
  goalInvitationResolved: false,
  journeyActive: false,
  activeTour: false,
  anyModalOpen: false,
  hasUnseenRelease: false,
};

const onboarded = { hasSeenTour: true };

describe("isOnboarded", () => {
  it.each([
    [false, false, false],
    [true, false, true],
    [false, true, true],
    [true, true, true],
  ])(
    "tour seen %s, invitation resolved %s → %s",
    (hasSeenTour, goalInvitationResolved, expected) => {
      expect(isOnboarded({ hasSeenTour, goalInvitationResolved })).toBe(
        expected,
      );
    },
  );
});

describe("decideFirstRunAction", () => {
  it("does nothing before the vault is initialized", () => {
    expect(decideFirstRunAction({ ...base, isInitialized: false })).toEqual({
      kind: "none",
    });
  });

  it.each([
    ["guest mode", { isGuestMode: true }],
    ["demo mode", { isDemoMode: true }],
    ["landing visible", { isLandingVisible: true }],
    ["demo query param", { hasDemoQueryParam: true }],
    ["vault switcher open", { vaultSwitcherOpen: true }],
  ])("does nothing during %s", (_label, patch) => {
    expect(decideFirstRunAction({ ...base, ...patch })).toEqual({
      kind: "none",
    });
  });

  it("offers the goal invitation to a user who is not onboarded, never the tour", () => {
    expect(decideFirstRunAction(base)).toEqual({ kind: "goal-invitation" });
  });

  it("offers the invitation whatever the vault holds (empty, converted demo, imported)", () => {
    // The state carries no entity count at all (clarification Q2).
    expect("entityCount" in base).toBe(false);
    expect(decideFirstRunAction({ ...base, isDemoMode: false })).toEqual({
      kind: "goal-invitation",
    });
  });

  it("never offers the invitation to a user who finished the old tour", () => {
    expect(decideFirstRunAction({ ...base, ...onboarded })).toEqual({
      kind: "none",
    });
  });

  it("never offers it again once answered, explored or closed", () => {
    expect(
      decideFirstRunAction({ ...base, goalInvitationResolved: true }),
    ).toEqual({ kind: "none" });
  });

  it.each([
    ["a tour is running", { activeTour: true }],
    ["a modal is open", { anyModalOpen: true }],
    ["a journey is running", { journeyActive: true }],
  ])("waits while %s", (_label, patch) => {
    expect(decideFirstRunAction({ ...base, ...patch })).toEqual({
      kind: "none",
    });
  });

  it("shows the changelog for a returning user with an unseen release", () => {
    expect(
      decideFirstRunAction({ ...base, ...onboarded, hasUnseenRelease: true }),
    ).toEqual({ kind: "changelog" });
  });

  it("shows the changelog to a user onboarded through the invitation", () => {
    expect(
      decideFirstRunAction({
        ...base,
        goalInvitationResolved: true,
        hasUnseenRelease: true,
      }),
    ).toEqual({ kind: "changelog" });
  });

  it.each([
    ["a tour is active", { activeTour: true }],
    ["a modal is open", { anyModalOpen: true }],
    ["a journey is running", { journeyActive: true }],
  ])("holds the changelog while %s", (_label, patch) => {
    expect(
      decideFirstRunAction({
        ...base,
        ...onboarded,
        hasUnseenRelease: true,
        ...patch,
      }),
    ).toEqual({ kind: "none" });
  });

  it("does nothing for a returning user with no unseen release", () => {
    expect(decideFirstRunAction({ ...base, ...onboarded })).toEqual({
      kind: "none",
    });
  });
});

describe("hasUnseenMinorRelease", () => {
  it("returns false for a brand-new user (no last-seen version)", () => {
    expect(hasUnseenMinorRelease(null, ["0.28.0"])).toBe(false);
    expect(hasUnseenMinorRelease("", ["0.28.0"])).toBe(false);
  });

  it("detects a newer minor release", () => {
    expect(hasUnseenMinorRelease("0.27.3", ["0.28.0", "0.27.1"])).toBe(true);
  });

  it("returns false when all releases are same or older minor", () => {
    expect(hasUnseenMinorRelease("0.28.1", ["0.28.0", "0.27.5"])).toBe(false);
  });
});
