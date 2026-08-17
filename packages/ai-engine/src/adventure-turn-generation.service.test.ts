import { describe, expect, it } from "vitest";
import { AdventureTurnGenerationService } from "./adventure-turn-generation.service";

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

describe("AdventureTurnGenerationService", () => {
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
    ).toEqual(expect.arrayContaining(["id", "text", "source"]));
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

  it("retains Luna context and only sends new sources until the refresh turn", async () => {
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

    await service.generate({
      session,
      phase: "opening",
      anchors,
      relevant: [],
    });
    await service.generate({
      session,
      phase: "action",
      playerAction: "Approach the hill.",
      anchors,
      relevant: [],
    });

    expect(calls[0].previousInteractionId).toBeNull();
    expect(calls[1].previousInteractionId).toBe("response-1");
    expect(JSON.parse(calls[0].input).anchors).toHaveLength(1);
    expect(JSON.parse(calls[1].input).anchors).toEqual([]);
    expect(JSON.parse(calls[1].input).retainedSourceIds).toEqual(["barrow"]);

    for (let turn = 0; turn < 19; turn += 1) {
      await service.generate({
        session,
        phase: "action",
        playerAction: `Continue ${turn}`,
        anchors,
        relevant: [],
      });
    }
    expect(JSON.parse(calls.at(-1)?.input ?? "{}").anchors).toHaveLength(1);
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
    expect(JSON.parse(calls[1].input).responseRepair).toContain(
      "previous response was invalid",
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
