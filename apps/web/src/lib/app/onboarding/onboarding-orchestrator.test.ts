import { describe, it, expect } from "vitest";
import {
  decideFirstRunAction,
  hasUnseenMinorRelease,
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
  entityCount: 3,
  activeTour: false,
  anyModalOpen: false,
  hasUnseenRelease: false,
};

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

  it("starts the tour for an onboarding user with a populated vault", () => {
    expect(
      decideFirstRunAction({ ...base, hasSeenTour: false, entityCount: 5 }),
    ).toEqual({ kind: "tour" });
  });

  it("runs the guided empty flow for an onboarding user with 0 entities (no demo hijack)", () => {
    expect(
      decideFirstRunAction({ ...base, hasSeenTour: false, entityCount: 0 }),
    ).toEqual({ kind: "guided-empty" });
  });

  it("does not restart a tour that is already running (no reset loop)", () => {
    expect(
      decideFirstRunAction({
        ...base,
        hasSeenTour: false,
        entityCount: 5,
        activeTour: true,
      }),
    ).toEqual({ kind: "none" });
  });

  it("does not launch the first-run tour over an open modal", () => {
    expect(
      decideFirstRunAction({
        ...base,
        hasSeenTour: false,
        entityCount: 0,
        anyModalOpen: true,
      }),
    ).toEqual({ kind: "none" });
  });

  it("shows the changelog for a returning user with an unseen release", () => {
    expect(
      decideFirstRunAction({
        ...base,
        hasSeenTour: true,
        hasUnseenRelease: true,
      }),
    ).toEqual({ kind: "changelog" });
  });

  it("suppresses the changelog while a tour is active", () => {
    expect(
      decideFirstRunAction({
        ...base,
        hasSeenTour: true,
        hasUnseenRelease: true,
        activeTour: true,
      }),
    ).toEqual({ kind: "none" });
  });

  it("suppresses the changelog while a modal is open", () => {
    expect(
      decideFirstRunAction({
        ...base,
        hasSeenTour: true,
        hasUnseenRelease: true,
        anyModalOpen: true,
      }),
    ).toEqual({ kind: "none" });
  });

  it("does nothing for a returning user with no unseen release", () => {
    expect(decideFirstRunAction({ ...base, hasSeenTour: true })).toEqual({
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
