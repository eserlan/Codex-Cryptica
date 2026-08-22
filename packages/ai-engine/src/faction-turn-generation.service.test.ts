import { describe, expect, it, vi } from "vitest";
import {
  FactionTurnGenerationService,
  FACTION_AI_TIMEOUT_MS,
  type FactionAiClient,
  type FactionTurnAiRequest,
} from "./faction-turn-generation.service";

function request(
  over: Partial<FactionTurnAiRequest> = {},
): FactionTurnAiRequest {
  return {
    factionTitle: "Black Eagles",
    factionSummary: "Mercenaries of the northern lakes.",
    targetTitle: "Mub Territory",
    targetSummary: "A contested march.",
    resolution: {
      actingLabel: "Political Reach",
      actingValue: 6,
      opposingValue: 5,
      oppositionDetail: "Held by no faction.",
      rollTotal: 7,
      total: 13,
      mechanicalBand: "success",
      permittedBands: ["decisive-success", "success", "mixed"],
    },
    existingHold: [],
    wantBandSelection: true,
    wantNarration: true,
    ...over,
  };
}

function clientReturning(text: string): FactionAiClient {
  return {
    getModel: async () => ({
      generateContent: async () => ({ response: { text: () => text } }),
    }),
  };
}

function clientThrowing(error: Error): FactionAiClient {
  return {
    getModel: async () => {
      throw error;
    },
  };
}

/**
 * The contract that separates this service from its adventure-mode sibling:
 * it must never reject. FR-021d makes "a turn is never blocked by AI" a hard
 * requirement, so callers are entitled to omit a try/catch entirely.
 */
describe("never rejects (FR-021d, SC-012)", () => {
  it("resolves when the provider is unreachable", async () => {
    const service = new FactionTurnGenerationService({
      client: clientThrowing(new Error("network down")),
    });
    await expect(service.generate(request())).resolves.toMatchObject({
      band: null,
      narrative: null,
      aiUsed: false,
    });
  });

  it("resolves when the provider rate-limits", async () => {
    const service = new FactionTurnGenerationService({
      client: clientThrowing(new Error("429 Too Many Requests")),
    });
    await expect(service.generate(request())).resolves.toMatchObject({
      aiUsed: false,
    });
  });

  it("resolves when the response is not JSON", async () => {
    const service = new FactionTurnGenerationService({
      client: clientReturning("I'm afraid I can't do that."),
    });
    await expect(service.generate(request())).resolves.toMatchObject({
      aiUsed: false,
    });
  });

  it("resolves when the response is JSON but not an object", async () => {
    const service = new FactionTurnGenerationService({
      client: clientReturning('"just a string"'),
    });
    await expect(service.generate(request())).resolves.toMatchObject({
      aiUsed: false,
    });
  });

  it("resolves when the model times out", async () => {
    const hanging: FactionAiClient = {
      getModel: async () => ({
        generateContent: () => new Promise(() => {}),
      }),
    };
    const service = new FactionTurnGenerationService({
      client: hanging,
      timeoutMs: 10,
    });
    await expect(service.generate(request())).resolves.toMatchObject({
      aiUsed: false,
    });
  });
});

