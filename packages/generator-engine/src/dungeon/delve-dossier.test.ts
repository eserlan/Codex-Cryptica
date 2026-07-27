import { describe, expect, it } from "vitest";
import type { DelveCanvasEdge, DelveCanvasNode } from "./delve-builder-types";
import { buildDelveDossier } from "./delve-dossier";

const nodes: DelveCanvasNode[] = [
  {
    id: "sector-lower",
    type: "delveSectorGroup",
    position: { x: 0, y: 500 },
    data: {
      id: "lower",
      name: "The Lower Vault",
      theme: "Glass and cinders",
      description: "The air shimmers with trapped heat.",
      order: 2,
    },
  },
  {
    id: "sector-upper",
    type: "delveSectorGroup",
    position: { x: 0, y: 0 },
    data: {
      id: "upper",
      name: "The Vitrified Narthex",
      theme: "Shattered green glass",
      description: "The breached entrance to the sanctuary.",
      order: 1,
    },
  },
  {
    id: "room-2",
    type: "delveRoom",
    parentId: "sector-lower",
    position: { x: 0, y: 20 },
    data: {
      id: "room-2",
      sectorId: "lower",
      sectorName: "The Lower Vault",
      name: "Star-Furnace",
      role: "climax",
      summary: "A furnace beneath the altar.",
      description: "A dying star-fragment pulses behind cracked wards.",
      stocking: {
        secrets: ["The sanctuary was built as a prison."],
        treasure: [],
      },
      climax: {
        stakes: "The dying star will consume the vault.",
        decision: "Reinforce its prison or release it.",
        outcomes: [
          "The prison holds, but the glass continues to spread.",
          "The star escapes and destroys the lower vault.",
        ],
      },
    },
  },
  {
    id: "room-1",
    type: "delveRoom",
    parentId: "sector-upper",
    position: { x: 0, y: 10 },
    data: {
      id: "room-1",
      sectorId: "upper",
      sectorName: "The Vitrified Narthex",
      name: "Raider Gate",
      role: "entrance",
      summary: "A breached glass gate.",
      description: "Goblin sentries watch through translucent walls.",
      stocking: {
        atmosphere: "Smoke and refracted torchlight",
        encounters: ["Four Iron-Hide Reaver archers"],
        hazards: undefined,
      },
    },
  },
];

const edges: DelveCanvasEdge[] = [
  {
    id: "edge-1",
    source: "room-1",
    target: "room-2",
    type: "delveEdge",
    data: {
      id: "edge-1",
      sourceRoomId: "room-1",
      targetRoomId: "room-2",
      type: "hidden",
      bidirectional: true,
      description: "A concealed revolving wall",
      condition: "Opens when the altar flame is extinguished",
    },
  },
];

