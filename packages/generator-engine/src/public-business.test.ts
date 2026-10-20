import { describe, expect, it } from "vitest";
import { factionConfig } from "./public-faction-constants";
import {
  businessConfig,
  businessStageMessage,
  establishedFacts,
  parseBusinessConnections,
  parseBusinessIdentity,
  parseBusinessTrouble,
} from "./public-business";
import {
  generateBusinessLocal,
  resolveBusinessOptions,
} from "./business-local";
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
  it("offers only the canonical theme list, so no genre is coined", () => {
    expect(businessConfig.genres).toEqual([...factionConfig.themes]);
    for (const g of businessConfig.genres) {
      expect(() =>
        generateBusinessLocal({ genre: g }, seeded(1)),
      ).not.toThrow();
    }
  });

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

describe("operations profile in the identity stage", () => {
  const withOps = (ops: Record<string, string>) =>
    JSON.stringify({
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
        ...ops,
      },
      leadership: {
        name: "Nadia Vale",
        goal: "g",
        style: "s",
        trait: "t",
        pressure: "p",
      },
      staff: [],
      clientele: { typical: "a", valuable: "b", undesirable: "c" },
    });

  it("reads how the business earns, its size and its position", () => {
    const parsed = parseBusinessIdentity(
      withOps({
        model: "Commission broker",
        size: "Three wagons",
        position: "Short of cash",
      }),
    );
    expect(parsed?.operations).toMatchObject({
      model: "Commission broker",
      size: "Three wagons",
      position: "Short of cash",
    });
  });

  it.each(["model", "size", "position"])(
    "rejects a reply without %s",
    (field) => {
      const ops: Record<string, string> = {
        model: "m",
        size: "s",
        position: "p",
      };
      delete ops[field];
      expect(parseBusinessIdentity(withOps(ops))).toBeNull();
    },
  );

  it("asks for a model specific to the kind of business, not generic filler", () => {
    const msg = businessStageMessage("identity", opts);
    expect(msg).toContain('"model"');
    expect(msg).toMatch(/commission broker/i);
    expect(msg).toMatch(/generic filler/i);
  });
});

describe("relationship labels in the connections stage", () => {
  const reply = (label?: string, kind = "criminal") =>
    JSON.stringify({
      dependencies: [
        { input: "Parts", kind: "materials", ifItFails: "Stops." },
      ],
      relationships: [
        {
          name: "The Reedknife Circle",
          kind,
          partyKind: "organisation",
          reason: "r",
          ...(label ? { label } : {}),
        },
      ],
      reputation: { perception: "p", consequence: "c" },
    });

  it("accepts a label that describes the party", () => {
    expect(
      parseBusinessConnections(reply("owes"))?.relationships[0].label,
    ).toBe("owes");
  });

  it("rejects a label that does not describe the party", () => {
    expect(parseBusinessConnections(reply("located in"))).toBeNull();
  });

  it("uses a safe default when no label is given", () => {
    expect(
      parseBusinessConnections(reply(undefined, "neighbour"))?.relationships[0]
        .label,
    ).toBe("competes with");
  });

  it("tells the model which labels fit", () => {
    expect(businessStageMessage("connections", opts)).toContain(
      "label must truly describe the party",
    );
  });
});

describe("established facts in later stages", () => {
  const doc = generateBusinessLocal(
    { genre: "Classic Fantasy", businessType: "Trading house" },
    seeded(31),
  );

  it("is added to a stage only when the document so far is supplied", () => {
    expect(businessStageMessage("connections", opts)).not.toContain(
      "Established facts",
    );
    expect(businessStageMessage("connections", opts, doc)).toContain(
      "Established facts",
    );
  });

  it("gives the last stage the business, its people and its parties", () => {
    const trouble = businessStageMessage("trouble", doc.options, doc);
    expect(trouble).toContain(doc.identity.name);
    expect(trouble).toContain(doc.leadership.name);
    expect(trouble).toContain(doc.relationships[0].name);
  });

  it("does not list parties before the connections stage has set them", () => {
    expect(businessStageMessage("connections", doc.options, doc)).not.toContain(
      "Parties:",
    );
  });

  it("tells the model not to invent new named people in the last stage", () => {
    expect(businessStageMessage("trouble", doc.options, doc)).toMatch(
      /do not invent new named people/i,
    );
  });

  it("asks the last stage to use the distinctive feature and keep the complication distinct", () => {
    const message = businessStageMessage("trouble", doc.options, doc);
    expect(message).toContain(`Distinctive: ${doc.identity.distinctive}`);
    expect(message).toMatch(/develop the distinctive feature/i);
    expect(message).toMatch(/complication a different problem/i);
  });

  it("asks the first stage to make the size agree with the staff", () => {
    expect(businessStageMessage("identity", doc.options)).toMatch(
      /agree with the staff you list/i,
    );
  });

  it("describes the manager as a manager when the players own the business", () => {
    const own = generateBusinessLocal(
      { genre: "Classic Fantasy", playersOwn: true },
      seeded(32),
    );
    expect(establishedFacts(own)).toContain(`Manager: ${own.leadership.name}`);
  });
});
