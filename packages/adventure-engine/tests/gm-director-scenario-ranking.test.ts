import { describe, expect, it } from "vitest";
import { rankOpenHeardScenarios } from "../src/gm-director-scenario-ranking";
import { directorTurn, heardScenario } from "./gm-director-fixtures";
import { now, session } from "./reducer-fixtures";

describe("director scenario ranking", () => {
  it("prefers player pursuit to unrelated focus and retains other IDs in order", () => {
    const bell = heardScenario();
    const mill = heardScenario("mill", {
      playerVisible: { rumour: "Crates are missing", lead: "The mill" },
    });
    const s = session();
    s.scenarioCollection = {
      version: 1,
      items: [bell, mill],
      focusedScenarioId: mill.id,
    };
    const result = rankOpenHeardScenarios([mill, bell], s, "bronze bell", null);
    expect(
      result.pursued.map((entry) => [entry.item.id, entry.provenance]),
    ).toEqual([[bell.id, "player-action"]]);
    expect(result.otherIds).toEqual([mill.id]);
  });

  it("keeps ties deterministic while limiting pursuit to two and other IDs to six", () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      heardScenario(`bell-${9 - i}`),
    );
    const before = items.map((item) => item.id);
    const result = rankOpenHeardScenarios(
      items,
      session(),
      "bronze bell",
      null,
    );
    expect(result.pursued.map((entry) => entry.item.id)).toEqual([
      "bell-0",
      "bell-1",
    ]);
    expect(result.otherIds).toEqual([
      "bell-2",
      "bell-3",
      "bell-4",
      "bell-5",
      "bell-6",
      "bell-7",
    ]);
    expect(items.map((item) => item.id)).toEqual(before);
  });

  it("permits a directly coupled second scenario even when its rank is lower", () => {
    const primary = heardScenario("primary", { stage: "revelation-crisis" });
    const second = heardScenario("second");
    const s = session();
    expect(
      rankOpenHeardScenarios(
        [second, primary],
        s,
        "bronze bell",
        null,
      ).pursued.map((entry) => entry.item.id),
    ).toEqual([primary.id]);
    second.events.push({
      id: "consequence",
      kind: "consequence",
      visibility: "gm",
      text: "A shared consequence",
      at: now,
      causedBy: { scenarioId: primary.id, eventId: "cause", anchorRef: "bell" },
    });
    expect(
      rankOpenHeardScenarios(
        [second, primary],
        s,
        "bronze bell",
        null,
      ).pursued.map((entry) => entry.item.id),
    ).toEqual([primary.id, second.id]);
  });

  it("suppresses stale location-bound focus and recent events after moving away", () => {
    const item = heardScenario();
    item.anchorRefs = ["tower"];
    item.events.push({
      id: "heard",
      kind: "discovery",
      visibility: "player",
      text: "A bell was heard",
      at: now,
      turnId: "turn-1",
    });
    const s = session();
    s.turns = [directorTurn(1)];
    s.scenarioCollection = {
      version: 1,
      items: [item],
      focusedScenarioId: item.id,
    };
    expect(
      rankOpenHeardScenarios([item], s, undefined, {
        name: "Quay",
        recordId: "quay",
      }),
    ).toEqual({ pursued: [], otherIds: [item.id] });
    expect(
      rankOpenHeardScenarios([item], s, "bronze bell", {
        name: "Quay",
        recordId: "quay",
      }).pursued[0]?.provenance,
    ).toBe("player-action");
  });

  it("uses bounded turn indexes while retaining authored timestamps for older events", () => {
    const older = heardScenario("older");
    const newer = heardScenario("newer");
    older.events = [
      {
        id: "older-event",
        kind: "discovery",
        visibility: "player",
        text: "Heard a bell",
        at: "2026-11-11T12:00:00Z",
        turnId: "turn-1",
      },
    ];
    newer.events = [
      {
        id: "newer-event",
        kind: "discovery",
        visibility: "player",
        text: "Heard a bell",
        at: "2026-11-10T12:00:00Z",
        turnId: "turn-2",
      },
    ];
    const s = session();
    s.turns = Array.from({ length: 257 }, (_, i) => directorTurn(i + 1));
    const result = rankOpenHeardScenarios(
      [older, newer],
      s,
      "bronze bell",
      null,
    );
    expect(result.pursued[0]?.item.id).toBe(newer.id);
    expect(result.pursued[0]?.recency).toEqual({
      turnIndex: 1,
      timestamp: Date.parse(newer.events[0]!.at),
    });
    s.turns.push(directorTurn(258));
    expect(
      rankOpenHeardScenarios([older, newer], s, "bronze bell", null).pursued[0]
        ?.item.id,
    ).toBe(older.id);
  });

  it("returns no candidates for empty inputs or an unrelated non-investigative action", () => {
    const item = heardScenario();
    const s = session();
    s.scenarioCollection = {
      version: 1,
      items: [item],
      focusedScenarioId: item.id,
    };
    expect(rankOpenHeardScenarios([], s, undefined, null)).toEqual({
      pursued: [],
      otherIds: [],
    });
    expect(rankOpenHeardScenarios([item], s, "Drink tea", null)).toEqual({
      pursued: [],
      otherIds: [item.id],
    });
    expect(rankOpenHeardScenarios([item], s, "Ignore the bell", null)).toEqual({
      pursued: [],
      otherIds: [item.id],
    });
  });
});
