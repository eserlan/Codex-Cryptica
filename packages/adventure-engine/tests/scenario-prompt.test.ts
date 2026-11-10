import { describe, expect, it } from "vitest";
import {
  applyCompletedTurn,
  applyRollRequest,
  buildAdventurePrompt,
  createScenarioState,
  detectHiddenLeakage,
  ensureScenarioSecrets,
  parseAdventureSession,
  scenarioEventSecretId,
  SCENARIO_IF_INVESTIGATED_SECRET_ID,
  SCENARIO_TRUTH_SECRET_ID,
} from "../src";
import type { AdventureSession, AdventureTurnProposal } from "../src";

const now = "2026-11-01T11:00:00.000Z";
const truth = "The miller has hidden grain beneath the waterwheel.";
const ifInvestigated = "The ledger is missing three pages.";
const gmEventText = "Smugglers will collect the grain at midnight.";

const meta = {
  turnId: "turn-1",
  inputId: "input-1",
  playerAction: "Look around",
  now,
};

function withGmEvent(): AdventureSession {
  const base = session();
  const item = base.scenarioCollection!.items[0]!;
  item.events.push({
    id: "event-7",
    kind: "consequence",
    visibility: "gm",
    text: gmEventText,
    at: now,
  });
  item.secretBindings.eventIds["event-7"] = scenarioEventSecretId("event-7");
  return base;
}

function session(): AdventureSession {
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
      gmOnly: { truth, ifInvestigated },
    }),
  });
}

function proposal(
  narration: string,
  revealSecretIds: string[] = [],
): AdventureTurnProposal {
  return {
    kind: "complete",
    narration,
    visiblePatch: {
      objectives: { add: [], update: [], removeIds: [] },
      activeCharacters: { add: [], update: [], removeIds: [] },
      knownFacts: { add: [], update: [], removeIds: [] },
      relationships: { add: [], update: [], removeIds: [] },
    },
    hiddenPatch: {
      secrets: { add: [], update: [], removeIds: [] },
      gmThreads: { add: [], update: [], removeIds: [] },
    },
    revealSecretIds,
    provisionalFacts: [],
    sourceRecordIds: [],
  };
}

