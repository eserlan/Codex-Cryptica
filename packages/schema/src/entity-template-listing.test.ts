import { describe, expect, it } from "vitest";
import {
  CommunityTemplateListingSchema,
  EntityTemplateDirectoryPageSchema,
  EntityTemplateDirectoryQuerySchema,
  EntityTemplateIndexSchema,
  EntityTemplateListingSchema,
  EntityTemplateReportInputSchema,
} from "./index";

const now = "2026-09-29T10:00:00.000Z";

const listing = {
  schemaVersion: 1 as const,
  templateKind: "entity" as const,
  listingId: "abc",
  title: "Guild Hall",
  description: "A place for guilds.",
  entityType: "location",
  labels: ["Fantasy"],
  packageVersion: 1,
  status: "active" as const,
  listingCreatedAt: now,
  listingUpdatedAt: now,
};

describe("EntityTemplateListingSchema", () => {
  it("parses a valid listing", () => {
    expect(EntityTemplateListingSchema.parse(listing)).toEqual(listing);
  });

  it("requires the entity discriminator", () => {
    expect(
      EntityTemplateListingSchema.safeParse({
        ...listing,
        templateKind: "stat-sheet",
      }).success,
    ).toBe(false);
    const { templateKind: _kind, ...withoutKind } = listing;
    expect(EntityTemplateListingSchema.safeParse(withoutKind).success).toBe(
      false,
    );
  });

  it.each(["ownerToken", "ownerTokenHash", "importCount", "markdown"])(
    "rejects an unknown key: %s",
    (key) => {
      expect(
        EntityTemplateListingSchema.safeParse({ ...listing, [key]: "x" })
          .success,
      ).toBe(false);
    },
  );

  it("enforces label and description limits", () => {
    const bad = (patch: object) =>
      EntityTemplateListingSchema.safeParse({ ...listing, ...patch }).success;
    expect(bad({ labels: [] })).toBe(false);
    expect(bad({ labels: Array.from({ length: 9 }, (_, i) => `l${i}`) })).toBe(
      false,
    );
    expect(bad({ labels: ["l".repeat(31)] })).toBe(false);
    expect(bad({ description: "d".repeat(501) })).toBe(false);
    expect(bad({ description: "" })).toBe(false);
    expect(bad({ title: "t".repeat(81) })).toBe(false);
    expect(bad({ entityType: "t".repeat(61) })).toBe(false);
  });

  it("only allows the active and unpublished statuses", () => {
    expect(
      EntityTemplateListingSchema.safeParse({ ...listing, status: "deleted" })
        .success,
    ).toBe(false);
    expect(
      EntityTemplateListingSchema.safeParse({
        ...listing,
        status: "unpublished",
      }).success,
    ).toBe(true);
  });

  it("is not confused with a stat sheet listing in either direction", () => {
    expect(CommunityTemplateListingSchema.safeParse(listing).success).toBe(
      false,
    );
    const statSheet = {
      schemaVersion: 1,
      listingId: "s1",
      title: "Stat block",
      description: "Numbers.",
      system: "Homebrew",
      labels: [],
      packageVersion: 1,
      listingCreatedAt: now,
      listingUpdatedAt: now,
    };
    expect(CommunityTemplateListingSchema.safeParse(statSheet).success).toBe(
      true,
    );
    expect(EntityTemplateListingSchema.safeParse(statSheet).success).toBe(
      false,
    );
  });
});

describe("EntityTemplateDirectoryQuerySchema", () => {
  it("defaults the limit to 24 and caps it at 50", () => {
    expect(
      EntityTemplateDirectoryQuerySchema.parse({ kind: "entity" }).limit,
    ).toBe(24);
    expect(
      EntityTemplateDirectoryQuerySchema.safeParse({
        kind: "entity",
        limit: 51,
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown kind and unknown keys", () => {
    expect(
      EntityTemplateDirectoryQuerySchema.safeParse({ kind: "other" }).success,
    ).toBe(false);
    expect(
      EntityTemplateDirectoryQuerySchema.safeParse({ kind: "entity", extra: 1 })
        .success,
    ).toBe(false);
  });

  it("accepts filters", () => {
    const q = EntityTemplateDirectoryQuerySchema.parse({
      kind: "entity",
      q: "guild",
      entityType: "Location",
      labels: ["Fantasy"],
    });
    expect(q.labels).toEqual(["Fantasy"]);
  });
});

describe("EntityTemplateDirectoryPageSchema", () => {
  it("parses results with facets", () => {
    const page = EntityTemplateDirectoryPageSchema.parse({
      results: [listing],
      facets: { entityTypes: [{ value: "location", count: 1 }] },
    });
    expect(page.facets.entityTypes[0]).toEqual({ value: "location", count: 1 });
  });

  it("rejects a result that carries template text", () => {
    expect(
      EntityTemplateDirectoryPageSchema.safeParse({
        results: [{ ...listing, previewMarkdown: "## Notes" }],
        facets: { entityTypes: [] },
      }).success,
    ).toBe(false);
  });
});

describe("EntityTemplateReportInputSchema", () => {
  it.each(["inappropriate", "copied-without-permission", "spam", "other"])(
    "accepts %s",
    (reason) => {
      expect(
        EntityTemplateReportInputSchema.safeParse({ reason }).success,
      ).toBe(true);
    },
  );

  it("rejects other reasons and over-long details", () => {
    expect(
      EntityTemplateReportInputSchema.safeParse({ reason: "rude" }).success,
    ).toBe(false);
    expect(
      EntityTemplateReportInputSchema.safeParse({
        reason: "spam",
        details: "d".repeat(2001),
      }).success,
    ).toBe(false);
  });
});

describe("EntityTemplateIndexSchema", () => {
  it("accepts an index of active listings", () => {
    expect(
      EntityTemplateIndexSchema.safeParse({
        schemaVersion: 1,
        updatedAt: now,
        entries: [listing],
      }).success,
    ).toBe(true);
  });

  it("rejects entries carrying a token, hash, template text or a non-active status", () => {
    for (const patch of [
      { ownerToken: "t" },
      { ownerTokenHash: "h" },
      { markdown: "## x" },
      { status: "unpublished" },
    ]) {
      expect(
        EntityTemplateIndexSchema.safeParse({
          schemaVersion: 1,
          updatedAt: now,
          entries: [{ ...listing, ...patch }],
        }).success,
      ).toBe(false);
    }
  });
});
