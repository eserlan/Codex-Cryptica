import { describe, expect, it } from "vitest";
import { allocateId, existingIds } from "../src/reducer-ids";
import { session, scenario } from "./reducer-fixtures";

describe("reducer ID allocation", () => {
  it("reserves identities from state and scenario bindings", () => {
    const current = session();
    const item = scenario();
    item.events.push({
      id: "event-1",
      kind: "consequence",
      visibility: "gm",
      text: "Private",
      at: current.createdAt,
    });
    item.secretBindings.eventIds = { "event-1": "event-secret-1" };
    current.scenarioCollection = {
      version: 1,
      items: [item],
      focusedScenarioId: null,
    };
    current.visibleState.location = {
      id: "location-1",
      text: "Road",
      source: "provisional",
    };
    current.visibleState.situation = {
      id: "situation-1",
      text: "Quiet",
      source: "provisional",
    };
    expect(existingIds(current)).toEqual(
      new Set([
        "session-1",
        "location-1",
        "situation-1",
        "scenario-1",
        "event-1",
        "truth-1",
        "investigated-1",
        "event-secret-1",
      ]),
    );
    expect(existingIds(session())).toEqual(new Set(["session-1"]));
  });

  it("retries blanks and collisions, reserving accepted IDs verbatim", () => {
    const ids = new Set(["taken"]);
    const values = [" ", "taken", " new "];
    expect(allocateId(ids, () => values.shift()!)).toBe(" new ");
    expect(ids.has(" new ")).toBe(true);
    let attempts = 0;
    expect(
      allocateId(ids, () => {
        attempts++;
        return "taken";
      }),
    ).toBeNull();
    expect(attempts).toBe(10);
  });
});
