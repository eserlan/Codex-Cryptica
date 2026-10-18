import { describe, expect, it } from "vitest";
import {
  frontPageShowing,
  tipContextFrom,
  type TipSources,
} from "./tips-context";

const SOURCES: TipSources = {
  chosenGoal: "world",
  goalInvitation: "goal",
  setupEnded: true,
  area: "map",
  generatorsOffered: true,
  typing: false,
  anyModalOpen: false,
  zenMode: false,
  tourActive: false,
  firstRunGuidanceActive: false,
  cifPanelOpen: false,
  cifPopoutConnected: false,
  vaultInitialized: true,
  skipWelcomeScreen: true,
  worldPageDismissed: true,
  entitySelected: false,
};

describe("tipContextFrom (spec 176, FR-013, FR-014)", () => {
  it("passes the goal, setup state and screen straight through", () => {
    const c = tipContextFrom(SOURCES);
    expect(c.goal).toBe("world");
    expect(c.goalInvitation).toBe("goal");
    expect(c.setupEnded).toBe(true);
    expect(c.area).toBe("map");
    expect(c.unavailableAreas).toEqual([]);
  });

  it("marks generators unavailable when they are not offered, e.g. a guest vault", () => {
    const c = tipContextFrom({ ...SOURCES, generatorsOffered: false });
    expect(c.unavailableAreas).toEqual(["generators"]);
  });

  it("maps each live state to its blocker", () => {
    const c = tipContextFrom({
      ...SOURCES,
      typing: true,
      anyModalOpen: true,
      tourActive: true,
      firstRunGuidanceActive: true,
      cifPanelOpen: true,
      area: "graph",
      worldPageDismissed: false,
    });
    expect(c.blockers).toEqual({
      typing: true,
      dialogOpen: true,
      tourActive: true,
      journeyOrInvitationActive: true,
      cifOpen: true,
      firstRunPage: true,
    });
  });

  it("reports no blockers when nothing is in the way", () => {
    const c = tipContextFrom(SOURCES);
    expect(Object.values(c.blockers).every((v) => v === false)).toBe(true);
  });

  it("counts zen mode as a dialog and the Cif pop-out as Cif open", () => {
    const c = tipContextFrom({
      ...SOURCES,
      zenMode: true,
      cifPopoutConnected: true,
    });
    expect(c.blockers.dialogOpen).toBe(true);
    expect(c.blockers.cifOpen).toBe(true);
  });
});

describe("frontPageShowing (spec 176, FR-014)", () => {
  const onGraph: TipSources = {
    ...SOURCES,
    area: "graph",
    worldPageDismissed: false,
  };

  it("is true on the graph while the world page has not been dismissed", () => {
    expect(frontPageShowing(onGraph)).toBe(true);
  });

  it("is false once the person enters their world (negative case)", () => {
    expect(frontPageShowing({ ...onGraph, worldPageDismissed: true })).toBe(
      false,
    );
  });

  it("is false on other screens, before the vault is ready, or with an entry open", () => {
    expect(frontPageShowing({ ...onGraph, area: "tables" })).toBe(false);
    expect(frontPageShowing({ ...onGraph, vaultInitialized: false })).toBe(
      false,
    );
    expect(frontPageShowing({ ...onGraph, skipWelcomeScreen: false })).toBe(
      false,
    );
    expect(frontPageShowing({ ...onGraph, entitySelected: true })).toBe(false);
  });
});
