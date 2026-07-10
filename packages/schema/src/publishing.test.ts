import { describe, expect, it } from "vitest";
import {
  CopyrightReportSchema,
  DirectoryPageSchema,
  DirectoryQuerySchema,
  DirectoryResultSchema,
  ListingDraftSchema,
  PUBLISH_LIMITS,
  PublicListingSchema,
  PublishedNoticeSchema,
  SuspensionMarkerSchema,
} from "./publishing";

describe("publishing directory schemas", () => {
  const validDraft = {
    publishId: "publish-123",
    title: "Neon Wastes",
    description: "A public-facing campaign listing.",
    labels: ["cyberpunk", "nomads"],
    coverImageAssetId: "cover.webp",
    coverImageAlt: "A neon skyline at dusk",
    ownerDisplayName: "Eserlan",
    rightsAcknowledged: true as const,
  };

  const validListing = {
    schemaVersion: 1 as const,
    publishId: "publish-123",
    guestUrl: "/guest/publish-123",
    title: "Neon Wastes",
    description: "A public-facing campaign listing.",
    labels: ["cyberpunk", "nomads"],
    coverImageAssetId: "cover.webp",
    coverImageAlt: "A neon skyline at dusk",
    ownerDisplayName: "Eserlan",
    visibleEntityCount: 42,
    snapshotPublishedAt: "2026-06-30T12:00:00.000Z",
    listingCreatedAt: "2026-06-30T12:00:00.000Z",
    listingUpdatedAt: "2026-06-30T12:00:00.000Z",
  };

  it("accepts valid public listing metadata", () => {
    expect(ListingDraftSchema.parse(validDraft)).toEqual({
      ...validDraft,
      fanContent: false,
    });
    expect(PublicListingSchema.parse(validListing)).toEqual(validListing);
    expect(
      DirectoryResultSchema.parse({
        publishId: validListing.publishId,
        guestUrl: validListing.guestUrl,
        title: validListing.title,
        description: validListing.description,
        labels: validListing.labels,
        coverImageUrl:
          "https://oracle-proxy.espen-erlandsen.workers.dev/api/published/publish-123/assets/cover.webp",
        coverImageAlt: validListing.coverImageAlt,
        ownerDisplayName: validListing.ownerDisplayName,
        visibleEntityCount: validListing.visibleEntityCount,
        listingUpdatedAt: validListing.listingUpdatedAt,
      }),
    ).toBeTruthy();
    expect(
      DirectoryPageSchema.parse({
        results: [],
        nextCursor: "24",
      }).nextCursor,
    ).toBe("24");
  });

  it("rejects missing required fields and zero labels", () => {
    expect(
      ListingDraftSchema.safeParse({
        publishId: "publish-123",
        description: "desc",
        labels: ["one"],
      }).success,
    ).toBe(false);
    expect(
      ListingDraftSchema.safeParse({
        ...validDraft,
        labels: [],
      }).success,
    ).toBe(false);
  });

  it("rejects overlong fields", () => {
    expect(
      ListingDraftSchema.safeParse({
        ...validDraft,
        title: "x".repeat(PUBLISH_LIMITS.maxListingTitleLength + 1),
      }).success,
    ).toBe(false);
    expect(
      DirectoryQuerySchema.safeParse({
        q: "x".repeat(PUBLISH_LIMITS.maxDirectorySearchLength + 1),
      }).success,
    ).toBe(false);
  });

  it("rejects extra private and editor-only fields", () => {
    const result = PublicListingSchema.safeParse({
      ...validListing,
      writeToken: "secret",
      localVaultId: "vault-1",
      entityId: "entity-1",
      editableUrl: "/vault/123",
      privateNotes: "do not leak",
      hiddenRelationshipDetails: ["secret"],
      generationPrompt: "private prompt",
      privateMetadata: { key: "value" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects tag terminology and editable guest routes", () => {
    expect(
      PublicListingSchema.safeParse({
        ...validListing,
        labels: ["tags"],
      }).success,
    ).toBe(false);
    expect(
      PublicListingSchema.safeParse({
        ...validListing,
        guestUrl: "/vault/publish-123",
      }).success,
    ).toBe(false);
  });

  describe("copyright notice schemas", () => {
    it("enforces rightsAcknowledged literal(true) on ListingDraftSchema", () => {
      expect(
        ListingDraftSchema.safeParse({
          ...validDraft,
          rightsAcknowledged: undefined,
        }).success,
      ).toBe(false);

      expect(
        ListingDraftSchema.safeParse({
          ...validDraft,
          rightsAcknowledged: false,
        }).success,
      ).toBe(false);

      expect(
        ListingDraftSchema.safeParse({
          ...validDraft,
          rightsAcknowledged: true,
          fanContent: true,
          fanContentDisclaimer: "Unofficial fan content referencing setting X.",
        }).success,
      ).toBe(true);
    });

    it("accepts optional rightsAcknowledgedAt and fanContent on PublicListingSchema", () => {
      const extendedListing = {
        ...validListing,
        rightsAcknowledgedAt: "2026-07-10T12:00:00.000Z",
        fanContent: true,
      };
      expect(PublicListingSchema.parse(extendedListing)).toEqual(
        extendedListing,
      );
    });

    it("validates PublishedNoticeSchema correctly", () => {
      const validNotice = {
        schemaVersion: 1 as const,
        publishId: "publish-123",
        fanContent: true,
        fanContentDisclaimer: "Custom disclaimer text.",
        rightsAcknowledgedAt: "2026-07-10T12:00:00.000Z",
        updatedAt: "2026-07-10T12:00:00.000Z",
      };
      expect(PublishedNoticeSchema.parse(validNotice)).toEqual(validNotice);

      expect(
        PublishedNoticeSchema.safeParse({
          ...validNotice,
          fanContentDisclaimer: "x".repeat(501),
        }).success,
      ).toBe(false);
    });

    it("validates CopyrightReportSchema correctly", () => {
      const validReport = {
        schemaVersion: 1 as const,
        reportId: "report-uuid",
        vaultUrl: "https://codexcryptica.com/guest/publish-123",
        publishId: "publish-123",
        rightsHolder: "Wizards of the Coast",
        material: "Map on page 4",
        reporterContact: "reporter@example.com",
        details: "Detailed explanation",
        receivedAt: "2026-07-10T12:00:00.000Z",
        vaultState: "listed" as const,
      };
      expect(CopyrightReportSchema.parse(validReport)).toEqual(validReport);

      expect(
        CopyrightReportSchema.safeParse({
          ...validReport,
          reporterContact: "ab",
        }).success,
      ).toBe(false);
    });

    it("validates SuspensionMarkerSchema correctly", () => {
      const validMarker = {
        schemaVersion: 1 as const,
        publishId: "publish-123",
        mode: "disable" as const,
        reason: "copyright claim under review",
        createdAt: "2026-07-10T12:00:00.000Z",
      };
      expect(SuspensionMarkerSchema.parse(validMarker)).toEqual(validMarker);

      expect(
        SuspensionMarkerSchema.safeParse({
          ...validMarker,
          mode: "invalid-mode",
        }).success,
      ).toBe(false);
    });
  });
});
