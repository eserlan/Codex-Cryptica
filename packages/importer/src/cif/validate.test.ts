import { describe, it, expect } from "vitest";
import { CifManifestSchema } from "./package";
import { validateCifManifest } from "./validate";
import {
  validMinimalManifest,
  manifestWithDuplicateEntityKey,
  manifestWithDuplicateRelationshipKey,
  manifestWithUnresolvedParent,
  manifestWithUnresolvedEndpoint,
  manifestWithUnresolvedAssetRef,
  manifestWithSelfLink,
  manifestWithHierarchyCycle,
  manifestWithDeepParentChain,
  manifestWithoutWorldKey,
  manifestWithUnknownKindAndExtension,
  manifestWithNonEmptyAssets,
} from "./fixtures";

function validate(raw: unknown) {
  const manifest = CifManifestSchema.parse(raw);
  return validateCifManifest(manifest);
}

describe("validateCifManifest — blocking errors (T011/FR-002/FR-003)", () => {
  it("passes a minimal valid manifest with no errors", () => {
    const result = validate(validMinimalManifest());
    expect(result.ok).toBe(true);
  });

  it("rejects a duplicate entity key, naming the record", () => {
    const result = validate(manifestWithDuplicateEntityKey());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const err = result.errors.find((e) => e.code === "duplicate-entity-key");
      expect(err).toBeTruthy();
      expect(err?.recordKey).toBe("characters/a");
    }
  });

  it("rejects a duplicate relationship key, naming the record", () => {
    const result = validate(manifestWithDuplicateRelationshipKey());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const err = result.errors.find(
        (e) => e.code === "duplicate-relationship-key",
      );
      expect(err).toBeTruthy();
      expect(err?.recordKey).toBe("rel-1");
    }
  });

  it("rejects an unresolved parent reference, naming the record", () => {
    const result = validate(manifestWithUnresolvedParent());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const err = result.errors.find((e) => e.code === "unresolved-parent");
      expect(err).toBeTruthy();
      expect(err?.recordKey).toBe("characters/a");
      expect(err?.message).toContain("does/not/exist");
    }
  });

  it("rejects an unresolved relationship endpoint", () => {
    const result = validate(manifestWithUnresolvedEndpoint());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const err = result.errors.find((e) => e.code === "unresolved-endpoint");
      expect(err).toBeTruthy();
      expect(err?.message).toContain("does/not/exist");
    }
  });

  it("rejects an unresolved media asset reference", () => {
    const result = validate(manifestWithUnresolvedAssetRef());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const err = result.errors.find((e) => e.code === "unresolved-asset-ref");
      expect(err).toBeTruthy();
      expect(err?.recordKey).toBe("characters/a");
      expect(err?.message).toContain("missing-asset");
    }
  });

  it("rejects a self-link relationship", () => {
    const result = validate(manifestWithSelfLink());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const err = result.errors.find((e) => e.code === "self-link");
      expect(err).toBeTruthy();
    }
  });

  it("rejects a hierarchy cycle, naming every member entity", () => {
    const result = validate(manifestWithHierarchyCycle());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const err = result.errors.find((e) => e.code === "hierarchy-cycle");
      expect(err).toBeTruthy();
      expect(err?.message).toContain("places/a");
      expect(err?.message).toContain("places/b");
    }
  });

  it("detects cycles without recursing, even on a 10,000-deep parent chain (no cycle)", () => {
    const result = validate(manifestWithDeepParentChain(10000));
    expect(result.ok).toBe(true);
  });

  it("every error carries a code and message", () => {
    const result = validate(manifestWithDuplicateEntityKey());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      for (const err of result.errors) {
        expect(typeof err.code).toBe("string");
        expect(typeof err.message).toBe("string");
      }
    }
  });
});

describe("validateCifManifest — warnings never block (T011/FR-011/FR-012)", () => {
  it("an unknown kind yields ok:true plus a warning", () => {
    const result = validate(manifestWithUnknownKindAndExtension());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings.some((w) => w.code === "cif.unmapped-kind")).toBe(
        true,
      );
    }
  });

  it("an unknown extension yields ok:true plus a warning", () => {
    const result = validate(manifestWithUnknownKindAndExtension());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        result.warnings.some((w) => w.code === "cif.unknown-extension"),
      ).toBe(true);
    }
  });

  it("non-empty assets yield ok:true plus a warning", () => {
    const result = validate(manifestWithNonEmptyAssets());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(
        result.warnings.some((w) => w.code === "cif.assets-not-imported"),
      ).toBe(true);
    }
  });

  it("missing worldKey yields ok:true plus a warning", () => {
    const result = validate(manifestWithoutWorldKey());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings.some((w) => w.code === "cif.no-world-key")).toBe(
        true,
      );
    }
  });
});
