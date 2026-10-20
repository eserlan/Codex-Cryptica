import { describe, expect, it } from "vitest";
import { getGenerator } from "./campaign-generator-registry";
import {
  generateBusinessWithAI,
  businessOptionsFromRequest,
} from "./campaign-business-generation";
import type {
  AIGeneratorGateway,
  GeneratorRunRequest,
} from "./campaign-generator-types";
import { parseBusinessIdentity } from "./public-business";

function run(
  overrides: Partial<GeneratorRunRequest> = {},
): GeneratorRunRequest {
  return {
    generatorId: "business",
    options: {},
    useAI: false,
    themeId: "workspace",
    ...overrides,
  };
}

const identityReply = JSON.stringify({
  identity: {
    name: "Chrome Lily",
    type: "Ripper clinic",
    description: "d",
    reputationLine: "r",
    distinctive: "x",
  },
  operations: {
    provides: "p",
    payers: "y",
    whyHere: "w",
    mainIncome: "m",
    model: "It earns a fee for the work it does.",
    size: "A small shop with a few staff.",
    position: "Steady, with little to spare.",
  },
  leadership: {
    name: "Nadia Vale",
    goal: "g",
    style: "s",
    trait: "t",
    pressure: "p",
  },
  staff: [{ name: "Tomo Ruiz", role: "Technician", goal: "g", trait: "t" }],
  clientele: { typical: "a", valuable: "b", undesirable: "c" },
});
const connectionsReply = JSON.stringify({
  dependencies: [
    {
      input: "Black-clinic parts",
      kind: "materials",
      ifItFails: "Repairs stop.",
    },
  ],
  relationships: [
    {
      name: "Helix Medical Corp",
      kind: "competitor",
      partyKind: "organisation",
      reason: "Undercuts.",
    },
  ],
  reputation: { perception: "Discreet.", consequence: "Quiet credit." },
});
const troubleReply = JSON.stringify({
  pressure: "The grid keeps failing.",
  asset: "A generator.",
  secret: "A quiet back door.",
  opportunity: "A new contract.",
  complication: "A drone.",
  hooks: [
    "Nadia Vale needs a courier tonight.",
    "Helix Medical Corp is buying the regulars.",
    "Black-clinic parts run out before the next shift.",
  ],
});

function gateway(replies: string[] | null): AIGeneratorGateway {
  if (!replies)
    return { complete: async () => "" } as unknown as AIGeneratorGateway;
  const pending = [...replies];
  return {
    complete: async () => "",
    startChat: async () => ({ send: async () => pending.shift() ?? "" }),
  } as unknown as AIGeneratorGateway;
}

describe("business registry definition", () => {
  it("is registered with the light inputs and the players-own toggle", () => {
    const def = getGenerator("business");
    const ids = def.options.map((o) => o.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "genre",
        "businessType",
        "scale",
        "legitimacy",
        "wealth",
        "tone",
        "location",
        "clientele",
        "playersOwn",
      ]),
    );
    expect(def.entityType).toBe("faction");
  });

  it("generates a local business as a complete draft with its document", () => {
    const def = getGenerator("business");
    const draft = def.generate(
      run({
        options: {
          genre: "Cyberpunk / Corporate",
          businessType: "Ripper clinic",
        },
      }),
    );
    expect(draft.title.length).toBeGreaterThan(0);
    expect(draft.business?.identity.type).toBe("Ripper clinic");
    expect(draft.labels).toContain("business");
  });
});

describe("businessOptionsFromRequest", () => {
  it("reads playersOwn from a boolean or the string 'true'", () => {
    expect(
      businessOptionsFromRequest(run({ options: { playersOwn: true } }))
        .playersOwn,
    ).toBe(true);
    expect(
      businessOptionsFromRequest(run({ options: { playersOwn: "true" } }))
        .playersOwn,
    ).toBe(true);
    expect(
      businessOptionsFromRequest(run({ options: { playersOwn: false } }))
        .playersOwn,
    ).toBe(false);
  });

  it("takes campaign context from the free-text instruction", () => {
    const opts = businessOptionsFromRequest(
      run({ instructions: "The city is in a blackout." }),
    );
    expect(opts.campaignContext).toBe("The city is in a blackout.");
  });
});

describe("generateBusinessWithAI", () => {
  const def = getGenerator("business");

  it("returns a draft carrying the staged business", async () => {
    const draft = await generateBusinessWithAI(
      gateway([identityReply, connectionsReply, troubleReply]),
      def,
      run({
        useAI: true,
        options: {
          genre: "Cyberpunk / Corporate",
          businessType: "Ripper clinic",
        },
      }),
    );
    expect(draft?.business?.identity.name).toBe("Chrome Lily");
    expect(draft?.sourceGeneratorId).toBe("business");
    expect(draft?.business?.fallbackSections).toEqual([]);
  });

  it("returns null when the gateway has no chat session, so the caller uses local tables", async () => {
    const draft = await generateBusinessWithAI(
      gateway(null),
      def,
      run({ useAI: true }),
    );
    expect(draft).toBeNull();
  });

  it("returns null when the chat fails, rather than throwing", async () => {
    const broken = {
      complete: async () => "",
      startChat: async () => {
        throw new Error("network down");
      },
    } as unknown as AIGeneratorGateway;
    expect(
      await generateBusinessWithAI(broken, def, run({ useAI: true })),
    ).toBeNull();
  });

  it("propagates cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      generateBusinessWithAI(
        gateway([identityReply]),
        def,
        run({ useAI: true }),
        { signal: controller.signal },
      ),
    ).rejects.toThrow();
  });

  it("reads a valid identity stage through the public parser", () => {
    expect(parseBusinessIdentity(identityReply)?.identity.name).toBe(
      "Chrome Lily",
    );
  });
});
