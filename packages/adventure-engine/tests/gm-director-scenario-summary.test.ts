import { describe, expect, it } from "vitest";
import { buildPursuedScenario } from "../src/gm-director-scenario-summary";
import type { RankedCandidate } from "../src/gm-director-scenario-ranking";
import { commitment, heardScenario } from "./gm-director-fixtures";
import { now, session } from "./reducer-fixtures";

function candidate(): RankedCandidate {
  return {
    item: heardScenario(),
    provenance: "player-action",
    confidence: "high",
    actionHits: 2,
    exactPhrase: false,
    isFocused: false,
    hasRecentEvent: false,
    matchesLocation: false,
    recency: { turnIndex: -1, timestamp: -1 },
  };
}

describe("director scenario summary", () => {
  it("distinguishes GM truth, player facts, and speculative commitments without changing the session", () => {
    const entry = candidate();
    const s = session();
    s.causalCommitments = [
      commitment("cause", { scenarioId: entry.item.id }),
      commitment("claim", {
        scenarioId: entry.item.id,
        commitmentClass: "belief-testimony",
      }),
    ];
    s.provisionalFacts = [
      {
        id: "hidden",
        kind: "clue",
        name: "CANARY",
        summary: "Hidden",
        introducedOnTurnId: "turn-1",
        visibility: "gm-only",
        scenarioId: entry.item.id,
      },
    ];
    const before = structuredClone(s);
    const summary = buildPursuedScenario(entry, s);
    expect(summary.gmTruthRef.truth).toBe(entry.item.gmOnly.truth);
    expect(summary.gmTruthRef.truthRevealed).toBe(false);
    expect(summary.established.committedExplanations?.map((c) => c.id)).toEqual(
      ["cause"],
    );
    expect(summary.potential.speculativeCommitments?.map((c) => c.id)).toEqual([
      "claim",
    ]);
    expect(summary.established.knownPlayerFacts.join(" ")).not.toContain(
      "CANARY",
    );
    expect(s).toEqual(before);
  });

  it("reports pressure only when present and stops suggesting untriggered pressure after it fires", () => {
    const entry = candidate();
    expect(buildPursuedScenario(entry, session()).potential).not.toHaveProperty(
      "pressure",
    );
    entry.item.pressure = {
      actor: "The keeper",
      goal: "Hide the bell",
      currentStance: "Waiting",
      trigger: "Night falls",
      progression: "The keeper prepares to leave",
      expectedConsequence: "The bell vanishes",
    };
    const pending = buildPursuedScenario(entry, session());
    expect(pending.potential.pressure?.actor).toBe("The keeper");
    expect(pending.potential.nextDevelopmentKinds).toContain(
      "advance-offscreen-pressure-if-time-passes",
    );
    entry.item.pressure.triggeredAtMinute = 0;
    const triggered = buildPursuedScenario(entry, session());
    expect(triggered.potential.pressure?.triggeredAtMinute).toBe(0);
    expect(triggered.potential.nextDevelopmentKinds).not.toContain(
      "advance-offscreen-pressure-if-time-passes",
    );
  });

  it("keeps the latest three consequential events, clips details, and removes revealed uncertainties", () => {
    const entry = candidate();
    entry.item.events = Array.from({ length: 5 }, (_, i) => ({
      id: `event-${i}`,
      kind: "discovery",
      visibility: "player",
      text: "A clue ".repeat(50),
      at: now,
    }));
    entry.item.revealedSecretIds = [
      entry.item.secretBindings.truth,
      entry.item.secretBindings.ifInvestigated!,
    ];
    const summary = buildPursuedScenario(entry, session());
    expect(
      summary.established.latestConsequentialEvents.map((event) => event.id),
    ).toEqual(["event-2", "event-3", "event-4"]);
    expect(summary.established.latestConsequentialEvents[0]!.text).toHaveLength(
      180,
    );
    expect(summary.gmTruthRef.truthRevealed).toBe(true);
    expect(summary.potential.openUncertainties).toEqual([
      "Still hearsay; concrete witness or physical clue is open.",
    ]);
  });

  it("deduplicates sources and active anchored actors while excluding inactive or non-character records", () => {
    const entry = candidate();
    entry.item.playerVisible.source = "Keeper";
    entry.item.origin.sourceRecordId = "keeper";
    entry.item.anchorRefs = ["witness", "inactive", "place"];
    const s = session();
    s.sourceRecords = ["keeper", "witness", "inactive", "place"].map(
      (recordId) => ({
        recordId,
        displayName: recordId === "keeper" ? "Keeper" : recordId,
        recordType: recordId === "place" ? "location" : "character",
        role: "anchor",
        availability: "available",
      }),
    );
    s.visibleState.activeCharacters = [
      {
        id: "visible-witness",
        text: "A witness",
        source: "canonical",
        sourceRecordId: "witness",
      },
    ];
    expect(buildPursuedScenario(entry, s).established.actors).toEqual([
      "Keeper",
      "witness",
    ]);
  });
});
