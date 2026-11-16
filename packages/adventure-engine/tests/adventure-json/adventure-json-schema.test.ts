import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import {
  ADVENTURE_JSON_V1_FORMAT_VERSION,
  AdventureJsonV1Schema,
  getAdventureJsonV1JsonSchema,
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

    for (const testCase of negativeCases) {
      const zodOk = AdventureJsonV1Schema.safeParse(testCase).success;
      const ajvOk = Boolean(ajvValidate(testCase));
      expect(zodOk).toBe(false);
      expect(ajvOk).toBe(zodOk);
    }
  });
});
