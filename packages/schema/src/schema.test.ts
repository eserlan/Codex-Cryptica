import { describe, it, expect } from "vitest";
import {
  EntitySchema,
  CategorySchema,
  DateSelectionSchema,
  DEFAULT_ICON,
  GuestChatConfigSchema,
  GuestChatTranscriptSchema,
} from "./entity";
import {
  PublishRegistrySchema,
  GuestHistorySchema,
  GuestBundleSchema,
} from "./publishing";

describe("Entity Schema Validation", () => {
  it("should validate a correct entity", () => {
    const validEntity = {
      id: "npc-1",
      type: "npc",
      title: "Valid NPC",
      tags: ["test"],
      connections: [{ target: "loc-1", type: "located_in", strength: 1 }],
      content: "Some content",
    };

    const result = EntitySchema.safeParse(validEntity);
    expect(result.success).toBe(true);
  });

  it("should validate an entity with labels", () => {
    const labeledEntity = {
      id: "npc-2",
      type: "npc",
      title: "Labeled NPC",
      labels: ["Villain", "Session 1"],
    };

    const result = EntitySchema.safeParse(labeledEntity);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.labels).toContain("Villain");
      expect(result.data.labels).toHaveLength(2);
    }
  });

  it("should validate an entity with aliases", () => {
    const aliasedEntity = {
      id: "npc-5",
      type: "npc",
      title: "King Arthur",
      aliases: ["Wart", "The High King"],
    };

    const result = EntitySchema.safeParse(aliasedEntity);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aliases).toContain("Wart");
      expect(result.data.aliases).toHaveLength(2);
    }
  });

  it("should default aliases to an empty array when omitted", () => {
    const entityWithoutAliases = {
      id: "npc-6",
      type: "npc",
      title: "Aliasless NPC",
    };

    const result = EntitySchema.safeParse(entityWithoutAliases);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aliases).toEqual([]);
      expect(result.data.aliases).toHaveLength(0);
    }
  });

  it("should accept custom entity types (flexible categories)", () => {
    const customTypeEntity = {
      id: "artifact-1",
      type: "artifact", // Custom category type
      title: "Magic Sword",
    };

    const result = EntitySchema.safeParse(customTypeEntity);
    expect(result.success).toBe(true);
  });

  it("should validate connection with friendly/enemy/neutral types", () => {
    const entity = {
      id: "npc-3",
      type: "npc",
      title: "Connection Test",
      connections: [
        { target: "ally", type: "friendly", strength: 1 },
        { target: "rival", type: "enemy", strength: 1 },
        { target: "stranger", type: "neutral", strength: 0.5 },
      ],
    };
    const result = EntitySchema.safeParse(entity);
    expect(result.success).toBe(true);
  });

  it("should validate connection with custom label", () => {
    const entity = {
      id: "npc-4",
      type: "npc",
      title: "Label Test",
      connections: [{ target: "dad", type: "related_to", label: "Father" }],
    };
    const result = EntitySchema.safeParse(entity);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.connections[0].label).toBe("Father");
    }
  });
});

describe("Category Schema Validation", () => {
  it("should validate a valid category", () => {
    const validCategory = {
      id: "custom-type",
      label: "Custom Type",
      color: "#ff5500",
      icon: "lucide:star",
    };

    const result = CategorySchema.safeParse(validCategory);
    expect(result.success).toBe(true);
  });

  it("should use default icon when not provided", () => {
    const categoryWithoutIcon = {
      id: "no-icon",
      label: "No Icon Category",
      color: "#123abc",
    };

    const result = CategorySchema.parse(categoryWithoutIcon);
    expect(result.icon).toBe(DEFAULT_ICON);
  });

  it("should reject invalid hex color", () => {
    const invalidColor = {
      id: "bad-color",
      label: "Bad Color",
      color: "not-a-color",
    };

    const result = CategorySchema.safeParse(invalidColor);
    expect(result.success).toBe(false);
  });

  it("should reject 3-digit hex color", () => {
    const shortHex = {
      id: "short-hex",
      label: "Short Hex",
      color: "#fff",
    };

    const result = CategorySchema.safeParse(shortHex);
    expect(result.success).toBe(false);
  });

  it("should reject empty ID", () => {
    const emptyId = {
      id: "",
      label: "Empty ID",
      color: "#ffffff",
    };

    const result = CategorySchema.safeParse(emptyId);
    expect(result.success).toBe(false);
  });

  it("should reject empty label", () => {
    const emptyLabel = {
      id: "empty-label",
      label: "",
      color: "#ffffff",
    };

    const result = CategorySchema.safeParse(emptyLabel);
    expect(result.success).toBe(false);
  });
});

