import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import {
  ADVENTURE_JSON_V1_FORMAT_VERSION,
  AdventureJsonV1Schema,
  getAdventureJsonV1JsonSchema,
  validateAdventureJson,
  type AdventureJsonV1,
} from "../../src/adventure-json";

const REPO_ROOT = resolve(import.meta.dir, "../../../..");
const REFERENCE_FIXTURE_PATH = resolve(
  REPO_ROOT,
  "fixtures/adventures/reference-one-shot/adventure.v1.json",
);
const STATIC_SCHEMA_PATH = resolve(
  REPO_ROOT,
  "packages/adventure-engine/src/adventure-json/adventure-json-v1.schema.json",
);

function loadReferenceFixture(): AdventureJsonV1 {
  return JSON.parse(
    readFileSync(REFERENCE_FIXTURE_PATH, "utf8"),
  ) as AdventureJsonV1;
}

describe("Adventure JSON v1 schema & JSON Schema parity", () => {
  it("accepts the valid reference one-shot fixture", () => {
    const fixture = loadReferenceFixture();
    const result = AdventureJsonV1Schema.safeParse(fixture);
    expect(result.success).toBe(true);
  });

  it("rejects invalid types, missing required fields, and unsupported formatVersion", () => {
    const base = loadReferenceFixture();

    const wrongVersion = { ...base, formatVersion: "adventure-json/v2" };
    expect(AdventureJsonV1Schema.safeParse(wrongVersion).success).toBe(false);

    const missingTitle = { ...base } as Record<string, unknown>;
    delete missingTitle.title;
    expect(AdventureJsonV1Schema.safeParse(missingTitle).success).toBe(false);

    const badId = { ...base, id: "x" };
    expect(AdventureJsonV1Schema.safeParse(badId).success).toBe(false);

    const badSemver = { ...base, version: "v1" };
    expect(AdventureJsonV1Schema.safeParse(badSemver).success).toBe(false);

    const extraTopLevelField = { ...base, extraField: true };
    expect(AdventureJsonV1Schema.safeParse(extraTopLevelField).success).toBe(
      false,
    );

    const invalidExtensionNamespace = {
      ...base,
      extensions: { unnamespaced: { vendor: "example" } },
    };
    expect(
      AdventureJsonV1Schema.safeParse(invalidExtensionNamespace).success,
    ).toBe(false);

    const executableExtensionValue = {
      ...base,
      extensions: { "com.example.tool": { callback: () => "code" } },
    };
    expect(
      AdventureJsonV1Schema.safeParse(executableExtensionValue).success,
    ).toBe(false);

    const playerVisibleSecret = {
      ...base,
      secrets: [
        {
          ...base.secrets[0]!,
          visibility: "player-visible",
        },
      ],
    };
    expect(AdventureJsonV1Schema.safeParse(playerVisibleSecret).success).toBe(
      false,
    );
  });

  it("accepts aliases and labels on supported collections and rejects other uses", () => {
    const base = loadReferenceFixture();
    const withMetadata = {
      ...base,
      locations: [
        ...base.locations,
        {
          id: "metadata-location",
          name: "Metadata Location",
          summary: "A location used by the schema test.",
          aliases: [" The Test Place "],
          labels: ["public", "warded"],
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
      actors: [
        ...base.actors,
        {
          id: "metadata-actor",
          name: "Metadata Actor",
          summary: "An actor used by the schema test.",
          aliases: ["The Test Figure"],
          labels: ["friendly"],
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
      factions: [
        ...base.factions,
        {
          id: "metadata-faction",
          name: "Metadata Faction",
          summary: "A faction used by the schema test.",
          aliases: ["The Test Group"],
          labels: ["local"],
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
      items: [
        ...base.items,
        {
          id: "metadata-item",
          name: "Metadata Item",
          summary: "An item used by the schema test.",
          aliases: ["The Test Object"],
          labels: ["clue"],
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
    };
    const ajvValidate = new Ajv2020({ strict: false, allErrors: true }).compile(
      getAdventureJsonV1JsonSchema(),
    );

    const parsed = AdventureJsonV1Schema.safeParse(withMetadata);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.locations.at(-1)!.aliases).toEqual(["The Test Place"]);
    }
    expect(ajvValidate(withMetadata)).toBe(true);

    const invalidAlias = {
      ...withMetadata,
      actors: withMetadata.actors.map((entry, index) =>
        index === withMetadata.actors.length - 1
          ? { ...entry, aliases: ["  "] }
          : entry,
      ),
    };
    const invalidAliasType = {
      ...withMetadata,
      actors: withMetadata.actors.map((entry, index) =>
        index === withMetadata.actors.length - 1
          ? { ...entry, aliases: [42] }
          : entry,
      ),
    };
    const invalidLabels = {
      ...withMetadata,
      factions: withMetadata.factions.map((entry, index) =>
        index === withMetadata.factions.length - 1
          ? { ...entry, labels: [42] }
          : entry,
      ),
    };
    const unsupportedCollection = {
      ...withMetadata,
      scenes: withMetadata.scenes.map((entry, index) =>
        index === 0
          ? { ...entry, aliases: ["Not supported here"], labels: ["invalid"] }
          : entry,
      ),
    };

    for (const candidate of [
      invalidAlias,
      invalidAliasType,
      invalidLabels,
      unsupportedCollection,
    ]) {
      expect(AdventureJsonV1Schema.safeParse(candidate).success).toBe(false);
      expect(ajvValidate(candidate)).toBe(false);
    }
  });

  it("generates a valid Draft 2020-12 JSON Schema matching the committed static file", () => {
    const generated = getAdventureJsonV1JsonSchema();
    expect(generated.$schema).toBe(
      "https://json-schema.org/draft/2020-12/schema",
    );
    expect(generated.$id).toBe(
      "https://codexcryptica.com/schemas/adventure-json/v1.json",
    );

    const committed = JSON.parse(
      readFileSync(STATIC_SCHEMA_PATH, "utf8"),
    ) as Record<string, unknown>;
    expect(committed).toEqual(generated);
  });

  it("maintains Ajv Draft 2020-12 parity with Zod on positive and negative cases", () => {
    const jsonSchema = getAdventureJsonV1JsonSchema();
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    const ajvValidate = ajv.compile(jsonSchema);

    const validFixture = loadReferenceFixture();
    const negativeCases: unknown[] = [
      { ...validFixture, formatVersion: "adventure-json/v99" },
      { ...validFixture, formatVersion: undefined },
      { ...validFixture, id: "!" },
      { ...validFixture, version: "1.0" },
      { ...validFixture, title: "" },
      { ...validFixture, extraUnknownProperty: 123 },
      {
        ...validFixture,
        extensions: { unnamespaced: { vendor: "example" } },
      },
      {
        ...validFixture,
        secrets: [
          {
            id: "s1",
            text: "Secret",
            visibility: "player-visible",
            epistemicStatus: "explicit",
          },
        ],
      },
      {
        ...validFixture,
        rumours: [
          {
            id: "r1",
            text: "A rumour",
            truth: "maybe",
            visibility: "player-visible",
            epistemicStatus: "inferred",
          },
        ],
      },
      {
        ...validFixture,
        source: {
          title: "Bad Hash",
          documentHash: "not-a-sha256",
        },
      },
    ];

    expect(ajvValidate(validFixture)).toBe(true);
    expect(AdventureJsonV1Schema.safeParse(validFixture).success).toBe(true);
    expect(validFixture.formatVersion).toBe(ADVENTURE_JSON_V1_FORMAT_VERSION);

    const mixedCaseIdFixture = { ...validFixture, id: "MyAdventure" };
    expect(AdventureJsonV1Schema.safeParse(mixedCaseIdFixture).success).toBe(
      true,
    );
    expect(ajvValidate(mixedCaseIdFixture)).toBe(true);

    const extensionFixture = {
      ...validFixture,
      extensions: {
        "com.example.publisher-tool": {
          tags: ["investigation", "mystery"],
          settings: { preferredMode: "offline", enabled: true },
        },
      },
    };
    expect(AdventureJsonV1Schema.safeParse(extensionFixture).success).toBe(
      true,
    );
    expect(ajvValidate(extensionFixture)).toBe(true);

    for (const testCase of negativeCases) {
      const zodOk = AdventureJsonV1Schema.safeParse(testCase).success;
      const ajvOk = Boolean(ajvValidate(testCase));
      expect(zodOk).toBe(false);
      expect(ajvOk).toBe(zodOk);
    }
  });

  describe("optional actor kind", () => {
    const SPARSE_PATH = resolve(
      REPO_ROOT,
      "fixtures/adventures/reference-one-shot/variants/sparse.v1.json",
    );
    const withKind = (kind: unknown): AdventureJsonV1 => {
      const base = loadReferenceFixture();
      return {
        ...base,
        actors: base.actors.map((a, i) => (i === 0 ? { ...a, kind } : a)),
      } as AdventureJsonV1;
    };
    const ajvValidate = new Ajv2020({
      strict: false,
      allErrors: true,
    }).compile(getAdventureJsonV1JsonSchema());

    it.each([
      ["character", true],
      ["creature", true],
      ["monster", false],
      [42, false],
    ])("Zod and Ajv agree on kind %j", (kind, expected) => {
      const candidate = withKind(kind);
      expect(AdventureJsonV1Schema.safeParse(candidate).success).toBe(expected);
      expect(Boolean(ajvValidate(candidate))).toBe(expected);
    });

    it("keeps a missing kind missing after parsing", () => {
      const sparse = JSON.parse(readFileSync(SPARSE_PATH, "utf8"));
      expect(Boolean(ajvValidate(sparse))).toBe(true);
      const parsed = AdventureJsonV1Schema.parse(sparse);
      expect(parsed.actors.length).toBeGreaterThan(0);
      for (const actor of parsed.actors) expect("kind" in actor).toBe(false);
    });

    it("reports an invalid kind at the actor kind path", () => {
      const result = validateAdventureJson(withKind("monster"));
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(
        result.errors.some(
          (e) =>
            e.code === "SCHEMA_VALIDATION_ERROR" &&
            JSON.stringify(e.path ?? "").includes("kind"),
        ),
      ).toBe(true);
    });
  });
});
