import { describe, expect, it } from "vitest";
import { buildReport } from "./build-report";
import { DEFAULT_REPORT_INCLUDE } from "./defaults";
import { entity, options, sampleInput } from "./test-fixtures";
import type { ReportInput } from "./types";

const detailed = (over: Partial<typeof DEFAULT_REPORT_INCLUDE> = {}) =>
  options({
    detail: "standard",
    include: { ...DEFAULT_REPORT_INCLUDE, ...over },
  });

describe("buildReport", () => {
  it("summarises the overview counts", () => {
    const doc = buildReport(sampleInput(), options());
    expect(doc.overview).toEqual({
      entityCount: 4,
      relationshipCount: 2,
      factionCount: 1,
    });
  });

  it("uses kind-appropriate sections and a generic fallback", () => {
    const doc = buildReport(sampleInput(), options());
    const kinds = Object.fromEntries(
      doc.sections.map((s) => [s.entity.id, s.kind]),
    );
    expect(kinds).toEqual({
      vargas: "character",
      lajos: "character",
      eagles: "faction",
      relic: "generic",
    });
  });

  it("orders by type then title, not by input position", () => {
    const input = sampleInput();
    const reversed: ReportInput = {
      ...input,
      entities: [...input.entities].reverse(),
    };
    const a = buildReport(input, options()).sections.map((s) => s.entity.id);
    const b = buildReport(reversed, options()).sections.map((s) => s.entity.id);
    expect(a).toEqual(b);
  });

  it("omits secrets by default even when supplied", () => {
    const doc = buildReport(sampleInput(), detailed());
    expect(JSON.stringify(doc)).not.toContain("Is the spy.");
  });

  it("keeps secrets when GM-only is enabled", () => {
    const doc = buildReport(sampleInput(), detailed({ gmOnlySecrets: true }));
    const vargas = doc.sections.find((s) => s.entity.id === "vargas")!;
    expect(vargas.entity.secrets).toBe("Is the spy.");
  });

  it("handles a missing portrait", () => {
    const doc = buildReport(sampleInput(), options());
    expect(
      doc.sections.find((s) => s.entity.id === "lajos")!.entity.portraitUrl,
    ).toBeUndefined();
  });

  it("each include flag removes only its own content", () => {
    const off = (k: keyof typeof DEFAULT_REPORT_INCLUDE) =>
      buildReport(sampleInput(), detailed({ [k]: false }));

    const noDesc = off("descriptions").sections.find(
      (s) => s.entity.id === "vargas",
    )!;
    expect(noDesc.entity.description).toBeUndefined();
    expect(noDesc.entity.notes).toBeDefined();

    expect(
      off("notes").sections.find((s) => s.entity.id === "vargas")!.entity.notes,
    ).toBeUndefined();
    expect(
      off("portraits").sections.find((s) => s.entity.id === "vargas")!.entity
        .portraitUrl,
    ).toBeUndefined();

    const noRel = off("relationships");
    expect(noRel.relationshipSummary).toEqual([]);
    expect(noRel.overview.entityCount).toBe(4);

    const noFac = off("factionsAffiliations");
    const v = noFac.sections.find((s) => s.entity.id === "vargas")!;
    expect(v.kind === "character" && v.affiliations).toEqual([]);
    const f = noFac.sections.find((s) => s.entity.id === "eagles")!;
    expect(f.kind === "faction" && f.members).toEqual([]);
  });

  it("derives affiliations from faction membership only", () => {
    const doc = buildReport(sampleInput(), options());
    const vargas = doc.sections.find((s) => s.entity.id === "vargas")!;
    const lajos = doc.sections.find((s) => s.entity.id === "lajos")!;
    expect(vargas.kind === "character" && vargas.affiliations).toEqual([
      "Black Eagles",
    ]);
    expect(lajos.kind === "character" && lajos.affiliations).toEqual([]);
  });

  it("builds one section per entity for a 200-entity input", () => {
    const entities = Array.from({ length: 200 }, (_, i) => entity(`e${i}`));
    const doc = buildReport(
      { entities, relationships: [], factionMembership: {} },
      options(),
    );
    expect(doc.sections).toHaveLength(200);
  });
});

