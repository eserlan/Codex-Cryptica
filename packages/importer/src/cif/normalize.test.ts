import { describe, it, expect } from "vitest";
import { CifManifestSchema } from "./package";
import {
  normalizeCifPackage,
  cifSourceRefBuilder,
  buildCifSourceRef,
} from "./normalize";
import { ImportEngine } from "../cc/engine";
import {
  validMinimalManifest,
  manifestWithoutWorldKey,
  manifestWithUndirectedRelationship,
  manifestWithDuplicateRelationshipRecords,
  manifestWithDatesAtEachPrecision,
  manifestWithUnknownKindAndExtension,
  manifestWithNonEmptyAssets,
} from "./fixtures";

function normalize(raw: unknown) {
  const manifest = CifManifestSchema.parse(raw);
  return normalizeCifPackage(manifest);
}

describe("normalizeCifPackage — field mapping (T005)", () => {
  it("maps summary to content and content.body to lore", () => {
    const { pkg } = normalize(
      validMinimalManifest({
        entities: [
          {
            key: "characters/a",
            title: "A",
            summary: "Short desc",
            content: { format: "markdown", body: "Long-form lore" },
          },
        ],
      }),
    );
    expect(pkg.entityDrafts[0].content).toBe("Short desc");
    expect(pkg.entityDrafts[0].lore).toBe("Long-form lore");
  });

  it("dedupes labels and aliases", () => {
    const { pkg } = normalize(
      validMinimalManifest({
        entities: [
          {
            key: "characters/a",
            title: "A",
            labels: ["pirate", "pirate", "captain"],
            aliases: ["Lyra", "Lyra"],
          },
        ],
      }),
    );
    expect(pkg.entityDrafts[0].labels).toEqual(["pirate", "captain"]);
    expect(pkg.entityDrafts[0].aliases).toEqual(["Lyra"]);
  });

  it("maps kind to sourceType and parent to a resolvable sourceRef", () => {
    const { pkg } = normalize(
      validMinimalManifest({
        system: "tool",
        worldKey: "world-1",
        entities: [
          { key: "places/harbor", kind: "location", title: "Harbor" },
          {
            key: "places/harbor/docks",
            kind: "location",
            title: "Docks",
            parent: "places/harbor",
          },
        ],
      }),
    );
    expect(pkg.entityDrafts[1].sourceType).toBe("location");
    expect(pkg.entityDrafts[1].parentRef).toBe(
      buildCifSourceRef("tool", "world-1", "places/harbor"),
    );
  });

  it("keeps tags empty (Constitution XII — no public tags concept)", () => {
    const { pkg } = normalize(validMinimalManifest());
    for (const draft of pkg.entityDrafts) {
      expect(draft.tags).toEqual([]);
    }
  });

  it("uses the world title as sourceLabel (FR-006)", () => {
    const { pkg } = normalize(
      validMinimalManifest({ worldTitle: "The Shattered Coast" }),
    );
    expect(pkg.sourceLabel).toBe("The Shattered Coast");
  });

  it("produces exactly one entity draft per package entity (FR-006 — world metadata never becomes a draft)", () => {
    const { pkg } = normalize(
      validMinimalManifest({
        entities: [
          { key: "characters/a", title: "A" },
          { key: "characters/b", title: "B" },
          { key: "characters/c", title: "C" },
        ],
      }),
    );
    expect(pkg.entityDrafts.length).toBe(3);
  });

  it("maps dates at year/month/day precision", () => {
    const { pkg } = normalize(manifestWithDatesAtEachPrecision());
    const year = pkg.entityDrafts.find((d) => d.title === "characters/year");
    const month = pkg.entityDrafts.find((d) => d.title === "characters/month");
    const day = pkg.entityDrafts.find((d) => d.title === "characters/day");
    expect(year?.startDate).toEqual({
      year: 1142,
      month: undefined,
      day: undefined,
    });
    expect(month?.startDate).toEqual({ year: 1142, month: 7, day: undefined });
    expect(day?.startDate).toEqual({ year: 1142, month: 7, day: 18 });
  });
});

