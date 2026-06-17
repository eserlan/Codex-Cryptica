import { describe, expect, it } from "vitest";
import { buildRelatedEntityContext } from "./revision-context";

describe("buildRelatedEntityContext", () => {
  it("prioritizes connected entities mentioned in the incoming text", () => {
    const related = buildRelatedEntityContext({
      entity: {
        id: "rw",
        title: "Red Wizards of Thay",
        connections: [
          { target: "szass", type: "rules" },
          { target: "aglarond", type: "invades" },
        ],
      },
      incoming: {
        chronicle: "Szass Tam reshaped the order after the War of the Zulkirs.",
        lore: "Aglarond still resists Thayan power.",
      },
      vault: {
        entities: {
          rw: { id: "rw", title: "Red Wizards of Thay", type: "faction" },
          szass: {
            id: "szass",
            title: "Szass Tam",
            type: "npc",
            content: "Lich-regent of Thay.",
            lore: "",
          },
          aglarond: {
            id: "aglarond",
            title: "Aglarond",
            type: "location",
            content: "A realm hostile to Thayan expansion.",
            lore: "",
          },
        },
        inboundConnections: {},
      },
      getConsolidatedContext: (entity) =>
        [entity.content, entity.lore].filter(Boolean).join("\n\n"),
    });

    expect(related).toHaveLength(2);
    expect(related[0]).toEqual(
      expect.objectContaining({
        title: "Aglarond",
        type: "location",
      }),
    );
    expect(related[1]).toEqual(
      expect.objectContaining({
        title: "Szass Tam",
        type: "npc",
      }),
    );
  });

  it("includes vault entities mentioned by name in the current record even without a graph connection", () => {
    const related = buildRelatedEntityContext({
      entity: {
        id: "plains",
        title: "The Plains of Végtelen",
        connections: [{ target: "karesh", type: "borders" }],
        content: "Spanning the territories of Shas, Hlaugar, and Rosintas.",
        lore: "Riders from the Stormber border compete at the Great Muster.",
      },
      incoming: { chronicle: "", lore: "" },
      vault: {
        entities: {
          plains: {
            id: "plains",
            title: "The Plains of Végtelen",
            type: "location",
          },
          karesh: {
            id: "karesh",
            title: "Protectorate of Karesh",
            type: "location",
            content: "A martial protectorate.",
            lore: "",
          },
          shas: {
            id: "shas",
            title: "Shas",
            type: "location",
            content: "A nation on the plains.",
            lore: "",
          },
          hlaugar: {
            id: "hlaugar",
            title: "Hlaugar",
            type: "location",
            content: "A nation on the plains.",
            lore: "",
          },
          rosintas: {
            id: "rosintas",
            title: "Rosintas",
            type: "location",
            content: "A nation on the plains.",
            lore: "",
          },
          stormber: {
            id: "stormber",
            title: "Stormber",
            type: "location",
            content: "A border region.",
            lore: "",
          },
          unrelated: {
            id: "unrelated",
            title: "The Deep Ocean",
            type: "location",
            content: "Nowhere near the plains.",
            lore: "",
          },
        },
        inboundConnections: {},
      },
      getConsolidatedContext: (entity) =>
        [entity.content, entity.lore].filter(Boolean).join("\n\n"),
    });

    const titles = related.map((r) => r.title);
    expect(titles).toContain("Shas");
    expect(titles).toContain("Hlaugar");
    expect(titles).toContain("Rosintas");
    expect(titles).toContain("Stormber");
    expect(titles).not.toContain("The Deep Ocean");
  });

  it("includes vault entities mentioned in user instructions", () => {
    const related = buildRelatedEntityContext({
      entity: {
        id: "plains",
        title: "The Plains of Végtelen",
        connections: [],
        content: "",
        lore: "",
      },
      incoming: { chronicle: "", lore: "" },
      instructions: "the plains also span Rosintas, Shas, and Hlaugar",
      vault: {
        entities: {
          plains: {
            id: "plains",
            title: "The Plains of Végtelen",
            type: "location",
          },
          shas: {
            id: "shas",
            title: "Shas",
            type: "location",
            content: "A nation on the plains.",
            lore: "",
          },
          hlaugar: {
            id: "hlaugar",
            title: "Hlaugar",
            type: "location",
            content: "A nation on the plains.",
            lore: "",
          },
          rosintas: {
            id: "rosintas",
            title: "Rosintas",
            type: "location",
            content: "A nation on the plains.",
            lore: "",
          },
          unrelated: {
            id: "unrelated",
            title: "The Deep Ocean",
            type: "location",
            content: "Far away.",
            lore: "",
          },
        },
        inboundConnections: {},
      },
      getConsolidatedContext: (entity) =>
        [entity.content, entity.lore].filter(Boolean).join("\n\n"),
    });

    const titles = related.map((r) => r.title);
    expect(titles).toContain("Shas");
    expect(titles).toContain("Hlaugar");
    expect(titles).toContain("Rosintas");
    expect(titles).not.toContain("The Deep Ocean");
  });

  it("finds compound-titled entities via word-level match (e.g. 'shas' hits 'Republic of Shas')", () => {
    const related = buildRelatedEntityContext({
      entity: {
        id: "plains",
        title: "The Plains of Végtelen",
        connections: [],
        content: "",
        lore: "",
      },
      incoming: { chronicle: "", lore: "" },
      instructions:
        "the plains also span rosintas, shas, hlaugar, dominating northern zarathar",
      vault: {
        entities: {
          plains: {
            id: "plains",
            title: "The Plains of Végtelen",
            type: "location",
          },
          shas: {
            id: "shas",
            title: "Republic of Shas",
            type: "location",
            content: "A northern republic on the plains.",
            lore: "",
          },
          rosintas: {
            id: "rosintas",
            title: "Kingdom of Rosintas",
            type: "location",
            content: "A kingdom on the plains.",
            lore: "",
          },
          hlaugar: {
            id: "hlaugar",
            title: "High See of Hlaugar",
            type: "location",
            content: "A theocratic city-state.",
            lore: "",
          },
          unrelated: {
            id: "unrelated",
            title: "The Deep Ocean",
            type: "location",
            content: "Far away.",
            lore: "",
          },
        },
        inboundConnections: {},
      },
      getConsolidatedContext: (entity) =>
        [entity.content, entity.lore].filter(Boolean).join("\n\n"),
    });

    const titles = related.map((r) => r.title);
    expect(titles).toContain("Republic of Shas");
    expect(titles).toContain("Kingdom of Rosintas");
    expect(titles).toContain("High See of Hlaugar");
    expect(titles).not.toContain("The Deep Ocean");
  });

  it("excludes short-titled entities from the title-scan pass", () => {
    const related = buildRelatedEntityContext({
      entity: {
        id: "e1",
        title: "The Great Kingdom",
        connections: [],
        content: "Embroiled in the Wars of the North for centuries.",
        lore: "",
      },
      incoming: { chronicle: "", lore: "" },
      vault: {
        entities: {
          e1: { id: "e1", title: "The Great Kingdom", type: "location" },
          war: {
            id: "war",
            title: "War",
            type: "concept",
            content: "Generic concept of war.",
            lore: "",
          },
          longname: {
            id: "longname",
            title: "Wars of the North",
            type: "event",
            content: "Historical wars in the north.",
            lore: "",
          },
        },
        inboundConnections: {},
      },
      getConsolidatedContext: (entity) =>
        [entity.content, entity.lore].filter(Boolean).join("\n\n"),
    });

    const titles = related.map((r) => r.title);
    expect(titles).not.toContain("War");
    expect(titles).toContain("Wars of the North");
  });

  it("returns full context without truncation", () => {
    const longContent = "A".repeat(1000);
    const related = buildRelatedEntityContext({
      entity: {
        id: "e1",
        title: "Subject",
        connections: [{ target: "e2", type: "relates" }],
        content: "",
        lore: "",
      },
      incoming: { chronicle: "", lore: "" },
      vault: {
        entities: {
          e1: { id: "e1", title: "Subject", type: "note" },
          e2: {
            id: "e2",
            title: "Rich Entity",
            type: "note",
            content: longContent,
            lore: "",
          },
        },
        inboundConnections: {},
      },
      getConsolidatedContext: (entity) => entity.content || "",
    });

    expect(related).toHaveLength(1);
    expect(related[0].summary).toBe(longContent);
    expect(related[0].summary).not.toContain("...");
  });
});
