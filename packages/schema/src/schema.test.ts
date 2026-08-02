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
import {
  LanguageGenerationResultV1Schema,
  LanguageProfileV1Schema,
  LanguageRuleSchema,
} from "./language-profile";

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

  it("should preserve a versioned language profile", () => {
    const languageProfile = LanguageProfileV1Schema.parse({
      inputs: {
        genre: "Classic Fantasy",
        tone: "Lyrical & Vowel-rich",
        role: "Common Speech",
        structure: "Suffix-heavy",
      },
      phonology: {
        consonants: ["l", "m", "n"],
        vowels: ["a", "e", "i"],
        phonotactics: ["CV", "CVCV"],
      },
      naming: {
        examples: [{ name: "Lemari", meaning: "river guide", use: "person" }],
      },
      lexicon: [{ word: "lema", pronunciation: "LEH-mah", meaning: "river" }],
      grammar: {
        examples: [
          {
            text: "Lema nai.",
            pronunciation: "LEH-mah nye",
            translation: "The river guides us.",
          },
        ],
      },
      register: { role: "Common Speech" },
      tableUseTips: ["Keep vowels open and unstressed."],
    });

    const result = EntitySchema.parse({
      id: "lemari",
      type: "note",
      title: "Lemari",
      kind: "language",
      languageProfileVersion: 1,
      languageProfile,
    });

    expect(result.languageProfileVersion).toBe(1);
    expect(result.languageProfile).toEqual(languageProfile);
  });

  it("should keep legacy language notes valid without a structured profile", () => {
    const result = EntitySchema.safeParse({
      id: "old-language",
      type: "note",
      title: "Old Language",
      kind: "language",
      lore: "Free-form legacy notes.",
    });

    expect(result.success).toBe(true);
  });
});

