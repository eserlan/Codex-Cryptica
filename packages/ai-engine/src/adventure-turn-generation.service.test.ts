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
};

describe("AdventureTurnGenerationService", () => {
  it("forwards a stateless structured-generation request and parses the response", async () => {
    let request: any;
    const service = new AdventureTurnGenerationService({
      async getModel() {
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
});