describe("TemporalMetadataSchema Compatibility Validation", () => {
  it("should validate a legacy temporal metadata date", () => {
    const legacyDate = {
      year: 1240,
      month: 5,
      day: 12,
      label: "Legacy Date",
    };
    const result = EntitySchema.shape.date.parse(legacyDate);
    expect(result.year).toBe(1240);
    expect(result.month).toBe(5);
    expect(result.day).toBe(12);
    expect(result.label).toBe("Legacy Date");
  });

  it("should validate a new DateSelection shape", () => {
    const newDateSelection = {
      precision: "day",
      year: 2026,
      unitId: "m1",
      day: 5,
      calendarRevision: 2,
      label: "My Selection",
    };
    const result = EntitySchema.shape.date.parse(newDateSelection);
    expect(result.precision).toBe("day");
    expect(result.year).toBe(2026);
    expect(result.unitId).toBe("m1");
    expect(result.day).toBe(5);
    expect(result.calendarRevision).toBe(2);
    expect(result.label).toBe("My Selection");
  });

  it("should validate an anchor DateSelection shape", () => {
    const anchorSelection = {
      precision: "anchor",
      year: 2026,
      anchorId: "anc1",
      calendarRevision: 2,
    };
    const result = EntitySchema.shape.date.parse(anchorSelection);
    expect(result.precision).toBe("anchor");
    expect(result.year).toBe(2026);
    expect(result.anchorId).toBe("anc1");
    expect(result.calendarRevision).toBe(2);
  });

  describe("DateSelectionSchema superRefine validations (negative paths)", () => {
    it("should reject precision 'unit' without unitId", () => {
      const invalid = {
        precision: "unit",
        year: 2026,
        calendarRevision: 2,
      };
      const result = DateSelectionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "unitId is required when precision is 'unit'",
        );
      }
    });

    it("should reject precision 'day' without unitId", () => {
      const invalid = {
        precision: "day",
        year: 2026,
        day: 5,
        calendarRevision: 2,
      };
      const result = DateSelectionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (e) => e.message === "unitId is required when precision is 'day'",
          ),
        ).toBe(true);
      }
    });

    it("should reject precision 'day' without day", () => {
      const invalid = {
        precision: "day",
        year: 2026,
        unitId: "m1",
        calendarRevision: 2,
      };
      const result = DateSelectionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (e) => e.message === "day is required when precision is 'day'",
          ),
        ).toBe(true);
      }
    });

    it("should reject precision 'anchor' without anchorId", () => {
      const invalid = {
        precision: "anchor",
        year: 2026,
        calendarRevision: 2,
      };
      const result = DateSelectionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "anchorId is required when precision is 'anchor'",
        );
      }
    });
  });

  describe("Guest Chat Schemas", () => {
    it("should validate a correct GuestChatConfig", () => {
      const config = {
        isEnabled: true,
        contextScope: "hybrid",
        extraInstructions: "Speak softly",
        isHostReviewable: true,
        keepMemory: true,
      };
      const result = GuestChatConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should validate a correct GuestChatTranscript", () => {
      const transcript = {
        id: "guest1_char1",
        guestId: "guest1",
        guestName: "Player 1",
        characterId: "char1",
        characterTitle: "Mira",
        messages: [
          { id: "msg1", role: "user", content: "Hello", timestamp: 12345 },
          {
            id: "msg2",
            role: "assistant",
            content: "Welcome!",
            timestamp: 12346,
          },
        ],
        lastUpdated: 12346,
      };
      const result = GuestChatTranscriptSchema.safeParse(transcript);
      expect(result.success).toBe(true);
    });

    it("should validate an entity with GuestChatConfig", () => {
      const entity = {
        id: "char-1",
        type: "character",
        title: "Mira the Innkeeper",
        guestChatConfig: {
          isEnabled: true,
          contextScope: "public",
        },
      };
      const result = EntitySchema.safeParse(entity);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.guestChatConfig?.isEnabled).toBe(true);
        expect(result.data.guestChatConfig?.contextScope).toBe("public");
      }
    });
  });

  describe("Publishing Schemas", () => {
    it("should validate a correct PublishRegistry", () => {
      const registry = {
        vaultId: "v-1",
        publishId: "pub-123",
        writeToken: "token-abc",
        publishedAt: "2026-06-22T22:00:00Z",
        stats: {
          entityCount: 15,
          relationshipCount: 8,
          assetCount: 3,
        },
      };
      const result = PublishRegistrySchema.safeParse(registry);
      expect(result.success).toBe(true);
    });

    it("should validate a correct GuestHistory", () => {
      const history = {
        publishId: "pub-123",
        vaultTitle: "My Campaign",
        lastAccessed: "2026-06-22T22:00:00Z",
      };
      const result = GuestHistorySchema.safeParse(history);
      expect(result.success).toBe(true);
    });

    it("should validate a correct GuestBundle", () => {
      const bundle = {
        schemaVersion: 1,
        publishId: "pub-123",
        vaultTitle: "My Campaign",
        publishedAt: "2026-06-22T22:00:00Z",
        publisherVersion: "1.0.0",
        activeTheme: { primaryColor: "#ffffff" },
        entities: [
          {
            id: "entity-1",
            type: "note",
            title: "My Entity",
          },
        ],
        relationships: [
          {
            id: "rel-1",
            sourceId: "entity-1",
            targetId: "entity-2",
            label: "knows",
          },
        ],
        assetManifest: [
          {
            assetId: "asset-1",
            filename: "map.png",
            mimeType: "image/png",
            hash: "a3f1c9c7f20f1df4d1b24c97ca7e6c84e721d99794065f9675b6a6c437f8f0f2",
          },
        ],
      };
      const result = GuestBundleSchema.safeParse(bundle);
      expect(result.success).toBe(true);
    });
  });
});
