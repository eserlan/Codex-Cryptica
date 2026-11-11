import { describe, expect, it } from "vitest";
import {
  buildReadyAdventureScenario,
  buildRumourScenario,
  RumourAdventureHandoff,
} from "../rumour-adventure-handoff.svelte";
import {
  selectAdventureForPlay,
  generateAdventureLocal,
  type SelectedRumourForPlay,
} from "generator-engine";
import {
  playerScenarioProjection,
  detectHiddenLeakage,
  type AdventureTurnProposal,
} from "@codex/adventure-engine";
import { initialSession } from "../adventure-session";

function seededRng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe("rumourAdventureHandoff & ready-made adventure scenario builder", () => {
  it("builds a canonical ScenarioState from a fantasy ready-made adventure", () => {
    const draft = generateAdventureLocal(
      { themeId: "fantasy", genre: "Classic Fantasy" },
      seededRng(42),
    );
    const selected = selectAdventureForPlay(draft, "rec-42", "scenario-42");

    const scenario = buildReadyAdventureScenario(selected, "scenario-42");

    expect(scenario.id).toBe("scenario-42");
    expect(scenario.origin.kind).toBe("manual");
    expect(scenario.origin.manualId).toBe("scenario-42");
    expect(scenario.origin.sourceRecordId).toBe("rec-42");
    expect(scenario.status).toBe("open");
    expect(scenario.stage).toBe("hearsay");

    expect(scenario.playerVisible.rumour).toBe(
      selected.playerVisible.openingSituation,
    );
    expect(scenario.playerVisible.lead).toBe(
      selected.playerVisible.primaryObjective,
    );
    expect(scenario.playerVisible.source).toBe(selected.playerVisible.title);

    expect(scenario.gmOnly.truth).toBe(selected.gmOnly.truth);
    expect(scenario.gmOnly.ifInvestigated).toBe(selected.gmOnly.ifInvestigated);

    expect(scenario.pressure).toBeDefined();
    expect(scenario.pressure?.actor.length).toBeGreaterThan(0);
    expect(scenario.pressure?.goal).toBe(
      selected.playerVisible.primaryObjective,
    );
    expect(scenario.pressure?.expectedConsequence).toBe(selected.gmOnly.truth);

    // Player projection must strictly hide GM truth and pressure consequence
    const projection = playerScenarioProjection(scenario);
    expect(projection).toBeDefined();
    expect(projection?.origin.kind).toBe("manual");
    expect(JSON.stringify(projection)).not.toContain(selected.gmOnly.truth);
    expect(JSON.stringify(projection)).not.toContain(
      selected.gmOnly.ifInvestigated,
    );
  });

  it("builds a canonical ScenarioState from a sci-fi/horror adventure without secret leakage", () => {
    const draft = generateAdventureLocal(
      { themeId: "horror", genre: "Cosmic Horror" },
      seededRng(101),
    );
    const selected = selectAdventureForPlay(draft);

    const scenario = buildReadyAdventureScenario(selected, "cosmic-scen-1");

    expect(scenario.origin.kind).toBe("manual");
    expect(scenario.pressure?.actor).toBeDefined();
    expect(scenario.pressure?.currentStance).toBe("Active / Escalating");

    const session = initialSession({
      vaultId: "vault-horror",
      title: selected.playerVisible.title,
      premise: selected.playerVisible.openingSituation,
      playerCharacter: {
        kind: "provisional",
        name: "Dr. Scott",
        description: "Dr. Scott",
      },
      scenarioSeed: scenario,
      now: "2026-11-11T08:00:00.000Z",
      idGenerator: () => crypto.randomUUID(),
    });

    // Clean player-facing proposal with no GM secret leaks
    const cleanProposal: AdventureTurnProposal = {
      kind: "complete",
      narration:
        "Dr. Scott arrives at the perimeter checkpoint. Rain hammers the metal roof.",
      visiblePatch: {
        situation: { text: "Checkpoint reached.", source: "canonical" },
        objectives: { add: [], update: [], removeIds: [] },
        activeCharacters: { add: [], update: [], removeIds: [] },
        knownFacts: { add: [], update: [], removeIds: [] },
        relationships: { add: [], update: [], removeIds: [] },
      },
      hiddenPatch: {
        secrets: { add: [], update: [], removeIds: [] },
        gmThreads: { add: [], update: [], removeIds: [] },
      },
      revealSecretIds: [],
      provisionalFacts: [],
      sourceRecordIds: [],
    };

    const leaks = detectHiddenLeakage(session, cleanProposal);
    expect(leaks).toEqual([]);

    // Contrived leaking proposal should be detected
    const leakingProposal: AdventureTurnProposal = {
      ...cleanProposal,
      narration: `The secret truth is: ${scenario.gmOnly.truth}`,
    };
    const caughtLeaks = detectHiddenLeakage(session, leakingProposal);
    expect(caughtLeaks.length).toBeGreaterThan(0);
  });

  it("handles prepareAdventure, cancellation round-trip, and draft restoration", () => {
    const handoff = new RumourAdventureHandoff();
    const draft = generateAdventureLocal({ themeId: "fantasy" }, seededRng(12));
    const selected = selectAdventureForPlay(draft, "rec-1", "scen-1");
    const scenario = buildReadyAdventureScenario(selected, "scen-1");

    handoff.prepareAdventure("vault-alpha", selected, scenario, draft as any);

    const pending = handoff.forVault("vault-alpha");
    expect(pending).not.toBeNull();
    expect(pending?.sourceGeneratorId).toBe("adventure");
    expect(pending?.adventureTitle).toBe(draft.title);
    expect(pending?.scenario.id).toBe("scen-1");

    // Other vault cannot see it
    expect(handoff.forVault("vault-beta")).toBeNull();

    // Cancellation drops pending but keeps source draft
    const hasSource = handoff.cancel("vault-alpha");
    expect(hasSource).toBe(true);
    expect(handoff.forVault("vault-alpha")).toBeNull();

    // Take source draft returns the draft once
    const restored = handoff.takeSourceDraft("vault-alpha");
    expect(restored).not.toBeNull();
    expect(restored?.title).toBe(draft.title);

    // Second take yields null
    expect(handoff.takeSourceDraft("vault-alpha")).toBeNull();
  });

  it("preserves rumour handoff compatibility for existing rumour workflows", () => {
    const handoff = new RumourAdventureHandoff();
    const mockRumour: SelectedRumourForPlay = {
      batchTitle: "Dusk Market",
      index: 1,
      origin: {
        kind: "rumour",
        batchTitle: "Dusk Market",
        batchId: "batch-1",
        index: 1,
      },
      playerVisible: {
        rumour: "The well runs cold",
        lead: "Check the crypt below the well",
        source: "Elder Jon",
      },
      gmOnly: {
        reality: "essentially true",
        whatsActuallyHappening: "A frost spirit awakens",
        ifInvestigated: "The seal was broken last week",
      },
    };
    const scenario = buildRumourScenario(mockRumour, "rumour-scen-1");

    handoff.prepare("vault-1", mockRumour, scenario);

    const pending = handoff.forVault("vault-1");
    expect(pending?.sourceGeneratorId).toBe("rumour");
    expect(pending?.scenario.playerVisible.rumour).toBe("The well runs cold");

    handoff.clear();
    expect(handoff.forVault("vault-1")).toBeNull();
  });
});
