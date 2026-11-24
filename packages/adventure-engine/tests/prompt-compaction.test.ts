import { describe, expect, it } from "vitest";
import {
  MAX_GENERATION_INPUT_CHARS,
  MAX_SERIALIZED_STATE_CHARS,
  buildAdventurePrompt,
  compactHotPromptState,
  parseAdventureSession,
} from "../src";
import { now, scenario, session } from "./reducer-fixtures";

const EMPTY_BUCKET = { add: [], update: [], removeIds: [] };

function buildLongInvestigationSession() {
  const s = session();
  s.visibleState.knownFacts = Array.from({ length: 60 }, (_, i) => ({
    id: `fact-${i}`,
    text: `Witness ${i} testified about the ledger discrepancy in district ${i % 5}: ${"x".repeat(420)}`,
    source: "provisional" as const,
  }));
  s.visibleState.objectives = Array.from({ length: 20 }, (_, i) => ({
    id: `obj-${i}`,
    text: `Objective ${i}: ${"y".repeat(320)}`,
    source: "provisional" as const,
  }));
  s.hiddenState.secrets = Array.from({ length: 40 }, (_, i) => ({
    id: `secret-${i}`,
    text: `Secret ${i}: ${"s".repeat(420)}`,
    revealCondition: `Condition ${i}: ${"c".repeat(200)}`,
    status: i < 30 ? ("revealed" as const) : ("hidden" as const),
    ...(i < 30 ? { revealedOnTurnId: `turn-${i}` } : {}),
  }));
  s.scenarioCollection = {
    version: 1,
    focusedScenarioId: "scenario-active",
    items: [
      {
        ...scenario(),
        id: "scenario-active",
        status: "open",
        knowledge: "heard",
        secretBindings: { truth: "truth-active", eventIds: {} },
        revealedSecretIds: [],
        events: Array.from({ length: 24 }, (_, i) => ({
          id: `ev-a-${i}`,
          kind: "discovery" as const,
          visibility: "player" as const,
          text: `Active event ${i}: ${"e".repeat(260)}`,
          at: now,
        })),
      },
      ...Array.from({ length: 5 }, (_, idx) => ({
        ...scenario(),
        id: `scenario-cold-${idx}`,
        status: idx % 2 === 0 ? ("resolved" as const) : ("abandoned" as const),
        knowledge: "heard" as const,
        secretBindings: { truth: `truth-cold-${idx}`, eventIds: {} },
        revealedSecretIds: [],
        events: Array.from({ length: 20 }, (_, i) => ({
          id: `ev-c-${idx}-${i}`,
          kind: "discovery" as const,
          visibility: "player" as const,
          text: `Cold event ${idx}-${i}: ${"z".repeat(240)}`,
          at: now,
        })),
      })),
    ],
  };
  s.turns = Array.from({ length: 105 }, (_, i) => ({
    id: `turn-${i}`,
    inputId: `input-${i}`,
    sequence: i,
    playerAction: `Investigate clue ${i}`,
    narration: `You uncover detail ${i}.`,
    visiblePatch: {
      objectives: EMPTY_BUCKET,
      activeCharacters: EMPTY_BUCKET,
      knownFacts: EMPTY_BUCKET,
      relationships: EMPTY_BUCKET,
    },
    hiddenPatch: {
      secrets: EMPTY_BUCKET,
      gmThreads: EMPTY_BUCKET,
    },
    revealedSecretIds: [],
    sourceRecordIds: [],
    provisionalFactIds: [],
    committedAt: now,
  }));
  return s;
}

describe("prompt-compaction (#5204)", () => {
  it("keeps a 100+ turn investigation within MAX_SERIALIZED_STATE_CHARS without mutating durable state", () => {
    const longSession = buildLongInvestigationSession();
    const before = structuredClone(longSession);
    expect(parseAdventureSession(longSession)).toEqual(longSession);

    const prompt = buildAdventurePrompt({
      session: longSession,
      phase: "play",
      playerAction: "Inspect the final ledger",
      anchors: [],
      relevant: [],
    });

    expect(prompt.state.length).toBeLessThanOrEqual(MAX_SERIALIZED_STATE_CHARS);
    expect(prompt.serialized.length).toBeLessThanOrEqual(
      MAX_GENERATION_INPUT_CHARS,
    );
    expect(prompt.serialized).toContain("Inspect the final ledger");
    // Durable session remains untouched and lossless
    expect(longSession).toEqual(before);
    // Active hidden secrets stay intact while cold scenario prose is compacted
    expect(prompt.state).toContain("secret-39");
  });

  it("is deterministic and idempotent", () => {
    const longSession = buildLongInvestigationSession();
    const rawState = {
      playerVisibleState: longSession.visibleState,
      playerScenarios: {
        items: longSession.scenarioCollection!.items.map((item) => ({
          id: item.id,
          status: item.status,
          knowledge: item.knowledge,
          playerVisible: item.playerVisible,
          events: item.events,
        })),
      },
      "GM-ONLY scenarios": longSession.scenarioCollection!.items.map(
        (item) => ({
          id: item.id,
          status: item.status,
          knowledge: item.knowledge,
          focused: item.id === "scenario-active",
          stage: item.stage,
          revealedSecretIds: item.revealedSecretIds,
          hiddenEvents: item.events.filter((e) => e.visibility === "gm"),
        }),
      ),
      "GM-ONLY state": longSession.hiddenState,
    };

    const once = compactHotPromptState(rawState);
    const twice = compactHotPromptState(once);
    expect(twice).toEqual(once);
  });

  it("leaves small states untouched below targetChars", () => {
    const small = {
      playerVisibleState: session().visibleState,
    };
    expect(compactHotPromptState(small)).toBe(small);
  });

  it("still throws state-budget-exceeded if non-compactable state exceeds 48k", () => {
    const huge = session();
    huge.visibleState.location = {
      id: "loc-1",
      text: "w".repeat(MAX_SERIALIZED_STATE_CHARS + 500),
      source: "canonical",
    };

    expect(() =>
      buildAdventurePrompt({
        session: huge,
        phase: "play",
        playerAction: "Look around",
        anchors: [],
        relevant: [],
      }),
    ).toThrow("state-budget-exceeded");
  });
});
