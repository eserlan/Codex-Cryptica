import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseAdventureSession } from "@codex/adventure-engine";
import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";
import { AdventureFocusCompletion } from "./adventure-focus-completion.svelte.js";

const disposers: Array<() => void> = [];
afterEach(() => disposers.splice(0).forEach((dispose) => dispose()));

function completedSession() {
  const now = "2026-11-27T00:00:00.000Z";
  const emptyPatch = () => ({ add: [], update: [], removeIds: [] });
  return parseAdventureSession({
    schemaVersion: 3,
    id: "session-1",
    vaultId: "vault-1",
    title: "The eastern gate",
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastPlayedAt: now,
    revision: 1,
    playerCharacter: {
      kind: "provisional",
      name: "Mara",
      description: "A guide",
    },
    premise: "Open the eastern gate",
    sourceRecords: [],
    visibleState: {
      objectives: [],
      activeCharacters: [],
      knownFacts: [
        {
          id: "impact-1",
          text: "The eastern gate is open.",
          source: "provisional",
        },
      ],
      relationships: [],
    },
    hiddenState: { secrets: [], gmThreads: [] },
    provisionalFacts: [],
    pendingRoll: null,
    turns: [
      {
        id: "turn-1",
        sequence: 1,
        inputId: "input-1",
        playerAction: "Open the gate",
        narration: "The eastern gate swings open.",
        visiblePatch: {
          objectives: emptyPatch(),
          activeCharacters: emptyPatch(),
          knownFacts: emptyPatch(),
          relationships: emptyPatch(),
        },
        hiddenPatch: { secrets: emptyPatch(), gmThreads: emptyPatch() },
        revealedSecretIds: [],
        sourceRecordIds: [],
        provisionalFactIds: [],
        committedAt: now,
      },
    ],
    emergentThreads: [
      {
        id: "thread-1",
        title: "Open the eastern gate",
        goal: "Open the eastern gate",
        status: "resolved",
        provenance: "play",
        topicTokens: [],
        linkedPersonIds: [],
        linkedPlaceIds: [],
        linkedFactIds: ["impact-1"],
        linkedCommitmentIds: [],
        openQuestions: [],
        knownConsequences: [],
        gmOnlyDevelopments: [],
        createdAtTurnId: "turn-1",
        updatedAtTurnId: "turn-1",
        turnCount: 1,
        outcome: {
          result: "achieved",
          reason: "The gate was opened.",
          sourceTurnId: "turn-1",
          supportingFactIds: ["impact-1"],
          supportingCommitmentIds: [],
          recordedAt: now,
          sequence: 1,
        },
      },
    ],
  });
}

function setup() {
  const manager = $state({
    session: completedSession(),
    phase: "ready",
    streamedNarration: "",
    readOnly: false,
    acknowledgeCompletion: vi.fn().mockResolvedValue(undefined),
  });
  let completion!: AdventureFocusCompletion;
  disposers.push(
    $effect.root(() => {
      completion = new AdventureFocusCompletion(
        () => manager as unknown as AdventureManager,
        vi.fn(),
        { notify: vi.fn() },
      );
      // The surface and story both consume these derived values.
      $effect(() => {
        void completion.pending;
        void completion.continuations;
      });
    }),
  );
  flushSync();
  return { manager, completion };
}

describe("AdventureFocusCompletion derived state", () => {
  it("shares completion and continuation selections until their session inputs change", () => {
    const { manager, completion } = setup();
    const pending = completion.pending;
    const continuations = completion.continuations;
    expect(pending?.eventId).toBe("emergent:thread-1:turn-1");
    expect(continuations?.sourceOutcomeId).toBe(pending?.eventId);
    expect(completion.pending).toBe(pending);
    expect(completion.continuations).toBe(continuations);

    manager.session.visibleState.knownFacts[0]!.text =
      "The eastern gate remains open.";
    manager.session.revision = 2;
    expect(completion.pending).not.toBe(pending);
    expect(completion.pending?.worldImpacts).toEqual([
      "The eastern gate remains open.",
    ]);
    expect(completion.continuations).not.toBe(continuations);
    expect(completion.continuations?.sourceRevision).toBe(2);
  });

  it.each(["generation", "streaming", "roll"] as const)(
    "hides cached completion choices during %s and restores them afterwards",
    (busy) => {
      const { manager, completion } = setup();
      expect(completion.pending).not.toBeNull();
      if (busy === "generation") manager.phase = "generating";
      if (busy === "streaming") manager.streamedNarration = "The gate opens";
      if (busy === "roll") {
        manager.session.pendingRoll = {
          id: "roll-1",
          inputId: "input-2",
          playerAction: "Hold the gate open",
          uncertainty: "Can the gate stay open?",
          stakes: "The gate might close",
          resolutionStatus: "awaiting-outcome",
          createdAt: manager.session.updatedAt,
        };
      }
      expect(completion.pending).toBeNull();
      expect(completion.continuations).toBeNull();
      manager.phase = "ready";
      manager.streamedNarration = "";
      manager.session.pendingRoll = null;
      expect(completion.pending?.eventId).toBe("emergent:thread-1:turn-1");
      expect(completion.continuations?.sourceOutcomeId).toBe(
        "emergent:thread-1:turn-1",
      );
    },
  );

  it("invalidates both selections after local dismissal even when saving fails", async () => {
    const { manager, completion } = setup();
    const eventId = completion.pending!.eventId;
    expect(completion.continuations).not.toBeNull();
    manager.acknowledgeCompletion.mockRejectedValueOnce(new Error("save"));
    await completion.continueExploring(eventId);
    expect(manager.acknowledgeCompletion).toHaveBeenCalledWith(eventId);
    expect(completion.pending).toBeNull();
    expect(completion.continuations).toBeNull();
  });
});
