import { describe, expect, it } from "vitest";
import {
  acknowledgeAdventureCompletion,
  applyCompletedTurn,
  applyReviewedThreadOutcomes,
  buildAdventurePrompt,
  buildAdventureRecap,
  buildGMDirectorBrief,
  completionEventId,
  inspectLegacyThreadOutcomeCandidates,
  parseAdventureSession,
  playerScenarioProjection,
  projectPlayerEmergentThreads,
  reconcileDuplicateEmergentThreads,
  selectPendingAdventureCompletion,
  type AdventureSession,
  type CompletedTurnProposal,
} from "../src";
import { meta, proposal, scenario, session } from "./reducer-fixtures";

let counter = 0;
const nextId = () => `to-${++counter}`;

function baseTurn(overrides: Partial<CompletedTurnProposal> = {}) {
  return { ...proposal(), ...overrides };
}

function commit(
  s: AdventureSession,
  turnOverrides: Partial<CompletedTurnProposal> & { playerAction?: string },
  step: number,
): AdventureSession {
  const { playerAction, ...proposalOverrides } = turnOverrides;
  const turnMeta = {
    ...meta,
    turnId: `turn-${step}`,
    inputId: `input-${step}`,
    ...(playerAction !== undefined ? { playerAction } : {}),
  };
  const res = applyCompletedTurn(
    s,
    baseTurn(proposalOverrides),
    turnMeta,
    turnMeta.now,
    nextId,
  );
  if (!res.ok) throw new Error(res.errors.map((e) => e.message).join("; "));
  return res.value;
}

