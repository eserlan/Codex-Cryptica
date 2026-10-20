import { describe, expect, it } from "vitest";
import {
  businessConfig,
  businessStageMessage,
  parseBusinessConnections,
  parseBusinessIdentity,
  parseBusinessTrouble,
} from "./public-business";
import { resolveBusinessOptions } from "./business-local";
import { seeded } from "./business-test-helpers";

const opts = resolveBusinessOptions(
  {
    genre: "Cyberpunk / Corporate",
    businessType: "Ripper clinic",
    scale: "small",
    campaignContext: "The city is in a blackout.",
  },
  seeded(1),
);

describe("businessStageMessage", () => {
  it("names the genre, type, scale and campaign context on every stage", () => {
    for (const stage of ["identity", "connections", "trouble"] as const) {
      const msg = businessStageMessage(stage, { ...opts, playersOwn: false });
      expect(msg).toContain("Ripper clinic");
      expect(msg).toContain("Cyberpunk / Corporate");
      expect(msg).toContain("small");
      expect(msg).toContain("The city is in a blackout.");
    }
  });

  it("asks for the management section only when the players own the business", () => {
    expect(
      businessStageMessage("trouble", { ...opts, playersOwn: true }),
    ).toContain("management");
    expect(
      businessStageMessage("trouble", { ...opts, playersOwn: false }),
    ).not.toContain('"management"');
  });

  it("asks for a manager the party employs when the players own it", () => {
    expect(
      businessStageMessage("identity", { ...opts, playersOwn: true }),
    ).toMatch(/manager/i);
  });
});

describe("parseBusinessIdentity", () => {
  const good = JSON.stringify({
    identity: {
      name: "Chrome Lily",
      type: "Ripper clinic",
      description: "d",
      reputationLine: "r",
      distinctive: "x",
    },
    operations: { provides: "p", payers: "y", whyHere: "w", mainIncome: "m" },
    leadership: {
      name: "Nadia Vale",
      goal: "g",
      style: "s",
      trait: "t",
      pressure: "p",
    },
    staff: [{ name: "Tomo", role: "Technician", goal: "g", trait: "t" }],
    clientele: { typical: "a", valuable: "b", undesirable: "c" },
  });

  it("reads a complete identity stage", () => {
    const parsed = parseBusinessIdentity(good);
    expect(parsed?.identity.name).toBe("Chrome Lily");
    expect(parsed?.staff).toHaveLength(1);
  });

  it("rejects a reply that is not JSON", () => {
    expect(parseBusinessIdentity("sorry, I cannot help")).toBeNull();
  });

  it("rejects a reply missing the business name", () => {
    const broken = JSON.parse(good);
    broken.identity.name = "";
    expect(parseBusinessIdentity(JSON.stringify(broken))).toBeNull();
  });
});

describe("parseBusinessConnections", () => {
  it("reads dependencies, relationships and reputation", () => {
    const parsed = parseBusinessConnections(
      JSON.stringify({
        dependencies: [
          { input: "Parts", kind: "materials", ifItFails: "Clinic closes." },
        ],
        relationships: [
          {
            name: "Helix Medical",
            kind: "competitor",
            partyKind: "organisation",
            reason: "Undercuts.",
          },
        ],
        reputation: { perception: "Discreet.", consequence: "Quiet credit." },
      }),
    );
    expect(parsed?.dependencies[0].input).toBe("Parts");
    expect(parsed?.relationships[0].name).toBe("Helix Medical");
  });

  it("rejects a relationship with an unknown kind", () => {
    expect(
      parseBusinessConnections(
        JSON.stringify({
          dependencies: [{ input: "Parts", kind: "materials", ifItFails: "x" }],
          relationships: [
            {
              name: "X",
              kind: "nemesis",
              partyKind: "organisation",
              reason: "r",
            },
          ],
          reputation: { perception: "p", consequence: "c" },
        }),
      ),
    ).toBeNull();
  });
});

describe("parseBusinessTrouble", () => {
  it("reads the trouble stage and its hooks", () => {
    const parsed = parseBusinessTrouble(
      JSON.stringify({
        pressure: "Power is failing.",
        asset: "A generator.",
        secret: "A quiet back door.",
        opportunity: "A new contract.",
        complication: "A drone.",
        hooks: [
          "Find the generator thief.",
          "Warn the nurse.",
          "Trace the drone.",
        ],
      }),
      false,
    );
    expect(parsed?.hooks).toHaveLength(3);
  });

  it("rejects a stage with fewer than two hooks", () => {
    expect(
      parseBusinessTrouble(
        JSON.stringify({
          pressure: "p",
          asset: "a",
          secret: "s",
          opportunity: "o",
          complication: "c",
          hooks: ["one"],
        }),
        false,
      ),
    ).toBeNull();
  });

  it("requires a management section when the players own the business", () => {
    const base = {
      pressure: "p",
      asset: "a",
      secret: "s",
      opportunity: "o",
      complication: "c",
      hooks: ["h1", "h2"],
    };
    expect(parseBusinessTrouble(JSON.stringify(base), true)).toBeNull();
    const withManagement = {
      ...base,
      management: {
        strengths: ["a", "b"],
        liabilities: ["c", "d"],
        upgrades: ["e"],
        obligations: ["f"],
        successAttracts: ["g"],
      },
    };
    expect(
      parseBusinessTrouble(JSON.stringify(withManagement), true)?.management
        ?.strengths,
    ).toHaveLength(2);
  });
});

describe("businessConfig", () => {
  it("lists the canonical genres and every scale, legitimacy and tone", () => {
    expect(businessConfig.genres).toContain("Classic Fantasy");
    expect(businessConfig.genres).toContain("Cyberpunk / Corporate");
    expect(businessConfig.scales).toEqual([
      "tiny",
      "small",
      "established",
      "regional",
      "major",
    ]);
    expect(businessConfig.legitimacies).toContain("front");
    expect(businessConfig.tones).toContain("grounded");
  });
});