describe("normalizeCifPackage — relationships (T005/FR-013)", () => {
  it("imports a directed relationship as one draft", () => {
    const { pkg } = normalize(
      validMinimalManifest({
        relationships: [
          { from: "characters/a", to: "characters/b", kind: "serves" },
        ],
      }),
    );
    expect(pkg.relationshipDrafts.length).toBe(1);
  });

  it("imports an undirected relationship as two reciprocal drafts", () => {
    const { pkg } = normalize(manifestWithUndirectedRelationship());
    expect(pkg.relationshipDrafts.length).toBe(2);
    expect(pkg.relationshipDrafts[0].fromRef).toBe(
      pkg.relationshipDrafts[1].toRef,
    );
    expect(pkg.relationshipDrafts[0].toRef).toBe(
      pkg.relationshipDrafts[1].fromRef,
    );
  });

  it("stages an in-package duplicate relationship once, with a warning", () => {
    const { pkg, warnings } = normalize(
      manifestWithDuplicateRelationshipRecords(),
    );
    expect(pkg.relationshipDrafts.length).toBe(1);
    expect(warnings.some((w) => w.code === "cif.duplicate-relationship")).toBe(
      true,
    );
  });
});

describe("normalizeCifPackage — identity (T005/FR-014)", () => {
  it("is injective: crafted keys containing ':' or '%' cannot collide", () => {
    const { pkg: pkgA } = normalize(
      validMinimalManifest({
        system: "sys:a",
        worldKey: "world",
        entities: [{ key: "k", title: "A" }],
      }),
    );
    const { pkg: pkgB } = normalize(
      validMinimalManifest({
        system: "sys",
        worldKey: "a:world",
        entities: [{ key: "k", title: "A" }],
      }),
    );
    expect(pkgA.entityDrafts[0].sourceId).not.toBe(
      pkgB.entityDrafts[0].sourceId,
    );
  });

  it("is kind-independent: changing kind does not change identity", () => {
    const { pkg: pkg1 } = normalize(
      validMinimalManifest({
        entities: [{ key: "k", kind: "character", title: "A" }],
      }),
    );
    const { pkg: pkg2 } = normalize(
      validMinimalManifest({
        entities: [{ key: "k", kind: "creature", title: "A" }],
      }),
    );
    expect(pkg1.entityDrafts[0].sourceId).toBe(pkg2.entityDrafts[0].sourceId);
  });

  it("warns when worldKey is missing, using an empty identity component", () => {
    const { warnings } = normalize(manifestWithoutWorldKey());
    expect(warnings.some((w) => w.code === "cif.no-world-key")).toBe(true);
  });

  it("output always passes ImportEngine.parsePackage (contract guarantee 5)", () => {
    const { pkg } = normalize(validMinimalManifest());
    const engine = new ImportEngine({
      writer: {
        findBySourceRef: async () => null,
        createEntity: async () => ({ id: "x" }),
        updateEntity: async () => {},
        appendConnection: async () => ({ created: true }),
        saveAsset: async () => ({ ref: "x" }),
      },
    });
    const result = engine.parsePackage(pkg);
    expect(result.ok).toBe(true);
  });
});

describe("normalizeCifPackage — warnings (T005/FR-011/FR-012/FR-004)", () => {
  it("reports unknown kinds and unknown extensions without dropping the entity", () => {
    const { pkg } = normalize(manifestWithUnknownKindAndExtension());
    expect(pkg.entityDrafts.length).toBe(1);
    expect(pkg.entityDrafts[0].sourceType).toBe("deity");
  });

  it("reports non-empty assets as not-imported without failing", () => {
    const { warnings } = normalize(manifestWithNonEmptyAssets());
    expect(warnings.some((w) => w.code === "cif.assets-not-imported")).toBe(
      true,
    );
  });

  it("reports an unknown extension namespace, named, without dropping the entity (T015)", () => {
    const { pkg, warnings } = normalize(manifestWithUnknownKindAndExtension());
    expect(pkg.entityDrafts.length).toBe(1);
    const warning = warnings.find((w) => w.code === "cif.unknown-extension");
    expect(warning).toBeTruthy();
    expect(warning?.message).toContain("some-tool");
  });
});

describe("cifSourceRefBuilder (T005/T006)", () => {
  it("produces the documented cif:entity:<system>:<worldKey>:<key> shape", () => {
    const ref = buildCifSourceRef("tool", "world-1", "characters/a");
    expect(ref).toBe(
      `cif:entity:tool:world-1:${encodeURIComponent("characters/a")}`,
    );
  });

  it("matches what cifSourceRefBuilder produces from a normalized draft", () => {
    const { pkg } = normalize(
      validMinimalManifest({
        system: "tool",
        worldKey: "world-1",
        entities: [{ key: "characters/a", title: "A" }],
      }),
    );
    const built = cifSourceRefBuilder("cif", pkg.entityDrafts[0]);
    expect(built).toBe(buildCifSourceRef("tool", "world-1", "characters/a"));
  });
});
