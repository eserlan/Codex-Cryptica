import { describe, expect, it, vi } from "vitest";
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
        id: "aglarond",
        title: "Aglarond",
        type: "location",
      }),
    );
    expect(related[1]).toEqual(
      expect.objectContaining({
        id: "szass",
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

  it("finds entities via alias full match when title is not mentioned", () => {
    const related = buildRelatedEntityContext({
      entity: {
        id: "subject",
        title: "Subject",
        connections: [],
        content: "",
        lore: "",
      },
      incoming: { chronicle: "The Library holds all records.", lore: "" },
      vault: {
        entities: {
          subject: { id: "subject", title: "Subject", type: "note" },
          library: {
            id: "library",
            title: "Great Library of Shas",
            type: "location",
            aliases: ["The Library"],
            content: "Repository of all known lore.",
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
      getConsolidatedContext: (entity) => entity.content || "",
    });

    const titles = related.map((r) => r.title);
    expect(titles).toContain("Great Library of Shas");
    expect(titles).not.toContain("The Deep Ocean");
  });

  it("does not match entities via aliases shorter than MIN_TITLE_SCAN_LENGTH", () => {
    const related = buildRelatedEntityContext({
      entity: {
        id: "subject",
        title: "Subject",
        connections: [],
        content: "",
        lore: "",
      },
      incoming: { chronicle: "The spy known as Ji was seen.", lore: "" },
      vault: {
        entities: {
          subject: { id: "subject", title: "Subject", type: "note" },
          spy: {
            id: "spy",
            title: "Shadow Operative",
            type: "npc",
            aliases: ["Ji"],
            content: "An intelligence agent.",
            lore: "",
          },
        },
        inboundConnections: {},
      },
      getConsolidatedContext: (entity) => entity.content || "",
    });

    const titles = related.map((r) => r.title);
    expect(titles).not.toContain("Shadow Operative");
  });

  it("invokes the debug callback with the selected set including score and chars", () => {
    const debugSpy = vi.fn();
    buildRelatedEntityContext({
      entity: {
        id: "subject",
        title: "Subject",
        connections: [{ target: "linked", type: "link" }],
        content: "",
        lore: "",
      },
      incoming: { chronicle: "LinkedEntity is notable.", lore: "" },
      vault: {
        entities: {
          subject: { id: "subject", title: "Subject", type: "note" },
          linked: {
            id: "linked",
            title: "LinkedEntity",
            type: "note",
            content: "A linked entity.",
            lore: "",
          },
        },
        inboundConnections: {},
      },
      getConsolidatedContext: (entity) => entity.content || "",
      debug: debugSpy,
    });

    expect(debugSpy).toHaveBeenCalledOnce();
    const [entries] = debugSpy.mock.calls[0];
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe("LinkedEntity");
    expect(typeof entries[0].score).toBe("number");
    expect(typeof entries[0].chars).toBe("number");
    expect(entries[0].score > 0).toBe(true);
    expect(entries[0].chars > 0).toBe(true);
  });

  it("finds entities via word-level alias match", () => {
    const related = buildRelatedEntityContext({
      entity: {
        id: "subject",
        title: "Subject",
        connections: [],
        content: "",
        lore: "",
      },
      incoming: { chronicle: "Shas dominates the northern plains.", lore: "" },
      vault: {
        entities: {
          subject: { id: "subject", title: "Subject", type: "note" },
          republic: {
            id: "republic",
            title: "Grand Republic of Shasoria",
            type: "location",
            aliases: ["Republic of Shas", "Shas"],
            content: "A major power.",
            lore: "",
          },
        },
        inboundConnections: {},
      },
      getConsolidatedContext: (entity) => entity.content || "",
    });

    const titles = related.map((r) => r.title);
    expect(titles).toContain("Grand Republic of Shasoria");
  });

  it("ranks connected+named above named-only above connected-only", () => {
    const related = buildRelatedEntityContext({
      entity: {
        id: "subject",
        title: "Subject",
        connections: [
          { target: "connected-named", type: "link" },
          { target: "connected-only", type: "link" },
        ],
        content: "",
        lore: "",
      },
      incoming: {
        chronicle: "The ConnectedNamed entity and NamedOnly entity appear.",
        lore: "",
      },
      vault: {
        entities: {
          subject: { id: "subject", title: "Subject", type: "note" },
          "connected-named": {
            id: "connected-named",
            title: "ConnectedNamed",
            type: "note",
            content: "Has both a graph edge and a name mention.",
            lore: "",
          },
          "connected-only": {
            id: "connected-only",
            title: "ConnectedOnly",
            type: "note",
            content: "Has a graph edge but is not mentioned in incoming.",
            lore: "",
          },
          "named-only": {
            id: "named-only",
            title: "NamedOnly",
            type: "note",
            content: "Mentioned in incoming but has no graph edge.",
            lore: "",
          },
        },
        inboundConnections: {},
      },
      getConsolidatedContext: (entity) => entity.content || "",
    });

    const titles = related.map((r) => r.title);
    expect(titles.indexOf("ConnectedNamed")).toBeLessThan(
      titles.indexOf("NamedOnly"),
    );
    expect(titles.indexOf("NamedOnly")).toBeLessThan(
      titles.indexOf("ConnectedOnly"),
    );
  });

  it("returns full content without per-entity truncation", () => {
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

  it("drops lowest-ranked candidates once MAX_TOTAL_CHARS budget is reached", () => {
    // 6 connected entities each with 400 chars — total would exceed 1600 budget
    const chunk = "B".repeat(400);
    const connections = ["e2", "e3", "e4", "e5", "e6", "e7"].map((id) => ({
      target: id,
      type: "link",
    }));
    const entities: Record<string, any> = {
      e1: { id: "e1", title: "Subject", type: "note" },
    };
    // Assign descending scores: e2 is named in incoming (highest), e7 is not (lowest)
    entities["e2"] = {
      id: "e2",
      title: "TopEntity",
      type: "note",
      content: chunk,
      lore: "",
    };
    for (const id of ["e3", "e4", "e5", "e6", "e7"]) {
      entities[id] = {
        id,
        title: `Entity${id}`,
        type: "note",
        content: chunk,
        lore: "",
      };
    }

    const related = buildRelatedEntityContext({
      entity: {
        id: "e1",
        title: "Subject",
        connections,
        content: "",
        lore: "",
      },
      incoming: { chronicle: "TopEntity is important.", lore: "" },
      vault: { entities, inboundConnections: {} },
      getConsolidatedContext: (entity) => entity.content || "",
    });

    const totalChars = related.reduce((sum, r) => sum + r.summary.length, 0);
    expect(totalChars).toBeLessThanOrEqual(1600);
    // TopEntity (highest score: connected+named) must be in the result
    expect(related.map((r) => r.title)).toContain("TopEntity");
  });
});
