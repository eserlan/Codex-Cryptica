import { describe, expect, it } from "vitest";
import {
  CopyrightReportSchema,
  DirectoryPageSchema,
  DirectoryQuerySchema,
  DirectoryResultSchema,
  ListingDraftSchema,
  PUBLISH_LIMITS,
  PublicListingSchema,
  PublicTemplatePackageSchema,
  PublishedNoticeSchema,
  SuspensionMarkerSchema,
  CloudBackupManifestSchema,
  LocalCloudBackupRecordSchema,
  SupportLookupResultSchema,
  CLOUD_BACKUP_LIMITS,
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

  describe("template package schemas", () => {
    const validPackage = {
      schemaVersion: 1 as const,
      template: {
        name: "Mythras Warrior",
        description: "Standard Mythras combatant layout.",
        system: "Mythras",
        labels: ["npc", "combat"],
        fields: [
          {
            id: "str_check",
            label: "STR Check",
            type: "dice" as const,
            formula: "1d20+2",
            modifierSource: "str_score",
          },
          {
            id: "weapons",
            label: "Weapons",
            type: "item-table" as const,
            linkVaultItems: true,
            columns: [
              { id: "weapon", label: "Weapon", type: "text" as const },
              { id: "damage", label: "Damage", type: "dice" as const },
            ],
          },
        ],
      },
    };

    it("accepts valid template package with item-table and modifierSource", () => {
      expect(PublicTemplatePackageSchema.parse(validPackage)).toEqual(
        validPackage,
      );
    });

    it("rejects template without system or category", () => {
      const invalid = {
        ...validPackage,
        template: {
          ...validPackage.template,
          system: undefined,
          category: undefined,
        },
      };
      expect(PublicTemplatePackageSchema.safeParse(invalid).success).toBe(
        false,
      );
    });

    it("rejects template with field min > max", () => {
      const invalid = {
        ...validPackage,
        template: {
          ...validPackage.template,
          fields: [
            {
              id: "hp",
              label: "HP",
              type: "counter" as const,
              min: 20,
              max: 10,
            },
          ],
        },
      };
      const result = PublicTemplatePackageSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(["template", "fields", 0]);
      }
    });
  });
});

describe("CC Cloud Backup schemas (spec 162)", () => {
  const manifest = {
    schemaVersion: 1,
    backupId: "b-1",
    vaultTitle: "The Saltmere Fens",
    sizeBytes: 1024,
    createdAt: "2026-08-31T10:00:00.000Z",
    lastPushedAt: "2026-08-31T10:05:00.000Z",
  };

  describe("CloudBackupManifestSchema", () => {
    it("accepts a well-formed manifest", () => {
      expect(CloudBackupManifestSchema.safeParse(manifest).success).toBe(true);
    });

    it("rejects an empty vault title", () => {
      // An empty title would make every vault ambiguous to the support lookup.
      expect(
        CloudBackupManifestSchema.safeParse({ ...manifest, vaultTitle: "" })
          .success,
      ).toBe(false);
    });

    it("rejects a negative size", () => {
      expect(
        CloudBackupManifestSchema.safeParse({ ...manifest, sizeBytes: -1 })
          .success,
      ).toBe(false);
    });

    it("treats entityCount as optional", () => {
      expect(
        CloudBackupManifestSchema.safeParse({ ...manifest, entityCount: 42 })
          .success,
      ).toBe(true);
    });
  });

  describe("LocalCloudBackupRecordSchema", () => {
    const record = {
      vaultId: "v-1",
      backupId: "b-1",
      ownerCode: "code-1",
      enabled: true,
      status: "idle" as const,
      lastPushedAt: null,
      consentedAt: "2026-08-31T10:00:00.000Z",
    };

    it("accepts a well-formed record with a null lastPushedAt", () => {
      expect(LocalCloudBackupRecordSchema.safeParse(record).success).toBe(true);
    });

    it("rejects an unknown status", () => {
      expect(
        LocalCloudBackupRecordSchema.safeParse({ ...record, status: "done" })
          .success,
      ).toBe(false);
    });

    it("requires an ownership code", () => {
      expect(
        LocalCloudBackupRecordSchema.safeParse({ ...record, ownerCode: "" })
          .success,
      ).toBe(false);
    });

    it("keeps consentedAt when disabled, so re-enabling does not re-prompt", () => {
      const disabled = { ...record, enabled: false };
      const parsed = LocalCloudBackupRecordSchema.safeParse(disabled);
      expect(parsed.success).toBe(true);
      if (parsed.success)
        expect(parsed.data.consentedAt).toBe(record.consentedAt);
    });
  });

  describe("SupportLookupResultSchema", () => {
    it("accepts a bare negative result with no metadata", () => {
      // Zero matches and several matches share this shape on purpose.
      expect(
        SupportLookupResultSchema.safeParse({ matched: false }).success,
      ).toBe(true);
    });

    it("accepts a positive result carrying metadata", () => {
      expect(
        SupportLookupResultSchema.safeParse({
          matched: true,
          backupId: "b-1",
          vaultTitle: "The Saltmere Fens",
          sizeBytes: 1024,
          lastPushedAt: "2026-08-31T10:05:00.000Z",
        }).success,
      ).toBe(true);
    });
  });

  describe("CLOUD_BACKUP_LIMITS", () => {
    it("caps a whole vault at 50 MB", () => {
      expect(CLOUD_BACKUP_LIMITS.maxVaultBytes).toBe(50 * 1024 * 1024);
    });

    it("bounds the admin lookup scan", () => {
      expect(CLOUD_BACKUP_LIMITS.maxLookupScanKeys).toBe(1_000);
    });
  });
});
