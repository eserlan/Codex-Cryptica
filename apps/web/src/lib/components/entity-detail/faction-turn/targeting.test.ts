import { describe, expect, it } from "vitest";
import { canTargetWithFactionTurn } from "./targeting";

describe("canTargetWithFactionTurn", () => {
  it("keeps actionable world entities available as faction-turn targets", () => {
    expect(
      canTargetWithFactionTurn("acting-faction", {
        id: "rival",
        type: "faction",
      }),
    ).toBe(true);
    expect(
      canTargetWithFactionTurn("acting-faction", {
        id: "outpost",
        type: "location",
      }),
    ).toBe(true);
    expect(
      canTargetWithFactionTurn("acting-faction", {
        id: "contact",
        type: "character",
      }),
    ).toBe(true);
  });

  it("excludes the acting faction, events, and notes", () => {
    expect(
      canTargetWithFactionTurn("acting-faction", {
        id: "acting-faction",
        type: "faction",
      }),
    ).toBe(false);
    expect(
      canTargetWithFactionTurn("acting-faction", {
        id: "festival",
        type: "event",
      }),
    ).toBe(false);
    expect(
      canTargetWithFactionTurn("acting-faction", { id: "rumor", type: "note" }),
    ).toBe(false);
  });
});