describe("scenario-aware Oracle GM", () => {
  it("separates the public scenario from immutable GM truth in the prompt state", () => {
    const prompt = buildAdventurePrompt({
      session: session(),
      phase: "opening",
      anchors: [],
      relevant: [],
    });
    const state = JSON.parse(prompt.state);
    expect(state.playerScenarios.items[0].playerVisible.lead).toBe("Old Mill");
    expect(JSON.stringify(state.playerScenarios)).not.toContain(truth);
    expect(state["GM-ONLY scenarios"][0].baselineTruth.truth).toBe(truth);
    expect(prompt.behavior).toContain("Never rewrite");
    expect(prompt.behavior).toContain("not need to become an adventure");
    expect(prompt.behavior).toContain("ignore, abandon, revisit or resolve");
  });

  it("rejects unrevealed baseline truth even without a duplicate secret record", () => {
    const findings = detectHiddenLeakage(session(), proposal(truth));
    expect(findings).toEqual([
      { field: "root.narration", secretId: "scenario-baseline-truth" },
    ]);
  });

  it("permits explicit reveal of the baseline through the existing secret lifecycle", () => {
    const withSecret = session();
    withSecret.hiddenState.secrets.push({
      id: "truth-1",
      text: truth,
      status: "hidden",
    });
    expect(
      detectHiddenLeakage(
        withSecret,
        proposal(truth, ["truth-1", "scenario-baseline-truth"]),
      ),
    ).toEqual([]);
  });

  it("does not change the prompt for an ordinary premise-only adventure", () => {
    const { scenarioCollection: _scenarioCollection, ...ordinary } = session();
    const prompt = buildAdventurePrompt({
      session: ordinary,
      phase: "opening",
      anchors: [],
      relevant: [],
    });
    const state = JSON.parse(prompt.state);
    expect(state.playerScenarios.items).toEqual([]);
    expect(state["GM-ONLY scenarios"]).toEqual([]);
    expect(prompt.behavior).not.toContain("A rumour may be exaggerated");
  });

  it.each([
    ["baseline truth", truth, SCENARIO_TRUTH_SECRET_ID],
    [
      "if-investigated note",
      ifInvestigated,
      SCENARIO_IF_INVESTIGATED_SECRET_ID,
    ],
    ["GM-only event", gmEventText, scenarioEventSecretId("event-7")],
  ])("rejects a complete turn that narrates the %s", (_label, text, id) => {
    const result = applyCompletedTurn(withGmEvent(), proposal(text), meta);
    expect(result.ok).toBe(false);
    expect(detectHiddenLeakage(withGmEvent(), proposal(text))).toEqual([
      { field: "root.narration", secretId: id },
    ]);
  });

  it.each([
    ["setup narration", { setupNarration: ifInvestigated }],
    ["stakes", { stakes: truth }],
    ["suggested actions", { suggestedActions: ["Ask", "Wait", gmEventText] }],
  ])("rejects a roll request whose %s leaks GM text", (_label, leak) => {
    const original = withGmEvent();
    const result = applyRollRequest(
      original,
      {
        kind: "roll-required",
        uncertainty: "Can Kael climb the wheel?",
        stakes: "A fall",
        sourceRecordIds: [],
        ...leak,
      },
      meta,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]?.code).toBe("hidden-leakage");
    expect(original.pendingRoll).toBeNull();
    expect(original.revision).toBe(0);
  });

  it("allows a safe roll request for a scenario session", () => {
    const result = applyRollRequest(
      withGmEvent(),
      {
        kind: "roll-required",
        uncertainty: "Can Kael climb the wheel?",
        stakes: "A fall",
        sourceRecordIds: [],
      },
      meta,
    );
    expect(result.ok).toBe(true);
  });

  it("does not treat GM-only hidden patches as player-facing leakage", () => {
    const hiddenOnly = proposal("The mill is quiet.");
    hiddenOnly.hiddenPatch.secrets.add.push({
      text: truth,
      status: "hidden",
    });
    expect(detectHiddenLeakage(session(), hiddenOnly)).toEqual([]);
    expect(applyCompletedTurn(session(), hiddenOnly, meta).ok).toBe(true);
  });

  it("registers scenario secrets so a restored session can reveal them", () => {
    const restored = withGmEvent();
    expect(restored.hiddenState.secrets).toEqual([]);
    const ids = ensureScenarioSecrets(restored).hiddenState.secrets.map(
      (secret) => secret.id,
    );
    expect(ids).toEqual([]);
    expect(restored.scenarioCollection?.items[0]?.secretBindings).toMatchObject(
      {
        truth: SCENARIO_TRUTH_SECRET_ID,
        ifInvestigated: SCENARIO_IF_INVESTIGATED_SECRET_ID,
        eventIds: { "event-7": scenarioEventSecretId("event-7") },
      },
    );
    const prompt = JSON.parse(
      buildAdventurePrompt({
        session: restored,
        phase: "action",
        anchors: [],
        relevant: [],
      }).state,
    );
    expect(prompt["GM-ONLY scenarios"][0].secretBindings.truth).toBe(
      SCENARIO_TRUTH_SECRET_ID,
    );

    const revealed = applyCompletedTurn(
      restored,
      proposal(truth, [SCENARIO_TRUTH_SECRET_ID]),
      meta,
    );
    expect(revealed.ok).toBe(true);
    if (!revealed.ok) return;
    expect(
      revealed.value.scenarioCollection?.items[0]?.revealedSecretIds,
    ).toContain(SCENARIO_TRUTH_SECRET_ID);
    expect(ensureScenarioSecrets(revealed.value)).toBe(revealed.value);
  });

  it("instructs Oracle GM on contextual rumours when asking about local news without chore substitution", () => {
    const s = session();
    s.worldEntry = {
      version: 1,
      location: {
        kind: "canonical",
        recordId: "loc-oakhaven",
        name: "Oakhaven",
      },
      intent: "explore",
    };
    const prompt = buildAdventurePrompt({
      session: s,
      phase: "action",
      playerAction:
        "Ask the innkeeper if there are any interesting rumours around town",
      anchors: [],
      relevant: [],
    });

    expect(prompt.behavior).toContain(
      "Candidate rumours and leads are contextual to the player's current location",
    );
    expect(prompt.behavior).toContain(
      "Avoid endlessly substituting unrelated chores",
    );
    expect(prompt.behavior).toContain("meaningful empty result");
  });

  it("includes id, status, anchorRefs and unheardLead for unheard background scenarios in GM state", () => {
    const s = session();
    s.scenarioCollection!.items[0]!.knowledge = "unheard";
    s.scenarioCollection!.items[0]!.anchorRefs = ["anchor-1"];
    s.worldEntry = {
      version: 1,
      location: {
        kind: "canonical",
        recordId: "place-1",
        name: "Northbrook",
      },
      intent: "explore",
    };
    const prompt = buildAdventurePrompt({
      session: s,
      phase: "action",
      playerAction: "Explore the village",
      anchors: [],
      relevant: [],
    });
    const gmScenarios = JSON.parse(prompt.state)["GM-ONLY scenarios"];
    expect(gmScenarios[0]).toMatchObject({
      id: "rumour-4",
      status: "open",
      anchorRefs: ["anchor-1"],
      knowledge: "unheard",
      unheardLead: {
        rumour: "The miller has vanished.",
        lead: "Old Mill",
      },
    });
  });

  it("instructs Oracle on post-resolution open-world continuity and location-revisit memory", () => {
    const s = session();
    s.scenarioCollection!.items[0]!.status = "resolved";
    s.worldEntry = {
      version: 1,
      location: {
        kind: "canonical",
        recordId: "place-1",
        name: "Northbrook",
      },
      intent: "explore",
    };
    const prompt = buildAdventurePrompt({
      session: s,
      phase: "action",
      playerAction: "Walk back to the village square",
      anchors: [],
      relevant: [],
    });
    expect(prompt.behavior).toContain(
      "When all scenarios are resolved or abandoned, or when the player pursues everyday life, portray ongoing unscripted world activity",
    );
    expect(prompt.behavior).toContain(
      "When the player returns to a previously visited location, reflect established facts, prior conversations, and committed scenario consequences",
    );
  });
});
