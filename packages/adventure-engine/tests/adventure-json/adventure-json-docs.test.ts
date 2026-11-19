import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import {
  AdventureJsonV1Schema,
  getAdventureJsonV1JsonSchema,
  validateAdventureJson,
} from "../../src/adventure-json";

const REPO_ROOT = resolve(import.meta.dir, "../../../..");

function readJson(relPath: string): unknown {
  return JSON.parse(readFileSync(resolve(REPO_ROOT, relPath), "utf8"));
}

describe("Public Adventure JSON v1 static schemas, examples, and conversion fixtures", () => {
  const staticSchemaPaths = [
    "apps/web/static/schemas/adventure-json/v1.json",
    "apps/web/static/schemas/adventure/v1.json",
  ];

  it.each(staticSchemaPaths)(
    "%s matches getAdventureJsonV1JsonSchema() and compiles under Draft 2020-12",
    (relPath) => {
      const generated = getAdventureJsonV1JsonSchema();
      const hosted = readJson(relPath) as Record<string, unknown>;

      expect(hosted).toEqual(generated);
      expect(hosted.$id).toBe(
        "https://codexcryptica.com/schemas/adventure-json/v1.json",
      );

      const ajv = new Ajv2020({ strict: false, allErrors: true });
      const validate = ajv.compile(hosted);
      const minimal = readJson(
        "apps/web/static/schemas/adventure-json/examples/minimal.v1.json",
      );
      expect(validate(minimal)).toBe(true);
    },
  );

  const validExamplePaths = [
    "apps/web/static/schemas/adventure-json/examples/minimal.v1.json",
    "apps/web/static/schemas/adventure/examples/minimal.v1.json",
    "apps/web/static/schemas/adventure-json/examples/reference-one-shot.v1.json",
    "apps/web/static/schemas/adventure/examples/reference-one-shot.v1.json",
  ];

  it.each(validExamplePaths)(
    "static example %s passes schema and semantic validation",
    (relPath) => {
      const doc = readJson(relPath);
      expect(AdventureJsonV1Schema.safeParse(doc).success).toBe(true);
      const result = validateAdventureJson(doc);
      expect(result.ok).toBe(true);
    },
  );

  const modelFixturePaths = [
    "fixtures/adventures/conversions/claude-adventure.v1.json",
    "fixtures/adventures/conversions/gpt-adventure.v1.json",
  ];

  it.each(modelFixturePaths)(
    "multi-model conversion fixture %s passes validateAdventureJson with 0 errors",
    (relPath) => {
      const doc = readJson(relPath);
      const result = validateAdventureJson(doc);
      expect(result).toMatchObject({ ok: true });
    },
  );

  it("rejects a conversion fixture if a secret is marked player-visible", () => {
    const doc = readJson(
      "fixtures/adventures/conversions/claude-adventure.v1.json",
    ) as Record<string, unknown>;
    const secrets = doc.secrets as Array<Record<string, unknown>>;
    const invalidDoc = {
      ...doc,
      secrets: [{ ...secrets[0], visibility: "player-visible" }],
    };

    const result = validateAdventureJson(invalidDoc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.code === "INVALID_VISIBILITY")).toBe(
        true,
      );
    }
  });
});