describe("switches (FR-021f, Constitution V)", () => {
  it("makes no call at all when both switches are off", async () => {
    const getModel = vi.fn();
    const service = new FactionTurnGenerationService({
      client: { getModel } as unknown as FactionAiClient,
    });
    const result = await service.generate(
      request({ wantBandSelection: false, wantNarration: false }),
    );
    // The privacy guarantee: with AI off, no faction or target data leaves
    // the device at all.
    expect(getModel).not.toHaveBeenCalled();
    expect(result.aiUsed).toBe(false);
  });

  it("ignores a returned band when band selection is off", async () => {
    const service = new FactionTurnGenerationService({
      client: clientReturning(
        JSON.stringify({ band: "mixed", reason: "x", narrative: "Prose." }),
      ),
    });
    const result = await service.generate(
      request({ wantBandSelection: false }),
    );
    expect(result.band).toBe(null);
    expect(result.narrative).toBe("Prose.");
  });

  it("includes expanded participant lore only when the caller opts in", async () => {
    const generateContent = vi.fn(async () => ({
      response: { text: () => JSON.stringify({ narrative: "Prose." }) },
    }));
    const getModel = vi.fn(async () => ({ generateContent }));
    const service = new FactionTurnGenerationService({ client: { getModel } });

    await service.generate(
      request({
        participantLore: {
          faction: {
            aliases: ["The Eagles"],
            lore: "They once ruled the northern lakes.",
            connections: [
              { entityTitle: "Lakeguard", type: "ally", strength: 8 },
            ],
          },
          target: {
            aliases: [],
            lore: "A bitterly contested march.",
            connections: [],
          },
        },
      }),
    );

    const input = generateContent.mock.calls[0]?.[0] as {
      contents: { parts: { text: string }[] }[];
    };
    expect(input.contents[0]?.parts[0]?.text).toContain("The Eagles");
    expect(input.contents[0]?.parts[0]?.text).toContain(
      "They once ruled the northern lakes.",
    );
    expect(input.contents[0]?.parts[0]?.text).toContain("Lakeguard");

    generateContent.mockClear();
    await service.generate(request());
    const defaultInput = generateContent.mock.calls[0]?.[0] as {
      contents: { parts: { text: string }[] }[];
    };
    expect(defaultInput.contents[0]?.parts[0]?.text).not.toContain(
      "The Eagles",
    );
  });
});

describe("response handling", () => {
  it("returns a usable band, reason and narrative", async () => {
    const service = new FactionTurnGenerationService({
      client: clientReturning(
        JSON.stringify({
          band: "decisive-success",
          reason: "A former province of theirs.",
          narrative: "The Eagles walked in unopposed.",
        }),
      ),
    });
    const result = await service.generate(request());
    expect(result.band).toBe("decisive-success");
    expect(result.reason).toBe("A former province of theirs.");
    expect(result.narrative).toBe("The Eagles walked in unopposed.");
    expect(result.aiUsed).toBe(true);
  });

  it("rejects a band that is not one of the five", async () => {
    const service = new FactionTurnGenerationService({
      client: clientReturning(
        JSON.stringify({ band: "catastrophe", narrative: "Prose." }),
      ),
    });
    const result = await service.generate(request());
    expect(result.band).toBe(null);
  });

  it("keeps a usable narrative even when the band is unusable", async () => {
    // The two are independent: losing the band should not cost the prose.
    const service = new FactionTurnGenerationService({
      client: clientReturning(
        JSON.stringify({ band: 42, narrative: "Something happened." }),
      ),
    });
    const result = await service.generate(request());
    expect(result.band).toBe(null);
    expect(result.narrative).toBe("Something happened.");
  });

  it("treats a blank narrative as absent", async () => {
    const service = new FactionTurnGenerationService({
      client: clientReturning(JSON.stringify({ narrative: "   " })),
    });
    const result = await service.generate(request());
    expect(result.narrative).toBe(null);
  });

  it("treats a blank reason as absent, so the band change can be rejected", async () => {
    const service = new FactionTurnGenerationService({
      client: clientReturning(
        JSON.stringify({ band: "mixed", reason: "  ", narrative: "Prose." }),
      ),
    });
    const result = await service.generate(request());
    expect(result.reason).toBe(null);
  });

  it("does not read any field beyond band, reason and narrative (FR-021e)", async () => {
    const service = new FactionTurnGenerationService({
      client: clientReturning(
        JSON.stringify({
          band: "mixed",
          reason: "Fine.",
          narrative: "Prose.",
          strengthDelta: 99,
          statDelta: 99,
          canAct: true,
        }),
      ),
    });
    const result = await service.generate(request());
    expect(Object.keys(result).sort()).toEqual(
      ["aiUsed", "band", "narrative", "reason"].sort(),
    );
  });
});

describe("timeout constant", () => {
  it("is exported so retuning it is a one-line change", () => {
    expect(FACTION_AI_TIMEOUT_MS).toBe(8000);
  });

  it("can be overridden per instance for tests", async () => {
    const service = new FactionTurnGenerationService({
      client: {
        getModel: async () => ({
          generateContent: () => new Promise(() => {}),
        }),
      },
      timeoutMs: 5,
    });
    const start = Date.now();
    await service.generate(request());
    expect(Date.now() - start).toBeLessThan(FACTION_AI_TIMEOUT_MS);
  });
});