describe("Goal-aware story arc outcomes (#5191)", () => {
  it("1. water-compact fixture: witness hearing -> council order -> sealed compact -> public proclamation records one achieved goal while keeping remaining mysteries distinct", () => {
    let s = session();
    s.places = [{ id: "p-hall", name: "Council Hall" }];
    s.currentPlaceId = "p-hall";

    // Turn 1: Witness hearing establishes emergent thread
    s = commit(
      s,
      {
        playerAction:
          "Question the well-warden about the blocked canal sluice and water access.",
        narration:
          "The well-warden testifies that the eastern sluice was shut on a forged seal.",
        provisionalFacts: [
          {
            kind: "clue",
            name: "Forged Sluice Order",
            summary: "The eastern canal sluice was closed using a forged seal.",
            visibility: "player-visible",
          },
        ],
        visiblePatch: {
          ...proposal().visiblePatch,
          knownFacts: {
            add: [
              {
                text: "Witness testimony confirms the eastern sluice was shut under a forged seal.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
      1,
    );

    const threadId = s.emergentThreads![0]!.id;
    expect(s.emergentThreads![0]!.status).toBe("open");

    // Turn 2: Council order
    s = commit(
      s,
      {
        playerAction: "Present the forged seal to the council.",
        narration:
          "The council issues an emergency order to reopen the sluice.",
        visiblePatch: {
          ...proposal().visiblePatch,
          knownFacts: {
            add: [
              {
                text: "The council issued an order to reopen the eastern sluice.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
      2,
    );

    s.causalCommitments = [
      {
        id: "gm-only-commitment-1",
        kind: "action",
        commitmentClass: "supporting-explanation",
        subject: "The council",
        summary: "The council committed to ratifying the compact.",
        status: "committed",
        sourceTurnId: "turn-2",
        sourceRevision: 2,
      },
    ];
    const supportingFactId = s.provisionalFacts.find(
      (fact) => fact.visibility === "player-visible",
    )?.id;
    if (!supportingFactId) throw new Error("Expected committed player fact");

    // Turn 3: Sealed compact & public proclamation -> goal achieved, side mysteries remain
    s = commit(
      s,
      {
        playerAction:
          "Witness the sealing and public proclamation of the water compact.",
        narration:
          "The council seals the water-access compact and reads the proclamation in the square, though who paid Sándor's courier remains unknown.",
        visiblePatch: {
          ...proposal().visiblePatch,
          knownFacts: {
            add: [
              {
                text: "The water-access compact is ratified, sealed, and publicly proclaimed.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
        threadOutcomes: [
          {
            threadId,
            goal: "Secure fair water access for the lower ward",
            result: "achieved",
            reason:
              "Council ratified, sealed, and publicly proclaimed the water-access compact.",
            supportingFactIds: [supportingFactId],
            supportingCommitmentIds: ["gm-only-commitment-1"],
            unresolvedConsequences: [
              "Sándor's original order and who hired the courier remain unconfirmed",
              "Long-term compliance by the upper-ward guild is untested",
            ],
          },
        ],
      },
      3,
    );

    expect(s.status).toBe("active");
    const resolvedThread = s.emergentThreads!.find((t) => t.id === threadId)!;
    expect(resolvedThread.status).toBe("resolved");
    expect(resolvedThread.goal).toBe(
      "Secure fair water access for the lower ward",
    );
    expect(resolvedThread.outcome?.result).toBe("achieved");
    expect(resolvedThread.outcome?.sourceTurnId).toBe("turn-3");
    expect(resolvedThread.outcome?.supportingFactIds.length).toBeGreaterThan(0);
    expect(resolvedThread.linkedCommitmentIds).toContain(
      "gm-only-commitment-1",
    );
    expect(JSON.stringify(projectPlayerEmergentThreads(s))).not.toContain(
      "gm-only-commitment-1",
    );
    expect(resolvedThread.outcome?.unresolvedConsequences).toEqual([
      "Sándor's original order and who hired the courier remain unconfirmed",
      "Long-term compliance by the upper-ward guild is untested",
    ]);

    // Turn 4: Investigating remaining mystery (Sándor's order) does not reopen the achieved goal
    s = commit(
      s,
      {
        playerAction: "Ask the gate clerk who carried Sándor's order.",
        narration: "The clerk recalls a hooded rider heading north at dusk.",
        visiblePatch: {
          ...proposal().visiblePatch,
          knownFacts: {
            add: [
              {
                text: "A hooded rider carried Sándor's order north at dusk.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
      4,
    );

    const afterFollowUp = s.emergentThreads!.find((t) => t.id === threadId)!;
    expect(afterFollowUp.status).toBe("resolved");
    expect(afterFollowUp.outcome?.result).toBe("achieved");
  });

  it("2. rejects premature resolution on requests, promises, or speculation without committed evidence", () => {
    let s = session();
    s = commit(
      s,
      {
        playerAction: "Investigate the missing grain shipment at the docks.",
        narration: "Dockhands point to an empty warehouse ledger.",
        provisionalFacts: [
          {
            kind: "clue",
            name: "Empty Ledger",
            summary: "Three grain barges vanished from the manifest.",
            visibility: "player-visible",
          },
        ],
        visiblePatch: {
          ...proposal().visiblePatch,
          knownFacts: {
            add: [
              {
                text: "Three grain barges vanished from the dock ledger.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
      1,
    );
    const threadId = s.emergentThreads![0]!.id;

    // Premature proposal: player only requested a hearing and council promised to decide later;
    // no committed fact or commitment in this turn and no valid supportingFactIds.
    s = commit(
      s,
      {
        playerAction: "Let's request a hearing with the harbour council.",
        narration:
          "The clerk promises the council will consider your request next week.",
        threadOutcomes: [
          {
            threadId,
            result: "achieved",
            reason: "The council promised to hold a hearing.",
          },
        ],
      },
      2,
    );

    const thread = s.emergentThreads!.find((t) => t.id === threadId)!;
    expect(thread.status).toBe("open");
    expect(thread.outcome).toBeUndefined();
    expect(s.turns.at(-1)?.dropped).toContain(
      "threadOutcomes: insufficient committed evidence for achieved",
    );
  });

  it("does not treat a same-turn scenario discovery as committed outcome evidence", () => {
    const s = session();
    const heardScenario = {
      ...scenario(),
      id: "sc-hearing",
      knowledge: "heard" as const,
    };
    heardScenario.events.push({
      id: "discovery-1",
      kind: "discovery",
      visibility: "player",
      text: "The witness offers a new clue.",
      at: meta.now,
      turnId: "turn-2",
    });
    s.scenarioCollection = {
      version: 1,
      items: [heardScenario],
      focusedScenarioId: heardScenario.id,
    };

    const after = commit(
      s,
      {
        playerAction: "Request a hearing.",
        narration: "The witness agrees to speak later.",
        threadOutcomes: [
          {
            scenarioId: heardScenario.id,
            result: "achieved",
            reason: "The witness agreed to a hearing.",
          },
        ],
      },
      2,
    );

    expect(after.scenarioCollection?.items[0]?.status).toBe("open");
    expect(after.scenarioCollection?.items[0]?.outcome).toBeUndefined();
    expect(after.turns.at(-1)?.dropped).toContain(
      "threadOutcomes: insufficient committed evidence for achieved",
    );
  });

  it("3. supports alternate outcomes (failed, abandoned, cold) and tracks scenario vs emergent outcomes separately in Director brief and recap", () => {
    let s = session();
    const heardScenario = {
      ...scenario(),
      id: "sc-bridge-toll",
      knowledge: "heard" as const,
      playerVisible: {
        rumour: "Bridge tolls doubled overnight.",
        lead: "Investigate the bridge toll dispute",
      },
    };
    s.scenarioCollection = {
      version: 1,
      items: [heardScenario],
      focusedScenarioId: "sc-bridge-toll",
    };

    // Create an emergent thread
    s = commit(
      s,
      {
        playerAction: "Investigate the poisoned well in the south ward.",
        narration: "You find bitter residue around the stone rim.",
        provisionalFacts: [
          {
            kind: "clue",
            name: "Bitter Residue",
            summary: "Mineral taint coats the south well rim.",
            visibility: "player-visible",
          },
        ],
        visiblePatch: {
          ...proposal().visiblePatch,
          knownFacts: {
            add: [
              {
                text: "Bitter mineral taint coats the south well.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
      1,
    );
    const emergentId = s.emergentThreads![0]!.id;

    // Resolve scenario as failed (negotiation collapsed) and abandon emergent thread
    s = commit(
      s,
      {
        playerAction:
          "Walk away from the south well and make a final offer on the bridge toll.",
        narration:
          "The tollmaster tears up your proposal and bars the gate; you leave the south well behind.",
        visiblePatch: {
          ...proposal().visiblePatch,
          knownFacts: {
            add: [
              {
                text: "The bridge tollmaster rejected the compromise and barred the gate.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
        threadOutcomes: [
          {
            scenarioId: "sc-bridge-toll",
            goal: "Negotiate a lower bridge toll",
            result: "failed",
            reason:
              "The tollmaster rejected the final offer and barred the gate.",
          },
          {
            threadId: emergentId,
            result: "abandoned",
            reason: "Player deliberately walked away from the south well.",
          },
        ],
      },
      2,
    );

    expect(s.status).toBe("active");
    expect(s.scenarioCollection?.items[0]?.status).toBe("resolved");
    expect(s.scenarioCollection?.items[0]?.outcome?.result).toBe("failed");
    expect(s.emergentThreads![0]!.status).toBe("abandoned");
    expect(s.emergentThreads![0]!.outcome?.result).toBe("abandoned");

    const brief = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction: "Look around the market",
    });
    expect(brief?.resolvedOutcomes?.scenario).toHaveLength(1);
    expect(brief?.resolvedOutcomes?.scenario[0]?.result).toBe("failed");
    expect(brief?.resolvedOutcomes?.emergent).toHaveLength(1);
    expect(brief?.resolvedOutcomes?.emergent[0]?.result).toBe("abandoned");

    const recap = buildAdventureRecap(s);
    expect(recap.knownLeads?.[0]?.outcome?.result).toBe("failed");
    expect(recap.emergentLeads?.[0]?.outcome?.result).toBe("abandoned");

    s.scenarioCollection!.items[0]!.outcome!.supportingFactIds = [
      "private-fact-id",
    ];
    s.scenarioCollection!.items[0]!.outcome!.supportingCommitmentIds = [
      "private-scenario-commitment-id",
    ];
    s.emergentThreads![0]!.outcome!.supportingCommitmentIds = [
      "private-emergent-commitment-id",
    ];
    const scenarioProjection = playerScenarioProjection(
      s.scenarioCollection!.items[0]!,
    );
    const emergentProjection = projectPlayerEmergentThreads(s);
    const safeRecap = buildAdventureRecap(s);
    expect(JSON.stringify(scenarioProjection)).not.toContain("private-");
    expect(JSON.stringify(emergentProjection)).not.toContain("private-");
    expect(JSON.stringify(safeRecap)).not.toContain("private-");
  });

  it("selects the most recently resolved outcomes by outcome sequence", () => {
    const s = session();
    const makeOutcome = (sequence: number) => ({
      result: "achieved" as const,
      reason: `Resolved at ${sequence}`,
      sourceTurnId: `turn-${sequence}`,
      supportingFactIds: [],
      supportingCommitmentIds: [],
      recordedAt: meta.now,
      sequence,
    });
    s.scenarioCollection = {
      version: 1,
      focusedScenarioId: null,
      items: [1, 5, 2, 4].map((sequence) => ({
        ...scenario(),
        id: `scenario-${sequence}`,
        knowledge: "heard" as const,
        outcome: makeOutcome(sequence),
        status: "resolved" as const,
      })),
    };
    s.emergentThreads = [1, 5, 2, 4].map((sequence) => ({
      id: `thread-${sequence}`,
      title: `Thread ${sequence}`,
      status: "resolved" as const,
      outcome: makeOutcome(sequence),
      provenance: "play" as const,
      topicTokens: [],
      linkedPersonIds: [],
      linkedPlaceIds: [],
      linkedFactIds: [],
      linkedCommitmentIds: [],
      openQuestions: [],
      knownConsequences: [],
      gmOnlyDevelopments: [],
      createdAtTurnId: "turn-1",
      updatedAtTurnId: `turn-${sequence}`,
      turnCount: sequence,
    }));

    const brief = buildGMDirectorBrief({
      session: s,
      phase: "action",
      playerAction: "Look around.",
    });
    expect(
      brief?.resolvedOutcomes?.scenario.map((outcome) => outcome.id),
    ).toEqual(["scenario-2", "scenario-4", "scenario-5"]);
    expect(
      brief?.resolvedOutcomes?.emergent.map((outcome) => outcome.id),
    ).toEqual(["thread-2", "thread-4", "thread-5"]);
  });

  it("4. idempotent retry, conflicting second reply, and reload/rehydration do not double-close or overwrite outcomes", () => {
    let s = session();
    s = commit(
      s,
      {
        playerAction: "Investigate the missing archive key.",
        narration: "You spot scratch marks on the archive lock.",
        provisionalFacts: [
          {
            kind: "clue",
            name: "Lock Scratches",
            summary: "Fresh scratches mark the archive lock.",
            visibility: "player-visible",
          },
        ],
        visiblePatch: {
          ...proposal().visiblePatch,
          knownFacts: {
            add: [
              {
                text: "Fresh scratches mark the archive lock.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
      1,
    );
    const threadId = s.emergentThreads![0]!.id;

    s = commit(
      s,
      {
        playerAction: "Recover the archive key from the apprentice.",
        narration: "The apprentice hands over the archive key.",
        visiblePatch: {
          ...proposal().visiblePatch,
          knownFacts: {
            add: [
              {
                text: "The archive key was recovered from the apprentice.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
        threadOutcomes: [
          {
            threadId,
            result: "achieved",
            reason: "Recovered the archive key.",
          },
        ],
      },
      2,
    );

    // Duplicate inputId retry is rejected
    const retryRes = applyCompletedTurn(
      s,
      baseTurn({
        threadOutcomes: [
          {
            threadId,
            result: "failed",
            reason: "Should not overwrite.",
          },
        ],
      }),
      { ...meta, turnId: "turn-2-retry", inputId: "input-2" },
      meta.now,
      nextId,
    );
    expect(retryRes.ok).toBe(false);

    // Second AI reply on a new turn attempting to overwrite achieved with failed is dropped
    s = commit(
      s,
      {
        playerAction: "Check the archive door.",
        narration: "The door opens smoothly.",
        visiblePatch: {
          ...proposal().visiblePatch,
          knownFacts: {
            add: [{ text: "The archive door opens.", source: "provisional" }],
            update: [],
            removeIds: [],
          },
        },
        threadOutcomes: [
          {
            threadId,
            result: "failed",
            reason: "Attempted overwrite.",
          },
        ],
      },
      3,
    );

    expect(s.emergentThreads![0]!.outcome?.result).toBe("achieved");
    expect(s.turns.at(-1)?.dropped).toContain(
      `threadOutcomes: thread ${threadId} already resolved`,
    );

    // Reload / rehydration preserves outcome cleanly
    const reloaded = parseAdventureSession(JSON.parse(JSON.stringify(s)));
    expect(reloaded.emergentThreads![0]!.outcome?.result).toBe("achieved");
    expect(reloaded.emergentThreads![0]!.outcome?.sourceTurnId).toBe("turn-2");
  });

  it("5. rejects GM hidden secret leakage in outcome reason and excludes gm-only provisional fact IDs from supportingFactIds", () => {
    let s = session();
    s.hiddenState.secrets.push({
      id: "sec-cult-vault",
      text: "The magistrate secretly leads the iron mask cult beneath the granary.",
      status: "hidden",
    });
    s = commit(
      s,
      {
        playerAction: "Investigate the granary cellar.",
        narration: "You find damp bootprints near the cellar stairs.",
        provisionalFacts: [
          {
            kind: "clue",
            name: "Cellar Bootprints",
            summary: "Damp bootprints lead toward the granary cellar.",
            visibility: "player-visible",
          },
          {
            kind: "clue",
            name: "Secret Cult Ledger",
            summary: "Hidden ledger naming the inner circle.",
            visibility: "gm-only",
          },
        ],
        visiblePatch: {
          ...proposal().visiblePatch,
          knownFacts: {
            add: [
              {
                text: "Damp bootprints lead toward the granary cellar.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
      1,
    );
    const threadId = s.emergentThreads![0]!.id;
    const gmOnlyFactId = s.provisionalFacts.find(
      (f) => f.visibility === "gm-only",
    )!.id;

    // Secret text in outcome.reason is rejected at the secrecy gate
    const leakRes = applyCompletedTurn(
      s,
      baseTurn({
        narration: "The cellar is quiet.",
        threadOutcomes: [
          {
            threadId,
            result: "achieved",
            reason:
              "Confirmed the magistrate secretly leads the iron mask cult beneath the granary.",
          },
        ],
      }),
      { ...meta, turnId: "turn-leak", inputId: "input-leak" },
      meta.now,
      nextId,
    );
    expect(leakRes.ok).toBe(false);
    if (!leakRes.ok) {
      expect(leakRes.errors[0]?.code).toBe("hidden-leakage");
    }

    // Citing only a gm-only provisional fact ID as evidence is dropped (no proof fabrication)
    const sAfterGmRef = commit(
      s,
      {
        playerAction: "Review what we know about the cellar.",
        narration: "You take stock of your notes.",
        threadOutcomes: [
          {
            threadId,
            result: "achieved",
            reason: "Solved the cellar mystery.",
            supportingFactIds: [gmOnlyFactId],
          },
        ],
      },
      2,
    );
    expect(sAfterGmRef.emergentThreads![0]!.status).toBe("open");
    expect(sAfterGmRef.emergentThreads![0]!.outcome).toBeUndefined();
    expect(sAfterGmRef.turns.at(-1)?.dropped).toContain(
      "threadOutcomes: insufficient committed evidence for achieved",
    );
  });

  it("6. parses legacy sessions unchanged, bounds prompt footprint, and supports reviewable legacy & duplicate reconciliation", () => {
    const legacyRaw = JSON.parse(JSON.stringify(session()));
    legacyRaw.emergentThreads = [
      {
        id: "em-legacy-1",
        title: "Water-access compact",
        status: "open",
        provenance: "play",
        topicTokens: ["water", "compact"],
        linkedPersonIds: [],
        linkedPlaceIds: [],
        linkedFactIds: ["fact-water-1"],
        linkedCommitmentIds: [],
        openQuestions: ["Who forged the seal?"],
        knownConsequences: [
          "The water-access compact was ratified and sealed.",
        ],
        gmOnlyDevelopments: [],
        createdAtTurnId: "t-1",
        updatedAtTurnId: "t-2",
        turnCount: 2,
      },
      {
        id: "em-legacy-dup",
        title: "Water-access compact",
        status: "open",
        provenance: "ooc",
        topicTokens: ["sluice"],
        linkedPersonIds: [],
        linkedPlaceIds: [],
        linkedFactIds: ["fact-water-2"],
        linkedCommitmentIds: [],
        openQuestions: [],
        knownConsequences: [],
        gmOnlyDevelopments: [],
        createdAtTurnId: "t-2",
        updatedAtTurnId: "t-3",
        turnCount: 1,
      },
    ];
    legacyRaw.visibleState.knownFacts = [
      {
        id: "fact-water-1",
        text: "The water-access compact was ratified and sealed by the council.",
        source: "provisional",
      },
    ];
    legacyRaw.turns = [
      {
        id: "t-2",
        sequence: 0,
        inputId: "in-2",
        playerAction: "Seal the compact.",
        narration: "The council seals the compact.",
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
        revealedSecretIds: [],
        sourceRecordIds: [],
        provisionalFactIds: [],
        committedAt: meta.now,
      },
    ];

    const parsed = parseAdventureSession(legacyRaw);
    expect(parsed.emergentThreads).toHaveLength(2);

    // Duplicate identity reconciliation merges safely without losing evidence
    const deduped = reconcileDuplicateEmergentThreads(parsed.emergentThreads!);
    expect(deduped.threads).toHaveLength(1);
    expect(deduped.threads[0]!.id).toBe("em-legacy-1");
    expect(deduped.idRemap["em-legacy-dup"]).toBe("em-legacy-1");
    expect(deduped.threads[0]!.linkedFactIds).toEqual([
      "fact-water-1",
      "fact-water-2",
    ]);

    // Reviewable inspection surfaces candidate without mutating session or transcript
    const candidates = inspectLegacyThreadOutcomeCandidates(parsed);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]!.threadId).toBe("em-legacy-1");
    expect(candidates[0]!.suggestedResult).toBe("achieved");
    expect(parsed.emergentThreads![0]!.status).toBe("open");

    // Explicit approval applies outcome without rewriting transcript turns
    const applied = applyReviewedThreadOutcomes(
      parsed,
      [
        {
          threadId: candidates[0]!.threadId,
          result: candidates[0]!.suggestedResult,
          reason: candidates[0]!.reason,
          supportingFactIds: candidates[0]!.supportingFactIds,
        },
      ],
      meta.now,
    );
    expect(applied.dropped).toEqual([]);
    expect(applied.session.emergentThreads).toHaveLength(1);
    expect(applied.session.emergentThreads![0]!.status).toBe("resolved");
    expect(applied.session.emergentThreads![0]!.outcome?.result).toBe(
      "achieved",
    );
    expect(applied.session.turns).toHaveLength(1);

    const approvedDuplicate = applyReviewedThreadOutcomes(
      parsed,
      [
        {
          threadId: "em-legacy-dup",
          result: "achieved",
          reason: "The reviewed duplicate is resolved.",
          supportingFactIds: ["fact-water-1"],
        },
      ],
      meta.now,
    );
    expect(approvedDuplicate.dropped).toEqual([]);
    expect(approvedDuplicate.session.emergentThreads?.[0]?.id).toBe(
      "em-legacy-1",
    );
    expect(
      approvedDuplicate.session.emergentThreads?.[0]?.outcome?.result,
    ).toBe("achieved");

    const nonAsciiTitles = reconcileDuplicateEmergentThreads([
      { ...parsed.emergentThreads![0]!, id: "em-jp-1", title: "王位を守る" },
      { ...parsed.emergentThreads![0]!, id: "em-jp-2", title: "失われた剣" },
    ]);
    expect(nonAsciiTitles.threads).toHaveLength(2);

    // Prompt builds cleanly within budget
    const promptResult = buildAdventurePrompt({
      session: applied.session,
      phase: "action",
      playerAction: "Ask about the forged seal.",
      anchors: [],
      relevant: [],
    });
    expect(promptResult.behavior).toContain("threadOutcomes");
  });

  it("7. selects newly committed goal completion once and persists non-destructive acknowledgement (#5192)", () => {
    let s = session();
    s = commit(
      s,
      {
        playerAction: "Investigate the blocked canal sluice.",
        narration: "You inspect the forged sluice order.",
        provisionalFacts: [
          {
            kind: "clue",
            name: "Forged Order",
            summary: "The sluice was shut with a forged seal.",
            visibility: "player-visible",
          },
        ],
        visiblePatch: {
          ...proposal().visiblePatch,
          knownFacts: {
            add: [
              {
                text: "The eastern sluice was shut with a forged seal.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
      },
      1,
    );
    // Clue turn alone does not trigger completion
    expect(selectPendingAdventureCompletion(s)).toBeNull();

    const threadId = s.emergentThreads![0]!.id;
    s = commit(
      s,
      {
        playerAction: "Present the compact to the council.",
        narration: "The council ratifies and proclaims the water compact.",
        visiblePatch: {
          ...proposal().visiblePatch,
          knownFacts: {
            add: [
              {
                text: "The water-access compact was ratified and publicly proclaimed.",
                source: "provisional",
              },
            ],
            update: [],
            removeIds: [],
          },
        },
        threadOutcomes: [
          {
            threadId,
            goal: "Secure fair water access for the lower ward",
            result: "achieved",
            reason:
              "Council ratified and publicly proclaimed the water-access compact.",
            unresolvedConsequences: ["Who hired the courier remains unknown"],
          },
        ],
      },
      2,
    );

    const pending = selectPendingAdventureCompletion(s);
    expect(pending).not.toBeNull();
    expect(pending?.heading).toBe(
      "Secure fair water access for the lower ward",
    );
    expect(pending?.worldImpacts).toEqual([
      "The water-access compact was ratified and publicly proclaimed.",
    ]);
    expect(pending?.unresolvedConsequences).toEqual([
      "Who hired the courier remains unknown",
    ]);
    expect(pending?.eventId).toBe(
      completionEventId("emergent", threadId, { sourceTurnId: "turn-2" }),
    );

    // Pending roll hides completion until roll settles
    s.pendingRoll = {
      id: "roll-1",
      setupNarration: "Roll",
      uncertainty: "Uncertain",
      stakes: "High",
      sourceRecordIds: [],
    };
    expect(selectPendingAdventureCompletion(s)).toBeNull();
    s.pendingRoll = null;

    // Acknowledging persists on session without closing it
    const ack = acknowledgeAdventureCompletion(
      s,
      pending!.eventId,
      s.revision,
      meta.now,
    );
    expect(ack.ok).toBe(true);
    if (!ack.ok) return;
    expect(ack.changed).toBe(true);
    expect(ack.session.status).toBe("active");
    expect(selectPendingAdventureCompletion(ack.session)).toBeNull();

    // Idempotent repeat acknowledgement is a no-op
    const repeat = acknowledgeAdventureCompletion(
      ack.session,
      pending!.eventId,
      ack.session.revision,
      meta.now,
    );
    expect(repeat.ok).toBe(true);
    if (repeat.ok) expect(repeat.changed).toBe(false);

    // Stale revision fails cleanly
    const stale = acknowledgeAdventureCompletion(
      ack.session,
      "emergent:other:turn-9",
      ack.session.revision - 1,
      meta.now,
    );
    expect(stale).toEqual({ ok: false, reason: "stale-revision" });

    // Advancing another turn does not re-trigger the old completion
    const nextTurn = commit(
      ack.session,
      {
        playerAction: "Ask about the courier.",
        narration: "A clerk points north.",
      },
      3,
    );
    expect(selectPendingAdventureCompletion(nextTurn)).toBeNull();
  });
});
