import { describe, expect, it } from "vitest";
import {
  AdventureTurnGenerationService,
  extractAdventureNarrationPrefix,
} from "./adventure-turn-generation.service";

const session = {
  schemaVersion: 1 as const,
  id: "session-1",
  vaultId: "vault-1",
  title: "Road",
  status: "active" as const,
  createdAt: "2026-08-16T12:00:00.000Z",
  updatedAt: "2026-08-16T12:00:00.000Z",
  lastPlayedAt: "2026-08-16T12:00:00.000Z",
  revision: 0,
  playerCharacter: {
    kind: "provisional" as const,
    name: "Mara",
    description: "Guide",
  },
  premise: "Find the road",
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
};

const completeResponse = JSON.stringify({
  kind: "complete",
  narration: "The road opens.",
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
  revealSecretIds: [],
  provisionalFacts: [],
  sourceRecordIds: [],
});

if (typeof navigator === "undefined") {
  Object.defineProperty(globalThis, "navigator", {
    value: { onLine: true },
    writable: true,
  });
} else {
  Object.defineProperty(navigator, "onLine", {
    value: true,
    writable: true,
  });
}

describe("AdventureTurnGenerationService", () => {
  it("emits only the first top-level player narration from partial JSON", () => {
    expect(
      extractAdventureNarrationPrefix(
        '{"kind":"complete","narration":"The road\\nturns',
      ),
    ).toBe(["The road", "turns"].join(String.fromCharCode(10)));
    expect(
      extractAdventureNarrationPrefix(
        '{"kind":"complete","hiddenPatch":{"gmThreads":[]},' +
          '"narration":"GM private information"}',
      ),
    ).toBe("");
    const rolling = '{"kind":"roll-required","setupNarration":"A shadow';
    expect(extractAdventureNarrationPrefix(rolling)).toBe("A shadow");
  });

  it("streams the player's narration while keeping structured state private", async () => {
    const previews: string[] = [];
    const chunks = [
      '{"kind":"complete","narration":"The gate',
      ' opens.",',
      completeResponse.slice(completeResponse.indexOf('"visiblePatch"')),
    ];
    const service = new AdventureTurnGenerationService({
      async getModel() {
        return {
          async generateContent() {
            throw new Error("buffered generation should not run");
          },
          async *generateContentStream() {
            yield { type: "started" as const };
            for (const text of chunks) yield { type: "delta" as const, text };
            yield { type: "complete" as const, text: completeResponse };
          },
        };
      },
      async sendInteraction() {
        throw new Error("buffered interactions must not run while streaming");
      },
    });
    const result = await service.generate(
      {
        session,
        phase: "action",
        anchors: [],
        relevant: [],
        onNarration: (text) => previews.push(text),
      },
      { apiKey: "direct-test-key" },
    );
    expect(result.kind).toBe("complete");
    expect(previews).toContain("The gate");
    expect(previews.at(-1)).toBe("The road opens.");
    expect(previews.join(" ")).not.toContain("hiddenPatch");
  });

  it("does not publish a partial narration containing an unrevealed secret", async () => {
    const secret = "The miller hid the grain beneath the waterwheel.";
    const protectedSession = {
      ...session,
      hiddenState: {
        secrets: [{ id: "secret-1", text: secret, status: "hidden" as const }],
        gmThreads: [],
      },
    };
    const previews: string[] = [];
    const leakedResponse = completeResponse.replace("The road opens.", secret);
    const service = new AdventureTurnGenerationService({
      async getModel() {
        return {
          async generateContent() {
            throw new Error("buffered generation should not run");
          },
          async *generateContentStream() {
            yield {
              type: "delta" as const,
              text: `{"kind":"complete","narration":"${secret}`,
            };
            yield { type: "complete" as const, text: leakedResponse };
          },
        };
      },
    });

    await service.generate({
      session: protectedSession,
      phase: "action",
      anchors: [],
      relevant: [],
      onNarration: (text) => previews.push(text),
    });

    expect(previews).toEqual([]);
  });

  it("rejects an interrupted stream instead of committing an incomplete turn", async () => {
    const controller = new AbortController();
    const service = new AdventureTurnGenerationService({
      async getModel() {
        return {
          async generateContent() {
            throw new Error("no buffered fallback after stream abort");
          },
          async *generateContentStream() {
            yield {
              type: "delta" as const,
              text: '{"kind":"complete","narration":"A storm',
            };
            controller.abort();
            yield { type: "complete" as const, text: completeResponse };
          },
        };
      },
    });
    const seen: string[] = [];
    await expect(
      service.generate(
        {
          session,
          phase: "action",
          anchors: [],
          relevant: [],
          onNarration: (text) => seen.push(text),
        },
        { signal: controller.signal },
      ),
    ).rejects.toThrow("Cancelled");
    expect(seen).toEqual(["A storm"]);
  });

  it("repairs a malformed stream in a long adventure with a fresh schema-constrained response", async () => {
    const previews: string[] = [];
    const bufferedInputs: any[] = [];
    const oldTurnPatch = JSON.parse(completeResponse);
    const longSession = {
      ...session,
      turns: Array.from({ length: 25 }, (_, sequence) => ({
        id: `turn-${sequence}`,
        sequence,
        inputId: `input-${sequence}`,
        playerAction: `Choice ${sequence}`,
        narration: `Consequence ${sequence}`,
        visiblePatch: oldTurnPatch.visiblePatch,
        hiddenPatch: oldTurnPatch.hiddenPatch,
        revealedSecretIds: [],
        sourceRecordIds: [],
        provisionalFactIds: [],
        committedAt: session.createdAt,
      })),
    };
    let streamedCalls = 0;
    const service = new AdventureTurnGenerationService({
      async getModel() {
        return {
          async generateContent(input: unknown) {
            bufferedInputs.push(input);
            return { response: { text: () => completeResponse } };
          },
          async *generateContentStream() {
            streamedCalls += 1;
            yield {
              type: "delta" as const,
              text: '{"kind":"complete","narration":"Unreliable',
            };
            yield {
              type: "complete" as const,
              text: '{"kind":"complete","narration":"Unreliable",',
            };
          },
        };
      },
      async sendInteraction() {
        throw new Error("repair must use the schema-constrained endpoint");
      },
    });

    const result = await service.generate(
      {
        session: longSession,
        phase: "action",
        playerAction: "Continue after many turns",
        anchors: [],
        relevant: [],
        onNarration: (text) => previews.push(text),
      },
      { apiKey: "direct-test-key" },
    );

    expect(result).toMatchObject({
      kind: "complete",
      narration: "The road opens.",
    });
    expect(streamedCalls).toBe(1);
    expect(bufferedInputs).toHaveLength(1);
    expect(previews).toContain("Unreliable");
    expect(previews.at(-1)).toBe("");
    const input = bufferedInputs[0];
    expect(input.generationConfig.responseSchema.oneOf).toHaveLength(2);
    expect(input.contents[0].parts[0].text).toContain("Choice 24");
    expect(input.contents[0].parts[0].text).not.toContain("Choice 0");
  });

  it("retries a schema-invalid complete stream exactly once", async () => {
    let repairs = 0;
    const service = new AdventureTurnGenerationService({
      async getModel() {
        return {
          async generateContent() {
            repairs += 1;
            return { response: { text: () => completeResponse } };
          },
          async *generateContentStream() {
            yield { type: "complete" as const, text: '{"kind":"complete"}' };
          },
        };
      },
    });
    await expect(
      service.generate({
        session,
        phase: "action",
        anchors: [],
        relevant: [],
        onNarration: () => {},
      }),
    ).resolves.toMatchObject({ kind: "complete" });
    expect(repairs).toBe(1);
  });

  it("fails without committing when both stream and one repair are invalid", async () => {
    let repairs = 0;
    const service = new AdventureTurnGenerationService({
      async getModel() {
        return {
          async generateContent() {
            repairs += 1;
            return { response: { text: () => "not-json" } };
          },
          async *generateContentStream() {
            yield { type: "complete" as const, text: "not-json" };
          },
        };
      },
    });
    await expect(
      service.generate({
        session,
        phase: "action",
        anchors: [],
        relevant: [],
        onNarration: () => {},
      }),
    ).rejects.toThrow("invalid-adventure-response");
    expect(repairs).toBe(1);
    expect(session.turns).toHaveLength(0);
  });

  it("does not send a repair if the player cancels after an invalid stream", async () => {
    const controller = new AbortController();
    let repairs = 0;
    const service = new AdventureTurnGenerationService({
      async getModel() {
        return {
          async generateContent() {
            repairs += 1;
            return { response: { text: () => completeResponse } };
          },
          async *generateContentStream() {
            yield { type: "complete" as const, text: "not-json" };
          },
        };
      },
    });
    await expect(
      service.generate(
        {
          session,
          phase: "action",
          anchors: [],
          relevant: [],
          onNarration: (text) => {
            if (!text) controller.abort();
          },
        },
        { signal: controller.signal },
      ),
    ).rejects.toThrow("Cancelled");
    expect(repairs).toBe(0);
  });

  it("aborts an in-flight structured repair when the player cancels", async () => {
    const controller = new AbortController();
    let retryStarted!: () => void;
    const retryStartedPromise = new Promise<void>((resolve) => {
      retryStarted = resolve;
    });
    let retrySignal: AbortSignal | undefined;
    const service = new AdventureTurnGenerationService({
      async getModel() {
        return {
          async generateContent(
            _input: unknown,
            requestOptions?: { signal?: AbortSignal },
          ) {
            retrySignal = requestOptions?.signal;
            retryStarted();
            await new Promise<void>((_resolve, reject) => {
              const signal = requestOptions?.signal;
              if (!signal) {
                reject(new Error("repair signal was not forwarded"));
                return;
              }
              signal.addEventListener("abort", () => reject(signal.reason), {
                once: true,
              });
            });
            return { response: { text: () => completeResponse } };
          },
          async *generateContentStream() {
            yield { type: "complete" as const, text: "not-json" };
          },
        };
      },
    });

    const generation = service.generate(
      {
        session,
        phase: "action",
        anchors: [],
        relevant: [],
        onNarration: () => {},
      },
      { signal: controller.signal },
    );
    await retryStartedPromise;
    expect(retrySignal).toBe(controller.signal);
    controller.abort();
    await expect(generation).rejects.toThrow();
  });

  it("does not retry a streaming transport failure", async () => {
    let repairs = 0;
    const service = new AdventureTurnGenerationService({
      async getModel() {
        return {
          async generateContent() {
            repairs += 1;
            return { response: { text: () => completeResponse } };
          },
          async *generateContentStream() {
            yield { type: "error" as const, error: "connection-lost" };
          },
        };
      },
    });
    await expect(
      service.generate({
        session,
        phase: "action",
        anchors: [],
        relevant: [],
        onNarration: () => {},
      }),
    ).rejects.toThrow("connection-lost");
    expect(repairs).toBe(0);
  });

  it("forwards a stateless structured-generation request and parses the response", async () => {
    let request: any;
    let systemInstruction = "";
    const service = new AdventureTurnGenerationService({
      async getModel(_apiKey, _modelName, instruction) {
        systemInstruction = instruction ?? "";
        return {
          async generateContent(input: any) {
            request = input;
            return {
              response: {
                text: () =>
                  JSON.stringify({
                    kind: "complete",
                    narration: "The road opens.",
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
                    revealSecretIds: [],
                    provisionalFacts: [],
                    sourceRecordIds: [],
                  }),
              },
            };
          },
        };
      },
    });
    const result = await service.generate({
      session,
      phase: "action",
      playerAction: "Walk",
      anchors: [],
      relevant: [],
    });
    expect(result.kind).toBe("complete");
    expect(request.generationConfig.responseMimeType).toBe("application/json");
    expect(request.generationConfig.responseSchema.oneOf).toHaveLength(2);
    expect(request.generationConfig.responseSchema.oneOf[0].required).toContain(
      "visiblePatch",
    );
    expect(
      request.generationConfig.responseSchema.oneOf[0].properties.visiblePatch
        .properties.activeCharacters.properties.add.items.required,
    ).toEqual(expect.arrayContaining(["text", "source"]));
    expect(
      request.generationConfig.responseSchema.oneOf[0].properties.visiblePatch
        .properties.activeCharacters.properties.add.items.required,
    ).not.toContain("id");
    const userMessage = request.contents[0].parts[0].text;
    const serializedPrompt = JSON.parse(userMessage);
    expect(serializedPrompt.input.adventure.premise).toBe("Find the road");
    expect(serializedPrompt.input.adventure.playerCharacter.name).toBe("Mara");
    expect(serializedPrompt.input.phase).toBe("action");
    expect(serializedPrompt).not.toHaveProperty("behavior");
    expect(systemInstruction).toContain("response schema");
    expect(systemInstruction).toContain('"oneOf"');
    expect(systemInstruction).toContain("lore is GM-only");
    expect(
      request.generationConfig.responseSchema.oneOf[0].properties.narration
        .maxLength,
    ).toBe(2_000);
    expect(
      request.generationConfig.responseSchema.oneOf[1].properties.setupNarration
        .maxLength,
    ).toBe(2_000);
    expect(request).not.toHaveProperty("input");
    expect(request).not.toHaveProperty("previous_interaction_id");
    expect(request).not.toHaveProperty("store");
  });

  it("rejects malformed provider output", async () => {
    const service = new AdventureTurnGenerationService({
      async getModel() {
        return {
          async generateContent() {
            return { response: { text: () => "not-json" } };
          },
        };
      },
    });
    await expect(
      service.generate({
        session,
        phase: "opening",
        anchors: [],
        relevant: [],
      }),
    ).rejects.toThrow("invalid-adventure-response");
  });

  it("keeps a provider conversation for 25 turns, sending only changed state and RAG", async () => {
    const calls: any[] = [];
    const service = new AdventureTurnGenerationService({
      async getModel() {
        throw new Error("stateless client should not be used");
      },
      async sendInteraction(params) {
        calls.push(params);
        return { id: `response-${calls.length}`, text: completeResponse };
      },
    });
    const anchors = [
      {
        recordId: "barrow",
        displayName: "The Barrow",
        content: "A sealed tomb.",
        role: "anchor" as const,
      },
    ];
    for (let turn = 0; turn < 25; turn += 1) {
      await service.generate({
        session: { ...session, revision: turn },
        phase: turn === 0 ? "opening" : "action",
        playerAction: `Choice ${turn}`,
        anchors,
        relevant: [],
      });
      // The test simulates the successful local save, which alone advances
      // the provider continuation pointer.
      service.confirmInteraction(session.id);
    }
    expect(calls).toHaveLength(25);
    expect(calls[0].previousInteractionId).toBeNull();
    expect(calls[1].previousInteractionId).toBe("response-1");
    expect(JSON.parse(calls[0].input).anchors).toHaveLength(1);
    expect(JSON.parse(calls[1].input).anchors).toHaveLength(0);
    expect(JSON.parse(calls[1].input).retainedSourceIds).toEqual(["barrow"]);
    expect(JSON.parse(calls[1].input).state).toBeUndefined();
    expect(JSON.parse(calls[1].input).transcript).toBeUndefined();
    expect(JSON.parse(calls[1].input).stateDelta).toEqual({});
    // A long-running scene keeps its provider conversation beyond turn 20.
    expect(calls[20].previousInteractionId).toBe("response-20");
    expect(JSON.parse(calls[20].input).anchors).toHaveLength(0);
    expect(calls[21].previousInteractionId).toBe("response-21");
  });

  it("restarts a provider conversation when canonical lore changes", async () => {
    const calls: any[] = [];
    const service = new AdventureTurnGenerationService({
      async getModel() {
        throw new Error("unexpected stateless");
      },
      async sendInteraction(params) {
        calls.push(params);
        return { id: `reply-${calls.length}`, text: completeResponse };
      },
    });
    const source = (content: string) => [
      {
        recordId: "town",
        displayName: "Town",
        role: "anchor" as const,
        content,
      },
    ];
    await service.generate({
      session,
      phase: "opening",
      anchors: source("Old town"),
      relevant: [],
    });
    service.confirmInteraction(session.id);
    await service.generate({
      session: { ...session, revision: 1 },
      phase: "action",
      anchors: source("Old town"),
      relevant: [],
    });
    service.confirmInteraction(session.id);
    await service.generate({
      session: { ...session, revision: 2 },
      phase: "action",
      anchors: source("Town was burned down"),
      relevant: [],
    });
    expect(calls[1].previousInteractionId).toBe("reply-1");
    expect(calls[2].previousInteractionId).toBeNull();
    expect(JSON.parse(calls[2].input).anchors[0].content).toBe(
      "Town was burned down",
    );
  });

  it("never resumes an unsaved, cancelled or rejected proposal", async () => {
    const calls: any[] = [];
    const service = new AdventureTurnGenerationService({
      async getModel() {
        throw new Error("unexpected stateless");
      },
      async sendInteraction(params) {
        calls.push(params);
        return { id: `reply-${calls.length}`, text: completeResponse };
      },
    });
    await service.generate({
      session,
      phase: "opening",
      anchors: [],
      relevant: [],
    });
    // No confirmInteraction call: an uncommitted response must not become history.
    await service.generate({
      session,
      phase: "opening",
      anchors: [],
      relevant: [],
    });
    expect(calls[1].previousInteractionId).toBeNull();
    service.confirmInteraction(session.id);
    await service.generate({
      session: { ...session, revision: 1 },
      phase: "action",
      anchors: [],
      relevant: [],
    });
    expect(calls[2].previousInteractionId).toBe("reply-2");
    service.clearInteraction(session.id);
    await service.generate({
      session: { ...session, revision: 1 },
      phase: "action",
      anchors: [],
      relevant: [],
    });
    expect(calls[3].previousInteractionId).toBeNull();
  });

  it("continues after deterministic local dice outcome saves without discarding the provider thread", async () => {
    const calls: any[] = [];
    const service = new AdventureTurnGenerationService({
      async getModel() {
        throw new Error("unexpected stateless generation");
      },
      async sendInteraction(params) {
        calls.push(params);
        return { id: `reply-${calls.length}`, text: completeResponse };
      },
    });
    await service.generate({
      session,
      phase: "opening",
      anchors: [],
      relevant: [],
    });
    service.confirmInteraction(session.id, 1);
    // Deterministic dice outcome save: no generation, only the local
    // revision changes. The next structured turn carries a state delta.
    service.confirmInteraction(session.id, 2);
    await service.generate({
      session: { ...session, revision: 2 },
      phase: "roll-resolution",
      anchors: [],
      relevant: [],
    });
    expect(calls[1].previousInteractionId).toBe("reply-1");
    expect(JSON.parse(calls[1].input)).toHaveProperty("stateDelta");
    expect(JSON.parse(calls[1].input)).not.toHaveProperty("transcript");
  });

  it("streams only player-facing narration while retaining provider history", async () => {
    const previews: string[] = [];
    const calls: any[] = [];
    const service = new AdventureTurnGenerationService({
      async getModel() {
        throw new Error("stateless streaming should not run");
      },
      async *sendInteractionStream(params) {
        calls.push(params);
        yield { type: "started" as const };
        yield {
          type: "delta" as const,
          text: '{"kind":"complete","narration":"The road',
        };
        yield {
          type: "complete" as const,
          text: completeResponse,
          id: `stream-${calls.length}`,
        };
      },
    });
    await service.generate({
      session,
      phase: "opening",
      anchors: [],
      relevant: [],
      onNarration: (text) => previews.push(text),
    });
    service.confirmInteraction(session.id);
    await service.generate({
      session: { ...session, revision: 1 },
      phase: "action",
      anchors: [],
      relevant: [],
      onNarration: (text) => previews.push(text),
    });
    expect(calls[1].previousInteractionId).toBe("stream-1");
    expect(previews).toContain("The road");
    expect(previews.at(-1)).toBe("The road opens.");
  });

  it("recovers a stream that ended early with one buffered request on the same conversation", async () => {
    for (const reason of [
      "interaction-stream-incomplete",
      "interaction-stream-read-error",
    ]) {
      const buffered: any[] = [];
      const streamed: any[] = [];
      const service = new AdventureTurnGenerationService({
        async getModel() {
          throw new Error("stateless generation should not run");
        },
        async *sendInteractionStream(params) {
          streamed.push(params);
          yield {
            type: "delta" as const,
            text: '{"kind":"complete","narration":"The road',
          };
          throw new Error(reason);
        },
        async sendInteraction(params) {
          buffered.push(params);
          return { id: "buffered-1", text: completeResponse };
        },
      });
      const proposal = await service.generate({
        session,
        phase: "action",
        anchors: [],
        relevant: [],
        onNarration: () => {},
      });
      expect(proposal.kind).toBe("complete");
      expect(streamed).toHaveLength(1);
      expect(buffered).toHaveLength(1);
      expect(buffered[0].previousInteractionId).toBe(
        streamed[0].previousInteractionId,
      );
    }
  });

  it("does not fall back to a buffered request for other stream errors or after cancellation", async () => {
    let buffered = 0;
    const base = {
      async getModel(): Promise<never> {
        throw new Error("stateless generation should not run");
      },
      async sendInteraction() {
        buffered += 1;
        return { id: "buffered-1", text: completeResponse };
      },
    };
    const failing = new AdventureTurnGenerationService({
      ...base,
      async *sendInteractionStream() {
        yield { type: "error" as const, error: "interaction-output-too-long" };
      },
    });
    await expect(
      failing.generate({
        session,
        phase: "action",
        anchors: [],
        relevant: [],
        onNarration: () => {},
      }),
    ).rejects.toThrow("interaction-output-too-long");

    const controller = new AbortController();
    const cancelled = new AdventureTurnGenerationService({
      ...base,
      async *sendInteractionStream() {
        yield { type: "started" as const };
        controller.abort();
        throw new Error("interaction-stream-incomplete");
      },
    });
    await expect(
      cancelled.generate(
        {
          session,
          phase: "action",
          anchors: [],
          relevant: [],
          onNarration: () => {},
        },
        { signal: controller.signal },
      ),
    ).rejects.toThrow();
    expect(buffered).toBe(0);
  });

  it("repairs one malformed retained-conversation response before failing", async () => {
    const calls: any[] = [];
    const service = new AdventureTurnGenerationService({
      async getModel() {
        throw new Error("stateless client should not be used");
      },
      async sendInteraction(params) {
        calls.push(params);
        return {
          id: `response-${calls.length}`,
          text: calls.length === 1 ? '{"kind":"complete"}' : completeResponse,
        };
      },
    });

    await expect(
      service.generate({
        session,
        phase: "opening",
        anchors: [],
        relevant: [],
      }),
    ).resolves.toMatchObject({ kind: "complete" });
    expect(calls).toHaveLength(2);
    expect(JSON.parse(calls[1].input).state).toEqual(
      JSON.parse(calls[0].input).state,
    );
    expect(JSON.parse(calls[1].input).responseRepair).toContain(
      "Previous JSON failed validation",
    );
  });

  it("forgets a cancelled session's retained context", async () => {
    const calls: any[] = [];
    const service = new AdventureTurnGenerationService({
      async getModel() {
        throw new Error("stateless client should not be used");
      },
      async sendInteraction(params) {
        calls.push(params);
        return { id: `response-${calls.length}`, text: completeResponse };
      },
    });

    await service.generate({
      session,
      phase: "opening",
      anchors: [],
      relevant: [],
    });
    service.clearInteraction(session.id);
    await service.generate({
      session,
      phase: "action",
      anchors: [],
      relevant: [],
    });

    expect(calls[1].previousInteractionId).toBeNull();
  });
});
