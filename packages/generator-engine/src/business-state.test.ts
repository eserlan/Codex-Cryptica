import { describe, expect, it } from "vitest";
import {
  businessToOutput,
  renderBusinessContent,
  type BusinessDocument,
} from "./business-state";

function doc(overrides: Partial<BusinessDocument> = {}): BusinessDocument {
  return {
    version: 1,
    options: {
      genre: "Classic Fantasy",
      businessType: "Blacksmith",
      scale: "small",
      legitimacy: "legitimate",
      wealth: "modest",
      clientele: "",
      location: "",
      tone: "grounded",
      campaignContext: "",
      playersOwn: false,
    },
    identity: {
      name: "The Iron Finch",
      type: "Blacksmith",
      description: "A forge on the river road.",
      reputationLine: "Honest and slow.",
      distinctive: "Water-powered bellows.",
    },
    operations: {
      provides: "Horseshoes and ploughs.",
      payers: "Farmers and carters.",
      whyHere: "Where the river road meets the mill.",
      mainIncome: "Repairs.",
      model: "It earns a fee for the work it does.",
      size: "A small shop with a few staff.",
      position: "Steady, with little to spare.",
    },
    leadership: {
      id: "lead",
      name: "Mara Venn",
      role: "owner",
      goal: "Keep the forge in family hands.",
      style: "Hands-on.",
      trait: "Stubborn.",
    },
    staff: [
      {
        id: "staff-1",
        name: "Tal",
        role: "apprentice",
        goal: "Learn",
        trait: "Quick.",
      },
    ],
    clientele: {
      typical: "Farmers.",
      valuable: "The mill.",
      undesirable: "Duellists.",
    },
    dependencies: [
      {
        id: "dep-1",
        input: "Charcoal",
        kind: "materials",
        ifItFails: "Forge goes cold.",
      },
    ],
    relationships: [
      {
        id: "rel-1",
        name: "Guild of Ashes",
        kind: "regulator",
        label: "regulated by",
        reason: "Licenses forges.",
        partyKind: "organisation",
      },
    ],
    reputation: { perception: "Reliable.", consequence: "Good credit." },
    pressure: "Charcoal prices have doubled.",
    asset: "A water-powered hammer.",
    secret: "The founder bought the forge with a stolen deed.",
    opportunity: "The garrison wants a contract.",
    complication: "A debt collector is asking questions.",
    hooks: ["Find out who is buying the charcoal from Guild of Ashes."],
    fallbackSections: [],
    ...overrides,
  };
}

describe("renderBusinessContent", () => {
  it("renders every required section in FR-003 order", () => {
    const text = renderBusinessContent(doc());
    const headings = [
      "## Identity",
      "## What It Does",
      "## Leadership",
      "## Key Staff",
      "## Clientele",
      "## Suppliers and Dependencies",
      "## Competitors and Relationships",
      "## Reputation",
      "## Current Pressure",
      "## Unusual Asset",
      "## Secret",
      "## Opportunity",
      "## Complication",
      "## Adventure Hooks",
    ];
    let last = -1;
    for (const heading of headings) {
      const at = text.indexOf(heading);
      expect(at, heading).toBeGreaterThan(last);
      last = at;
    }
  });

  it("states the type once when the description already opens with it", () => {
    const d = doc();
    d.identity.type = "Blacksmith";
    d.identity.description = "Blacksmith on the river road, modest and steady.";
    const text = renderBusinessContent(d);
    expect(text.match(/Blacksmith/g)).toHaveLength(1);
    // A description that does not open with the type keeps both.
    expect(renderBusinessContent(doc())).toContain("— Blacksmith");
  });

  it("omits the management section when the players do not own the business", () => {
    expect(renderBusinessContent(doc())).not.toContain("## Management");
  });

  it("renders the management section when set", () => {
    const text = renderBusinessContent(
      doc({
        leadership: { ...doc().leadership, role: "manager" },
        management: {
          strengths: ["Loyal crew"],
          liabilities: ["Old tools"],
          upgrades: ["A second forge"],
          obligations: ["Guild dues"],
          successAttracts: ["Guild interest"],
        },
      }),
    );
    expect(text).toContain("## Management");
    expect(text).toContain("Guild dues");
  });

  it("omits an empty optional excluded clientele line", () => {
    expect(renderBusinessContent(doc())).not.toMatch(/Excluded:\s*$/m);
  });

  it("renders the excluded line when present", () => {
    const text = renderBusinessContent(
      doc({
        clientele: {
          typical: "a",
          valuable: "b",
          undesirable: "c",
          excluded: "Thieves.",
        },
      }),
    );
    expect(text).toContain("Excluded: Thieves.");
  });
});

describe("businessToOutput", () => {
  it("returns a faction-type output carrying the document", () => {
    const out = businessToOutput(doc());
    expect(out.type).toBe("faction");
    expect(out.title).toBe("The Iron Finch");
    expect(out.labels).toContain("business");
    expect(out.business?.identity.type).toBe("Blacksmith");
    expect(out.content).toContain("## Identity");
  });
});