describe("buildDelveDossier", () => {
  it("builds an ordered GM document with source prose and room-level connections", () => {
    const dossier = buildDelveDossier({
      title: "The Glass Sanctuary",
      dossierTerm: "Lair",
      canvasHref: "/canvas/the-glass-sanctuary",
      canvasImagePath: "images/glass-sanctuary-layout.webp",
      sourceContent: "A contested militant sanctuary.",
      sourceLore: "## Central Secret\nA dying star sleeps below.",
      nodes,
      edges,
    });

    expect(dossier.title).toBe("The Glass Sanctuary — Lair Dossier");
    expect(dossier.summary).toBe("A contested militant sanctuary.");
    expect(dossier.markdown).toContain(
      "[Open Lair Canvas](/canvas/the-glass-sanctuary)",
    );
    expect(dossier.markdown).toContain(
      "![Map of The Glass Sanctuary](images/glass-sanctuary-layout.webp)",
    );
    expect(dossier.sectorCount).toBe(2);
    expect(dossier.areaCount).toBe(2);
    expect(dossier.markdown).not.toContain("**Source Location:**");
    expect(dossier.markdown).toContain("## Original Delve Background");
    expect(dossier.markdown).toContain("### Generated Dungeon & GM Reference");
    expect(dossier.markdown).toContain("#### Central Secret");
    expect(dossier.markdown).toContain("## Canvas Delve Structure");
    expect(dossier.markdown).toContain("🚪 Entrance · ⚔️ Encounter");
    expect(dossier.markdown).toContain("#### 🚪 Raider Gate");
    expect(dossier.markdown).toContain("#### 🔥 Star-Furnace");
    expect(dossier.markdown).not.toContain("**Role:**");
    expect(dossier.markdown).not.toContain("> A contested militant sanctuary.");
    expect(dossier.markdown).not.toContain("### Passage Index");
    expect(dossier.markdown).toContain(
      "**Star-Furnace** — 👁️ Hidden passage: A concealed revolving wall; Opens when the altar flame is extinguished",
    );
    expect(dossier.markdown).toContain(
      "**Raider Gate** — 👁️ Hidden passage: A concealed revolving wall; Opens when the altar flame is extinguished",
    );
    expect(dossier.markdown).toContain(
      "**Encounters**\n- Four Iron-Hide Reaver archers",
    );
    expect(dossier.markdown).not.toContain(
      "# The Glass Sanctuary — Lair Dossier",
    );
    expect(dossier.markdown).not.toContain("### Location Summary");
    expect(dossier.markdown).toContain(
      "**Stakes:** The dying star will consume the vault.",
    );
    expect(dossier.markdown).toContain(
      "**Decision:** Reinforce its prison or release it.",
    );
    expect(dossier.markdown).toContain("**Possible Outcomes**");
    const canvasStructure = dossier.markdown.split(
      "## Canvas Delve Structure",
    )[1];
    expect(canvasStructure).not.toContain("*Shattered green glass*");
    expect(canvasStructure).not.toContain(
      "The breached entrance to the sanctuary.",
    );
    expect(canvasStructure).not.toContain("*Glass and cinders*");
    expect(canvasStructure).not.toContain(
      "The air shimmers with trapped heat.",
    );
    expect(dossier.markdown.indexOf("### Sector 1")).toBeLessThan(
      dossier.markdown.indexOf("### Sector 2"),
    );
  });

  it("removes the redundant Dungeon Layout section from source lore", () => {
    const dossier = buildDelveDossier({
      title: "The Glass Sanctuary",
      sourceLore:
        "## History\nBuilt around a fallen star.\n\n## Dungeon Layout\n1. Upper Vault\n2. Lower Vault\n\n## Central Secret\nThe star is awake.",
      nodes,
      edges: [],
    });

    expect(dossier.markdown).toContain("#### History");
    expect(dossier.markdown).toContain("#### Central Secret");
    expect(dossier.markdown).not.toContain("Dungeon Layout");
    expect(dossier.markdown).not.toContain("1. Upper Vault");
  });

  it("omits empty stocking categories instead of printing blank headings", () => {
    const dossier = buildDelveDossier({
      title: "The Glass Sanctuary",
      nodes,
      edges: [],
    });

    expect(dossier.markdown).not.toContain("**Hazards & Traps**");
    expect(dossier.markdown).not.toContain("### Passage Index");
    expect(dossier.markdown).not.toContain("[Open Delve Canvas]");
  });

  it("uses footprints for an ordinary passage", () => {
    const dossier = buildDelveDossier({
      title: "The Glass Sanctuary",
      nodes,
      edges: [
        {
          ...edges[0],
          data: {
            ...edges[0].data!,
            type: "standard",
            description: undefined,
            condition: undefined,
          },
        },
      ],
    });

    expect(dossier.markdown).toContain("**Star-Furnace** — 👣 Passage");
  });

  it("shows one-way passages as outgoing and incoming room connections", () => {
    const dossier = buildDelveDossier({
      title: "The Glass Sanctuary",
      sourceLore: "## Overview\n\nA prison of glass and cinders.",
      nodes,
      edges: [
        {
          ...edges[0],
          data: {
            ...edges[0].data!,
            type: "vertical",
            bidirectional: false,
            description: "A brass cage descends into the vault",
            condition: undefined,
          },
        },
      ],
    });

    expect(dossier.summary).toBe("A prison of glass and cinders.");
    expect(dossier.markdown).toContain(
      "**Star-Furnace** — 🪜 Vertical passage (outgoing): A brass cage descends into the vault",
    );
    expect(dossier.markdown).toContain(
      "**Raider Gate** — 🪜 Vertical passage (incoming): A brass cage descends into the vault",
    );
  });
});
