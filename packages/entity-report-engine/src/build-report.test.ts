import { describe, expect, it } from "vitest";
import { buildReport } from "./build-report";
import { DEFAULT_REPORT_INCLUDE } from "./defaults";
import { entity, options, sampleInput } from "./test-fixtures";
import type { ReportInput } from "./types";

const detailed = (over: Partial<typeof DEFAULT_REPORT_INCLUDE> = {}) =>
  options({
    detail: "detailed",
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
