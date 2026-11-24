import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAdventurePrompt,
  createScenarioState,
  parseAdventureSession,
} from "../src";
import type { AdventurePromptInput } from "../src";
import { session } from "./reducer-fixtures";

const goldenDir = join(import.meta.dir, "fixtures", "prompt-golden");
const now = "2026-11-01T11:00:00.000Z";

function scenarioSession() {
  return parseAdventureSession({
    schemaVersion: 2,
    id: "adventure-1",
    vaultId: "vault-1",
    title: "Northbrook",
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    revision: 0,
    playerCharacter: {
      kind: "provisional",
      name: "Kael",
      description: "Traveler",
    },
    premise: "The miller has vanished.",
    sourceRecords: [],
    visibleState: {
      objectives: [],
      activeCharacters: [],
      knownFacts: [],
      relationships: [],
    },
    hiddenState: { secrets: [], gmThreads: [] },
    provisionalFacts: [],
    turns: [],
    pendingRoll: null,
    dicePresets: [],
    resourceCounters: [],
    scenarioState: createScenarioState({
      id: "rumour-4",
      origin: { kind: "rumour", batchTitle: "Northbrook", index: 4 },
      playerVisible: {
        rumour: "The miller has vanished.",
        lead: "Old Mill",
        source: "Innkeeper",
      },
      gmOnly: {
        truth: "The miller has hidden grain beneath the waterwheel.",
        ifInvestigated: "The ledger is missing three pages.",
      },
    }),
  });
}

const cases: Record<string, () => AdventurePromptInput> = {
  "emergent-opening": () => ({
    session: session(),
    phase: "opening",
    anchors: [],
    relevant: [],
  }),
  "emergent-action": () => ({
    session: session(),
    phase: "action",
    playerAction: "I open the door & look <inside>.",
    anchors: [],
    relevant: [],
  }),
  "scenario-action": () => ({
    session: scenarioSession(),
    phase: "action",
    playerAction: "Ask the innkeeper about the mill",
    anchors: [],
    relevant: [],
  }),
};

describe("emergent prompt golden files", () => {
  for (const [name, build] of Object.entries(cases)) {
    it(`${name} output is byte-identical to the recorded output`, () => {
      const actual = JSON.stringify(buildAdventurePrompt(build()));
      const path = join(goldenDir, `${name}.golden`);
      if (process.env.UPDATE_PROMPT_GOLDEN) {
        writeFileSync(path, actual);
      }
      expect(actual).toBe(readFileSync(path, "utf8"));
    });
  }
});
