import { describe, expect, it } from "bun:test";
import { generateAdventureGraphTopology } from "./adventure-graph-generator";
import { validateAdventureGraph } from "./adventure-graph-validator";
import type { PublicGeneratorOutput } from "../public-generator-adapters";

const MOCK_ADVENTURE_OUTPUT: PublicGeneratorOutput = {
  title: "The Salt-Toll Affidavit",
  summary:
    "An exiled magistrate's missing confession must be seized before the audit.",
  content: `# The Salt-Toll Affidavit
*An exiled magistrate's missing confession must be seized.*

## Initial Situation
Foreign occupation enforcers have thrown an iron-clad curfew over the port city.

## Primary Objective & Pressure
Locate the missing salt-toll affidavit before midnight.

## Key Locations
- **The Weeping Salt-Bazaar**: A tiered marketplace.
  - **Role:** Primary zone of investigation.
  - **Relation:** Connects to courier.
  - **Leverage:** Bribe merchants.
  - **Dilemma:** Spend time or sacrifice stealth.
- **The Sunken Wharf**: A dilapidated district.
  - **Role:** Hiding place of courier.
  - **Relation:** Connected to Chancellor network.
  - **Leverage:** Exploit bell escape.
  - **Dilemma:** Risk rising tide or leave evidence.

## Important NPCs & Factions
- **Magistrate Varos**: Chief tax-inquisitor
  - **Relation:** Hunting the party
  - **Wants:** Recover affidavit.
  - **Secret:** Altered ledger himself.
  - **Leverage:** Fear of superiors.
  - **Dilemma:** Expose or blackmail.

## Threats & Antagonists
- Occupation's midnight audit clock ticks relentlessly.
- Inquisitorial hounds roam the alleys.

## Clues, Secrets & Discoveries
- A charred manifest fragment reveals the courier is hiding in the bell tower.
- A hidden marginal note proves the governor orchestrated the famine.

### Complications & Escalating Pressures
- Inner district gate sealed early.

### Rewards & Stakes
- Complete salt-toll affidavit.

### Possible Outcomes
- The affidavit is delivered to the resistance.
- The ledger is lost to the rising tide.

### Adventure Hooks
- The party's shipping house was seized.`,
  status: "active",
};

describe("generateAdventureGraphTopology", () => {
  it("generates an AdventureCanvasDocument with expected node types", () => {
    const doc = generateAdventureGraphTopology(MOCK_ADVENTURE_OUTPUT);

    expect(doc.id).toContain("adv-canvas-");
    expect(doc.title).toBe("The Salt-Toll Affidavit");
    expect(doc.nodes.length).toBeGreaterThan(0);
    expect(doc.edges.length).toBeGreaterThan(0);

    const nodeTypes = new Set(doc.nodes.map((n) => n.type));
    expect(nodeTypes.has("situation")).toBe(true);
    expect(nodeTypes.has("location")).toBe(true);
    expect(nodeTypes.has("npc")).toBe(true);
    expect(nodeTypes.has("clue")).toBe(true);
    expect(nodeTypes.has("threat")).toBe(true);
    expect(nodeTypes.has("outcome")).toBe(true);
  });

  it("assigns spatial coordinates without overlapping origins", () => {
    const doc = generateAdventureGraphTopology(MOCK_ADVENTURE_OUTPUT);
    const locNodes = doc.nodes.filter((n) => n.type === "location");

    expect(locNodes.length).toBe(2);
    expect(locNodes[0].position.y).toBe(320);
    expect(locNodes[1].position.y).toBe(320);
    expect(locNodes[1].position.x).toBeGreaterThan(locNodes[0].position.x);
  });
});

describe("validateAdventureGraph", () => {
  it("returns no warnings for a fully connected document", () => {
    const doc = generateAdventureGraphTopology(MOCK_ADVENTURE_OUTPUT);
    const warnings = validateAdventureGraph(doc);

    expect(warnings.filter((w) => w.severity === "warning")).toHaveLength(0);
  });

  it("detects orphan nodes", () => {
    const doc = generateAdventureGraphTopology(MOCK_ADVENTURE_OUTPUT);
    doc.nodes.push({
      id: "node-orphan-1",
      type: "clue",
      position: { x: 999, y: 999 },
      data: { title: "Unconnected Clue", type: "clue" },
    });

    const warnings = validateAdventureGraph(doc);
    expect(warnings.some((w) => w.message.includes("Orphan Node"))).toBe(true);
  });
});