describe("buildReport locations", () => {
  const places = (): ReportInput => ({
    entities: [
      entity("realm", { title: "Realm", type: "location" }),
      entity("keep", { title: "Keep", type: "location", parent: "realm" }),
      entity("guard", { title: "Guard", parent: "realm" }),
      entity("far", { title: "Far", type: "location", parent: "gone" }),
    ],
    relationships: [{ sourceId: "keep", targetId: "guard", label: "houses" }],
    factionMembership: {},
  });
  const loc = (doc: ReturnType<typeof buildReport>, id: string) => {
    const s = doc.sections.find((x) => x.entity.id === id)!;
    if (s.kind !== "location") throw new Error("not a location");
    return s;
  };

  it("gives locations their parent, contents and relationships", () => {
    const doc = buildReport(places(), options());
    expect(loc(doc, "keep").parent?.id).toBe("realm");
    expect(loc(doc, "realm").contains.map((c) => c.id)).toEqual([
      "guard",
      "keep",
    ]);
    expect(loc(doc, "keep").relationships).toHaveLength(1);
  });

  it("ignores a parent that is outside the report", () => {
    expect(loc(buildReport(places(), options()), "far").parent).toBeUndefined();
  });

  it("omits parent and contents when relationships are off", () => {
    const doc = buildReport(
      places(),
      options({
        include: { ...DEFAULT_REPORT_INCLUDE, relationships: false },
      }),
    );
    expect(loc(doc, "keep").parent).toBeUndefined();
    expect(loc(doc, "realm").contains).toEqual([]);
  });
});

describe("buildReport connection sources", () => {
  const input = (): ReportInput => ({
    entities: [
      entity("f", { title: "Guild", type: "faction" }),
      entity("a", { title: "Ann" }),
      entity("b", { title: "Bob" }),
    ],
    relationships: [
      { sourceId: "a", targetId: "f", label: "member", sources: ["canvas"] },
      { sourceId: "b", targetId: "f", label: "member", sources: ["graph"] },
      {
        sourceId: "a",
        targetId: "b",
        label: "ally",
        sources: ["canvas", "graph"],
      },
    ],
    factionMembership: { f: ["a", "b"] },
  });
  const withSources = (canvasConnections: boolean, graphConnections: boolean) =>
    buildReport(
      input(),
      options({
        include: {
          ...DEFAULT_REPORT_INCLUDE,
          canvasConnections,
          graphConnections,
        },
      }),
    );
  const members = (doc: ReturnType<typeof buildReport>) => {
    const f = doc.sections.find((s) => s.entity.id === "f")!;
    return f.kind === "faction" ? f.members.map((m) => m.id) : [];
  };

  it("keeps everything when both sources are on", () => {
    const doc = withSources(true, true);
    expect(doc.overview.relationshipCount).toBe(3);
    expect(members(doc)).toEqual(["a", "b"]);
  });

  it("keeps only canvas relationships and members when graph is off", () => {
    const doc = withSources(true, false);
    expect(doc.relationshipSummary.map((l) => l.label).sort()).toEqual([
      "ally",
      "member",
    ]);
    expect(members(doc)).toEqual(["a"]);
  });

  it("keeps only graph relationships and members when canvas is off", () => {
    const doc = withSources(false, true);
    expect(members(doc)).toEqual(["b"]);
    expect(doc.overview.relationshipCount).toBe(2);
  });

  it("drops all sourced relationships and members when both are off", () => {
    const doc = withSources(false, false);
    expect(doc.overview.relationshipCount).toBe(0);
    expect(members(doc)).toEqual([]);
  });

  it("always keeps a relationship that has no source recorded", () => {
    const doc = buildReport(
      {
        ...input(),
        relationships: [{ sourceId: "a", targetId: "b", label: "old" }],
      },
      options({
        include: {
          ...DEFAULT_REPORT_INCLUDE,
          canvasConnections: false,
          graphConnections: false,
        },
      }),
    );
    expect(doc.overview.relationshipCount).toBe(1);
  });
});
