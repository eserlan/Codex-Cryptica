import { describe, expect, it } from "vitest";
import { tipContextFrom, type TipSources } from "./tips-context";

const SOURCES: TipSources = {
  chosenGoal: "world",
  goalInvitation: "goal",
  setupEnded: true,
  area: "map",
  generatorsOffered: true,
  typing: false,
  modalOpen: false,
  tourActive: false,
  firstRunGuidanceActive: false,
  cifOpen: false,
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
      modalOpen: true,
      tourActive: true,
      firstRunGuidanceActive: true,
      cifOpen: true,
    });
    expect(c.blockers).toEqual({
      typing: true,
      dialogOpen: true,
      tourActive: true,
      journeyOrInvitationActive: true,
      cifOpen: true,
    });
  });

  it("reports no blockers when nothing is in the way", () => {
    const c = tipContextFrom(SOURCES);
    expect(Object.values(c.blockers).every((v) => v === false)).toBe(true);
  });
});
