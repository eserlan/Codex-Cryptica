import { describe, expect, it } from "vitest";
import { diagnosticSummary } from "./adventure-diagnostic-summary";
import { exampleSession, quietSession } from "./test-fixtures/adventure-review";

describe("Adventure diagnostic summary", () => {
  it("combines session, location, secret and OOC counts", () => {
    const session = exampleSession();
    session.places = [{ id: "mill", name: "The mill" }];
    session.currentPlaceId = "mill";
    session.provisionalFacts[0].provenance = "ooc";
    session.oocExchanges = [
      {
        id: "ooc-1",
        kind: "ooc",
        question: "Where?",
        answer: "The mill.",
        status: "answered",
        afterTurnCount: 1,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        committedFactIds: ["fact-1"],
      },
      {
        id: "ooc-2",
        kind: "ooc",
        question: "When?",
        status: "pending",
        afterTurnCount: 1,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    ];

    expect(diagnosticSummary(session, 0, session.turns.at(-1))).toMatchObject({
      sessionId: session.id,
      elapsedMinutes: 1440,
      currentLocation: "Northbrook",
      currentPlace: "The mill",
      hiddenSecrets: 1,
      revealedSecrets: 0,
      openScenarios: 1,
      unheardScenarios: 1,
      ooc: {
        totalExchanges: 2,
        answeredCount: 1,
        establishedDecisionsCount: 1,
        latestExchangeIds: ["ooc-1", "ooc-2"],
        oocSourcedFactCount: 1,
      },
    });
  });

  it("uses explicit empty values when optional state and history are absent", () => {
    const session = quietSession(0);
    session.scenarioCollection = undefined;
    session.visibleState.location = null;
    session.currentPlaceId = "missing-place";

    expect(diagnosticSummary(session, 0, undefined)).toMatchObject({
      currentLocation: null,
      currentPlace: null,
      currentSituation: null,
      elapsedMinutes: 0,
      openScenarios: 0,
      unheardScenarios: 0,
      timeToFirstSign: null,
      timeToFirstActionableLead: null,
      ooc: {
        totalExchanges: 0,
        answeredCount: 0,
        establishedDecisionsCount: 0,
        latestExchangeIds: [],
        oocSourcedFactCount: 0,
      },
      emergentThreads: { total: 0, focusedEmergentThreadId: null, threads: [] },
    });
  });
});