describe("Language Profile Schema", () => {
  it("should validate a complete v1 generation result", () => {
    const result = LanguageGenerationResultV1Schema.safeParse({
      version: 1,
      title: "Lemari",
      summary: "A flowing river-trade language.",
      labels: ["language", "conlang"],
      profile: {
        inputs: {
          genre: "Classic Fantasy",
          tone: "Lyrical & Vowel-rich",
          role: "Common Speech",
          structure: "Suffix-heavy",
        },
        culture: { speakers: "River merchants" },
        phonology: {
          consonants: ["l", "m", "n"],
          vowels: ["a", "e", "i"],
          phonotactics: ["CV", "CVCV"],
          syllablePatterns: ["CV"],
          rhythm: "Even and flowing",
        },
        rules: [
          {
            id: "name-suffix",
            domain: "naming",
            description: "Personal names end in a role suffix.",
          },
        ],
        morphology: {
          suffixes: [
            {
              sourceId: "role-guide",
              form: "ri",
              meaning: "guide",
            },
          ],
          morphemes: [
            {
              id: "role-guide",
              form: "ri",
              pronunciation: "ree",
              meaning: "guide",
              kind: "suffix",
              syllables: ["ri"],
            },
          ],
        },
        naming: {
          structuredPatterns: [
            {
              id: "person-root-role",
              use: "person",
              structure: "Suffix-heavy",
              slots: ["root", "role"],
            },
          ],
          examples: [
            {
              name: "Lemari",
              pronunciation: "LEH-mah-ree",
              meaning: "river guide",
              use: "person",
              patternId: "person-root-role",
              components: [
                {
                  slot: "root",
                  surface: "lema",
                  pronunciation: "LEH-mah",
                  meaning: "river",
                  sourceId: "river",
                  syllables: ["le", "ma"],
                },
                {
                  slot: "role",
                  surface: "ri",
                  pronunciation: "ree",
                  meaning: "guide",
                  sourceId: "role-guide",
                  syllables: ["ri"],
                },
              ],
              demonstrates: ["name-suffix"],
            },
          ],
        },
        lexicon: [
          {
            id: "river",
            word: "lema",
            pronunciation: "LEH-mah",
            meaning: "river",
            syllables: ["le", "ma"],
          },
        ],
        grammar: {
          examples: [
            {
              text: "Lema nai.",
              pronunciation: "LEH-mah nye",
              translation: "The river guides us.",
              literalTranslation: "river guide us",
              construction: "declarative",
              components: [
                {
                  slot: "subject",
                  surface: "lema",
                  pronunciation: "LEH-mah",
                  meaning: "river",
                  sourceId: "river",
                  syllables: ["le", "ma"],
                },
              ],
              demonstrates: ["name-suffix"],
            },
          ],
        },
        register: { role: "Common Speech" },
        tableUseTips: ["Keep vowels open and unstressed."],
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profile.morphology?.suffixes?.[0]).toEqual({
        sourceId: "role-guide",
        form: "ri",
        meaning: "guide",
      });
      expect(result.data.profile.naming.examples[0].components).toHaveLength(2);
      expect(result.data.profile.grammar.examples[0].construction).toBe(
        "declarative",
      );
      expect(result.data.profile.rules?.[0].domain).toBe("naming");
    }
  });

  it("should normalize scalar string-list fields to arrays", () => {
    const result = LanguageGenerationResultV1Schema.parse({
      version: 1,
      title: "Lemari",
      summary: "A trade language used in everyday markets.",
      labels: "language",
      profile: {
        inputs: {
          genre: "Classic Fantasy",
          tone: "Lyrical & Vowel-rich",
          role: "Common Speech",
          structure: "Suffix-heavy",
        },
        phonology: {
          consonants: "l",
          vowels: "e",
          phonotactics: "CV",
          pronunciationRules: "Keep vowels open.",
        },
        morphology: { prefixes: "le-" },
        naming: {
          personalNamePatterns: "Root + suffix",
          examples: [
            {
              name: "Le",
              meaning: "river",
              use: "person",
              demonstrates: "name-rule",
              components: [
                {
                  surface: "le",
                  pronunciation: "leh",
                  meaning: "river",
                  sourceId: "river",
                  appliedRuleIds: "sound-rule",
                },
                {
                  surface: "ri",
                  pronunciation: "ree",
                  meaning: "guide",
                  sourceId: "guide",
                  appliedRuleIds: [],
                },
              ],
            },
          ],
        },
        lexicon: [
          {
            word: "le",
            pronunciation: "leh",
            meaning: "river",
            demonstrates: "sound-rule",
          },
        ],
        grammar: {
          phrasePatterns: "Subject Verb",
          examples: [
            {
              text: "Le",
              pronunciation: "leh",
              translation: "River",
              demonstrates: "grammar-rule",
            },
          ],
        },
        register: {
          role: "Common Speech",
          socialRules: "Use plain forms in markets.",
        },
        tableUseTips: "Keep vowels open.",
      },
    });

    expect(result.labels).toEqual(["language"]);
    expect(result.profile.phonology.phonotactics).toEqual(["CV"]);
    expect(result.profile.phonology.pronunciationRules).toEqual([
      "Keep vowels open.",
    ]);
    expect(result.profile.morphology?.prefixes).toEqual(["le-"]);
    expect(result.profile.naming.personalNamePatterns).toEqual([
      "Root + suffix",
    ]);
    expect(result.profile.grammar.phrasePatterns).toEqual(["Subject Verb"]);
    expect(result.profile.register.socialRules).toEqual([
      "Use plain forms in markets.",
    ]);
    expect(result.profile.tableUseTips).toEqual(["Keep vowels open."]);
    expect(result.profile.naming.examples[0].demonstrates).toEqual([
      "name-rule",
    ]);
    expect(
      result.profile.naming.examples[0].components?.[0].appliedRuleIds,
    ).toEqual(["sound-rule"]);
    expect(
      result.profile.naming.examples[0].components?.[1].appliedRuleIds,
    ).toEqual([]);
    expect(result.profile.lexicon[0].demonstrates).toEqual(["sound-rule"]);
    expect(result.profile.grammar.examples[0].demonstrates).toEqual([
      "grammar-rule",
    ]);
  });

  it.each([
    ["phonetics", "phonology"],
    ["word formation", "morphology"],
    ["names", "naming"],
    ["syntax", "grammar"],
    ["sociolinguistics", "register"],
  ])("should normalize the AI rule domain %s to %s", (domain, expected) => {
    const rule = LanguageRuleSchema.parse({
      id: "normalized-rule",
      domain,
      description: "A demonstrated rule.",
    });

    expect(rule.domain).toBe(expected);
  });

  it("should reject an unrelated AI rule domain", () => {
    expect(
      LanguageRuleSchema.safeParse({
        id: "unsupported-rule",
        domain: "semantics",
        description: "An unsupported category.",
      }).success,
    ).toBe(false);
  });

  it("should reject unsupported versions and empty structural collections", () => {
    const result = LanguageGenerationResultV1Schema.safeParse({
      version: 2,
      title: "Broken",
      summary: "Invalid profile.",
      labels: [],
      profile: {
        inputs: {
          genre: "Fantasy",
          tone: "Harsh",
          role: "Common",
          structure: "Compound",
        },
        phonology: {
          consonants: [],
          vowels: [],
          phonotactics: [],
        },
        naming: { examples: [] },
        lexicon: [],
        grammar: { examples: [] },
        register: { role: "Common" },
        tableUseTips: [],
      },
    });

    expect(result.success).toBe(false);
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
        speakerCharacterId: "char2",
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

    it("rejects a transcript with a non-string speaker identity", () => {
      const result = GuestChatTranscriptSchema.safeParse({
        id: "guest1_char1",
        guestId: "guest1",
        guestName: "Player 1",
        speakerCharacterId: 42,
        characterId: "char1",
        characterTitle: "Mira",
        messages: [],
        lastUpdated: 12346,
      });

      expect(result.success).toBe(false);
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
            kind: "language",
            languageProfileVersion: 1,
            languageProfile: {
              inputs: {
                genre: "Fantasy",
                tone: "Lyrical",
                role: "Common Speech",
                structure: "Suffix-heavy",
              },
              phonology: {
                consonants: ["l"],
                vowels: ["e"],
                phonotactics: ["CV"],
              },
              naming: {
                examples: [{ name: "Ela", meaning: "light", use: "person" }],
              },
              lexicon: [{ word: "el", pronunciation: "ELL", meaning: "light" }],
              grammar: {
                examples: [
                  {
                    text: "El na",
                    pronunciation: "ELL nah",
                    translation: "Light comes",
                  },
                ],
              },
              register: { role: "Common Speech" },
              tableUseTips: ["Use open vowels."],
            },
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
      if (result.success) {
        expect(result.data.entities[0].languageProfileVersion).toBe(1);
      }
    });
  });
});
