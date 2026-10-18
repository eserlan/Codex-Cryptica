import { describe, expect, it } from "vitest";
import { EntitySchema, ReportProvenanceSchema } from "./entity";

const provenance = {
  origin: "graph",
  entityIds: ["a", "b"],
  include: {
    descriptions: true,
    relationships: true,
    factionsAffiliations: true,
    portraits: true,
    notes: true,
    gmOnlySecrets: false,
  },
  detail: "standard",
  generatedAt: 1,
  contentHash: "deadbeef",
};

describe("report provenance", () => {
  it("parses and keeps a valid report field on an entity", () => {
    const entity = EntitySchema.parse({
      id: "r",
      type: "note",
      title: "Report",
      kind: "report",
      report: provenance,
    });
    expect(entity.report).toEqual(provenance);
  });

  it("rejects an unknown origin or detail level", () => {
    expect(
      ReportProvenanceSchema.safeParse({ ...provenance, origin: "map" })
        .success,
    ).toBe(false);
    expect(
      ReportProvenanceSchema.safeParse({ ...provenance, detail: "epic" })
        .success,
    ).toBe(false);
  });

  it("leaves entities without a report unchanged", () => {
    const entity = EntitySchema.parse({
      id: "n",
      type: "note",
      title: "Plain",
    });
    expect(entity.report).toBeUndefined();
  });
});
