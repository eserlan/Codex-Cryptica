import { describe, expect, it, vi } from "vitest";
import {
  buildAdventureRecap,
  createPlayerTranscript,
  OOC_REDIRECT_TO_PLAY_REPLY,
  OOC_SAFE_SECRET_REPLY,
  parseAdventureSession,
  type AdventureOocRequest,
} from "@codex/adventure-engine";
import { AdventureManager } from "../adventure-manager.svelte";
import {
  completeProposal,
  dependencies,
  packageCacheFor,
  packageRefFor,
  startInput,
} from "./adventure-fixtures";
import { canaryReferencePackage, canarySecretText } from "./gm-canary-fixture";
import { assertNoGmLeak, collectGmOnlyStrings } from "./gm-leak-harness";

describe("AdventureManager Ask GM (OOC) clarifications", () => {
  it("rejects oversized questions without saving or calling the model", async () => {
    const base = dependencies();
    const ask = vi.fn();
    const manager = new AdventureManager({ ...base, ooc: { ask } } as any);
    await manager.start(startInput);
    await manager.submitOocQuestion("x".repeat(601));
    expect(manager.oocErrorMessage).toContain("600");
    expect(manager.oocExchanges).toHaveLength(0);
    expect(ask).not.toHaveBeenCalled();
  });

  it("marks a cancelled pending question as failed", async () => {
    const base = dependencies();
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    const ask = vi.fn(
      (_request: unknown, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          started();
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    const manager = new AdventureManager({ ...base, ooc: { ask } } as any);
    await manager.start(startInput);
    const request = manager.submitOocQuestion("What happened?");
    await ready;
    manager.cancel();
    await request;
    expect(manager.oocExchanges[0]).toMatchObject({
      status: "failed",
      errorMessage: "Question cancelled.",
    });
    expect(manager.oocGenerating).toBe(false);
  });

  it("aborts OOC work on destroy without publishing a stale failure", async () => {
    const base = dependencies();
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    const ask = vi.fn(
      (_request: unknown, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          started();
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    const manager = new AdventureManager({ ...base, ooc: { ask } } as any);
    await manager.start(startInput);

    const request = manager.submitOocQuestion("What happened?");
    await ready;
    await manager.destroy();
    await request;

    expect(ask.mock.calls[0]?.[1].signal.aborted).toBe(true);
    expect(manager.oocErrorMessage).toBeNull();
    expect(manager.oocGenerating).toBe(false);
  });

  it("keeps non-Error provider failures visible and retryable", async () => {
    const base = dependencies();
    const manager = new AdventureManager({
      ...base,
      ooc: { ask: vi.fn(async () => Promise.reject("provider unavailable")) },
    } as any);
    await manager.start(startInput);

    await manager.submitOocQuestion("What happened?");

    expect(manager.oocErrorMessage).toBe("provider unavailable");
    expect(manager.oocExchanges[0]).toMatchObject({
      status: "failed",
      errorMessage: "provider unavailable",
    });
  });

  it("allows retrying a persisted pending question after reopening", async () => {
    const base = dependencies();
    let storedSession: any = null;
    const askOoc = vi.fn(async (request: AdventureOocRequest) => ({
      kind: "ooc" as const,
      answer: `Clarified: ${request.question}`,
    }));
    const deps = {
      ...base,
      repository: {
        ...base.repository,
        async save(_rev: number | null, session: any) {
          storedSession = parseAdventureSession(
            JSON.parse(JSON.stringify(session)),
          );
          return { ok: true, session: storedSession };
        },
        async load() {
          return { condition: "normal" as const, session: storedSession };
        },
      },
      ooc: { ask: askOoc },
    };
    const first = new AdventureManager(deps as any);
    await first.start(startInput);
    const pending = {
      id: "ooc-interrupted",
      kind: "ooc",
      question: "Where is the exit?",
      status: "pending",
      afterTurnCount: first.session!.turns.length,
      createdAt: "2026-11-20T12:00:00.000Z",
      updatedAt: "2026-11-20T12:00:00.000Z",
    };
    storedSession = parseAdventureSession({
      ...storedSession,
      revision: storedSession.revision + 1,
      oocExchanges: [pending],
    });

    const reopened = new AdventureManager(deps as any);
    await reopened.open(startInput.vaultId, first.session!.id);
    expect(reopened.oocExchanges[0]?.status).toBe("pending");

    await reopened.retryOocQuestion("ooc-interrupted");

    expect(reopened.oocExchanges[0]).toMatchObject({
      status: "answered",
      answer: "Clarified: Where is the exit?",
    });
  });

  it("prevents OOC and roll persistence from overlapping", async () => {
    const base = dependencies();
    let releaseAsk!: () => void;
    let askStarted!: () => void;
    const askReady = new Promise<void>((resolve) => {
      askStarted = resolve;
    });
    const ask = vi.fn(
      () =>
        new Promise<{ kind: "ooc"; answer: string }>((resolve) => {
          releaseAsk = () =>
            resolve({ kind: "ooc", answer: "The exit is east." });
          askStarted();
        }),
    );
    const manager = new AdventureManager({ ...base, ooc: { ask } } as any);
    await manager.start(startInput);
    manager.rollMutationPending = true;
    await manager.submitOocQuestion("A concurrent question");
    expect(ask).not.toHaveBeenCalled();
    manager.rollMutationPending = false;
    manager.session!.pendingRoll = {
      id: "roll-ooc-overlap",
      inputId: "input-roll-ooc-overlap",
      playerAction: "Cross the bridge",
      uncertainty: "Will it hold?",
      stakes: "The crossing could collapse.",
      resolutionStatus: "awaiting-outcome",
      createdAt: "2026-11-20T12:00:00.000Z",
    };

    const oocRequest = manager.submitOocQuestion("What is the bridge made of?");
    await askReady;
    const revisionDuringOoc = manager.session!.revision;
    await manager.recordRollOutcome({ kind: "numeric", value: 12 });
    expect(manager.session!.revision).toBe(revisionDuringOoc);
    expect(manager.session!.pendingRoll?.suppliedOutcome).toBeUndefined();

    releaseAsk();
    await oocRequest;
    expect(manager.oocExchanges[0]?.status).toBe("answered");
    expect(manager.session!.pendingRoll?.suppliedOutcome).toBeUndefined();
  });

  it("answers OOC questions without advancing turns, world time, rolls, discoveries, or provider turn interactions", async () => {
    const base = dependencies();
    const oocRequests: AdventureOocRequest[] = [];
    const generateTurn = vi.fn(async () => ({
      ...completeProposal,
      narration:
        "Briefing terminal: salvage contract pays 60kcr for each survivor brought back alive.",
    }));
    const askOoc = vi.fn(async (request: AdventureOocRequest) => {
      oocRequests.push(request);
      return {
        kind: "ooc" as const,
        answer:
          "According to the contract briefing, the payout is 60kcr per survivor.",
      };
    });
    const confirmInteraction = vi.fn(
      async (_sessionId: string, _revision?: number) => {},
    );

    const manager = new AdventureManager({
      ...base,
      generation: { generate: generateTurn },
      ooc: { ask: askOoc },
      confirmGenerationInteraction: confirmInteraction,
    } as any);

    await manager.start({
      ...startInput,
      title: "Electric Razor",
      premise: "Salvage contract pays 60kcr for each survivor.",
    });

    expect(manager.composerMode).toBe("play");
    expect(manager.session?.turns).toHaveLength(1);
    const turnsBefore = structuredClone(manager.session!.turns);
    const visibleBefore = structuredClone(manager.session!.visibleState);
    const hiddenBefore = structuredClone(manager.session!.hiddenState);
    const factsBefore = structuredClone(manager.session!.provisionalFacts);
    const worldTimeBefore = structuredClone(manager.session!.worldTime);
    const recapBefore = buildAdventureRecap(manager.session!);
    const transcriptBefore = createPlayerTranscript(manager.session!);

    generateTurn.mockClear();
    confirmInteraction.mockClear();

    manager.setComposerMode("ooc");
    manager.oocDraft = "How much for each survivor?";
    await manager.submitOocQuestion();

    expect(generateTurn).not.toHaveBeenCalled();
    expect(confirmInteraction.mock.calls.map((call) => call[1])).toEqual([
      2, 3,
    ]);
    expect(askOoc).toHaveBeenCalledTimes(1);
    expect(oocRequests[0]?.kind).toBe("ooc");
    expect(manager.oocDraft).toBe("");
    expect(manager.oocExchanges).toHaveLength(1);
    expect(manager.oocExchanges[0]).toMatchObject({
      kind: "ooc",
      question: "How much for each survivor?",
      answer:
        "According to the contract briefing, the payout is 60kcr per survivor.",
      status: "answered",
      afterTurnCount: 1,
    });

    // Zero gameplay state mutation
    expect(manager.session!.turns).toEqual(turnsBefore);
    expect(manager.session!.visibleState).toEqual(visibleBefore);
    expect(manager.session!.hiddenState).toEqual(hiddenBefore);
    expect(manager.session!.provisionalFacts).toEqual(factsBefore);
    expect(manager.session!.worldTime).toEqual(worldTimeBefore);
    expect(buildAdventureRecap(manager.session!)).toEqual(recapBefore);
    expect(createPlayerTranscript(manager.session!)).toEqual(transcriptBefore);
  });

  it("redirects in-world action questions to Play mode without calling the model or mutating state", async () => {
    const base = dependencies();
    const askOoc = vi.fn(async () => ({
      kind: "ooc" as const,
      answer: "Should not be called",
    }));
    const generateTurn = vi.fn(async () => completeProposal);

    const manager = new AdventureManager({
      ...base,
      generation: { generate: generateTurn },
      ooc: { ask: askOoc },
    } as any);

    await manager.start(startInput);
    generateTurn.mockClear();

    await manager.submitOocQuestion("Can I search the terminal?");

    expect(askOoc).not.toHaveBeenCalled();
    expect(generateTurn).not.toHaveBeenCalled();
    expect(manager.oocExchanges).toHaveLength(1);
    expect(manager.oocExchanges[0]?.status).toBe("answered");
    expect(manager.oocExchanges[0]?.answer).toBe(OOC_REDIRECT_TO_PLAY_REPLY);
    expect(manager.session?.turns).toHaveLength(1);
  });

  it("blocks GM-only package and session secrets from both OOC prompt input and OOC responses", async () => {
    const base = dependencies();
    const guarded = collectGmOnlyStrings(canaryReferencePackage);
    const capturedPrompts: string[] = [];

    const askOoc = vi.fn(async (request: AdventureOocRequest) => {
      capturedPrompts.push(request.serializedPrompt);
      // Simulate a misbehaving model trying to leak a package secret
      return {
        kind: "ooc" as const,
        answer: `The secret in the wall is: ${canarySecretText}`,
      };
    });

    const manager = new AdventureManager({
      ...base,
      packages: packageCacheFor(canaryReferencePackage),
      ooc: { ask: askOoc },
    } as any);

    await manager.start({
      ...startInput,
      sourcePackage: packageRefFor(canaryReferencePackage),
    });

    await manager.submitOocQuestion(
      "What is hidden behind the mill wheel wall?",
    );

    expect(capturedPrompts).toHaveLength(1);
    // Input prompt sent to OOC model must contain zero GM-only strings from the package
    assertNoGmLeak(guarded, capturedPrompts[0], "OOC model input prompt");

    // Leaked response is replaced by the safe refusal
    expect(manager.oocExchanges).toHaveLength(1);
    expect(manager.oocExchanges[0]?.answer).toBe(OOC_SAFE_SECRET_REPLY);
    assertNoGmLeak(guarded, manager.oocExchanges, "persisted OOC exchanges");
  });

  it("keeps failed OOC requests tagged as ooc, supports retryOocQuestion, and survives reload/resume", async () => {
    const base = dependencies();
    let storedSession: any = null;
    let shouldFail = true;
    const generateTurn = vi.fn(async () => completeProposal);
    const askOoc = vi.fn(async (request: AdventureOocRequest) => {
      if (shouldFail) throw new Error("provider-timeout");
      return {
        kind: "ooc" as const,
        answer: `Clarified: ${request.question}`,
      };
    });

    const deps = {
      ...base,
      repository: {
        ...base.repository,
        async save(_rev: number | null, session: any) {
          storedSession = parseAdventureSession(
            JSON.parse(JSON.stringify(session)),
          );
          return { ok: true, session: storedSession };
        },
        async load() {
          return { condition: "normal" as const, session: storedSession };
        },
      },
      generation: { generate: generateTurn },
      ooc: { ask: askOoc },
    };

    const manager = new AdventureManager(deps as any);
    await manager.start(startInput);
    generateTurn.mockClear();

    manager.oocDraft = "What can I see here?";
    await manager.submitOocQuestion();

    expect(generateTurn).not.toHaveBeenCalled();
    expect(manager.oocErrorMessage).toBe("provider-timeout");
    expect(manager.oocDraft).toBe("What can I see here?");
    expect(manager.oocExchanges).toHaveLength(1);
    expect(manager.oocExchanges[0]).toMatchObject({
      kind: "ooc",
      question: "What can I see here?",
      status: "failed",
      errorMessage: "provider-timeout",
    });

    // Retry the failed OOC question — must stay on the OOC path and never submit a Play turn
    shouldFail = false;
    const exchangeId = manager.oocExchanges[0]!.id;
    await manager.retryOocQuestion(exchangeId);

    expect(generateTurn).not.toHaveBeenCalled();
    expect(manager.oocErrorMessage).toBeNull();
    expect(manager.oocExchanges).toHaveLength(1);
    expect(manager.oocExchanges[0]).toMatchObject({
      id: exchangeId,
      kind: "ooc",
      status: "answered",
      answer: "Clarified: What can I see here?",
    });

    // Reload session in a fresh manager instance and verify OOC history persists and composer defaults to Play
    const sessionId = manager.session!.id;
    await manager.close();
    const reloaded = new AdventureManager(deps as any);
    await reloaded.open(startInput.vaultId, sessionId);

    expect(reloaded.composerMode).toBe("play");
    expect(reloaded.oocExchanges).toHaveLength(1);
    expect(reloaded.oocExchanges[0]?.answer).toBe(
      "Clarified: What can I see here?",
    );
  });

  it("reconciles Play interaction revision across consecutive OOC saves", async () => {
    const base = dependencies();
    const confirmGenerationInteraction = vi.fn(
      async (_sessionId: string, _revision?: number) => undefined,
    );
    const manager = new AdventureManager({
      ...base,
      confirmGenerationInteraction,
      ooc: {
        ask: vi.fn(
          async (request: AdventureOocRequest) =>
            `Clarified: ${request.question}`,
        ),
      },
    } as any);
    await manager.start(startInput);
    confirmGenerationInteraction.mockClear();

    await manager.submitOocQuestion("First?");
    await manager.submitOocQuestion("Second?");
    await manager.submitOocQuestion("Third?");

    // Each OOC exchange saves pending (+1) then answered (+1) = 6 confirmations
    expect(confirmGenerationInteraction).toHaveBeenCalledTimes(6);
    const revisions = confirmGenerationInteraction.mock.calls.map(
      (call) => call[1],
    );
    expect(revisions).toEqual([2, 3, 4, 5, 6, 7]);
  });

  it("commits established OOC decisions atomically into provisionalFacts while leaving hypotheticals and leaks uncommitted", async () => {
    const base = dependencies();
    let replyIndex = 0;
    const replies = [
      {
        kind: "ooc" as const,
        answer:
          "Envoy Ilona Marshall is the council's quest giver at the old weigh-house.",
        classification: "established" as const,
        decisions: [
          {
            kind: "person" as const,
            name: "Envoy Ilona Marshall",
            summary: "Council liaison and quest giver at the old weigh-house.",
            visibility: "player-visible" as const,
          },
        ],
      },
      {
        kind: "ooc" as const,
        answer:
          "Hypothetically, a smuggler could have intercepted the message.",
        classification: "hypothetical" as const,
        decisions: [
          {
            kind: "person" as const,
            name: "Hypothetical Smuggler",
            summary: "Should never be committed.",
            visibility: "player-visible" as const,
          },
        ],
      },
      {
        kind: "ooc" as const,
        answer: "Safe looking reply",
        classification: "established" as const,
        decisions: [
          {
            kind: "clue" as const,
            name: "Secret",
            summary: canarySecretText,
            visibility: "player-visible" as const,
          },
        ],
      },
    ];
    const manager = new AdventureManager({
      ...base,
      packages: packageCacheFor(canaryReferencePackage),
      ooc: {
        ask: vi.fn(async () => replies[replyIndex++]!),
      },
    } as any);
    await manager.start({
      ...startInput,
      sourcePackage: packageRefFor(canaryReferencePackage),
    });
    const turnsBefore = manager.session!.turns.length;

    await manager.submitOocQuestion("Who is the quest giver?");
    expect(manager.session?.turns).toHaveLength(turnsBefore);
    expect(manager.session?.provisionalFacts).toContainEqual(
      expect.objectContaining({
        kind: "person",
        name: "Envoy Ilona Marshall",
        provenance: "ooc",
        sourceOocExchangeId: manager.oocExchanges[0]?.id,
      }),
    );

    const factCountAfterEstablished = manager.session!.provisionalFacts.length;
    await manager.submitOocQuestion("What if the quest giver were a smuggler?");
    expect(manager.session!.provisionalFacts).toHaveLength(
      factCountAfterEstablished,
    );

    await manager.submitOocQuestion("Who is secretly behind this?");
    expect(manager.session!.provisionalFacts).toHaveLength(
      factCountAfterEstablished,
    );
    expect(manager.oocExchanges.at(-1)?.answer).toBe(OOC_SAFE_SECRET_REPLY);
    expect(manager.oocExchanges.at(-1)?.classification).toBe("secret-refusal");
  });
});
