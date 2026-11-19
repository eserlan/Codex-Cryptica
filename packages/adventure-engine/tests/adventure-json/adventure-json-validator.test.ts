import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADVENTURE_JSON_REFERENCES,
  ADVENTURE_JSON_VALIDATION_ERROR_CODES,
  AdventureJsonV1Schema,
  ENTITY_COLLECTIONS,
  validateAdventureJson,
  type AdventureJsonV1,
} from "../../src/adventure-json";

const REPO_ROOT = resolve(import.meta.dir, "../../../..");
const REFERENCE_FIXTURE_PATH = resolve(
  REPO_ROOT,
  "fixtures/adventures/reference-one-shot/adventure.v1.json",
);

const KEYED_SANDBOX_FIXTURE_PATH = resolve(
  REPO_ROOT,
  "fixtures/adventures/keyed-sandbox/adventure.v1.json",
);

function loadKeyedSandboxFixture(): AdventureJsonV1 {
  return JSON.parse(
    readFileSync(KEYED_SANDBOX_FIXTURE_PATH, "utf8"),
  ) as AdventureJsonV1;
}

function loadReferenceFixture(): AdventureJsonV1 {
  return JSON.parse(
    readFileSync(REFERENCE_FIXTURE_PATH, "utf8"),
  ) as AdventureJsonV1;
}

function referenceFixture() {
  const fixture = loadReferenceFixture();
  fixture.factions.push({
    id: "test-faction",
    name: "Test faction",
    summary: "",
    epistemicStatus: "explicit",
    visibility: "gm-only",
  });
  fixture.rumours.push({
    id: "test-rumour",
    text: "An unverified report.",
    truth: "unverified",
    epistemicStatus: "explicit",
    visibility: "gm-only",
  });
  fixture.clues.push({ ...fixture.clues[0]!, id: "another-clue" });
  fixture.rumours.push({ ...fixture.rumours[0]!, id: "another-rumour" });
  for (const id of ["test-unresolved", "another-unresolved"]) {
    fixture.unresolved.push({
      id,
      code: "example-code",
      message: "The source omits this.",
      epistemicStatus: "unresolved",
    });
  }
  return fixture;
}

type ReferenceField = (typeof ADVENTURE_JSON_REFERENCES)[number];

function setReference(
  fixture: AdventureJsonV1,
  field: ReferenceField,
  targetId: string,
) {
  const ownerIndex = field.source === "locations" ? 1 : 0;
  const owner = fixture[field.source][ownerIndex]!;
  const properties = owner as unknown as Record<string, unknown>;
  const [key, repeat, child] = field.segments;
  const prefix = `${field.source}[${ownerIndex}].${key}`;
  if (!repeat) {
    properties[key] = targetId;
    return prefix;
  }
  const items = properties[key];
  const existing = Array.isArray(items) ? items : [];
  const item = child
    ? {
        [child]: targetId,
        description: "Test link",
        ...(field.source === "scenes" ? { optional: true } : {}),
      }
    : targetId;
  properties[key] = [...existing, item];
  return `${prefix}[${existing.length}]${child ? `.${child}` : ""}`;
}

describe("Adventure JSON v1 reference contract", () => {
  it("covers the checked fields and eleven entity collections", () => {
    expect(
      new Set(ADVENTURE_JSON_REFERENCES.map(({ path }) => path)).size,
    ).toBe(21);
    expect(ENTITY_COLLECTIONS).toHaveLength(11);
  });

  it.each(ADVENTURE_JSON_REFERENCES)("enforces $path", (field) => {
    for (const collection of field.allowedTargets) {
      const fixture = referenceFixture();
      const ownerIndex = field.source === "locations" ? 1 : 0;
      const owner = fixture[field.source][ownerIndex]!;
      const target = fixture[collection].find(({ id }) => id !== owner.id)!;
      setReference(fixture, field, target.id);
      expect(AdventureJsonV1Schema.safeParse(fixture).success).toBe(true);
      expect(validateAdventureJson(fixture).ok).toBe(true);
    }

    const fixture = referenceFixture();
    const owner = fixture[field.source][field.source === "locations" ? 1 : 0]!;
    const wrongCollection = ENTITY_COLLECTIONS.find(
      (collection) =>
        collection !== field.source &&
        !field.allowedTargets.includes(collection),
    );
    const cases = [
      [fixture.id, field.diagnostics.missingOrWrongTarget],
      [owner.id, field.diagnostics.selfReference],
      ...(wrongCollection
        ? [
            [
              fixture[wrongCollection][0]!.id,
              field.diagnostics.missingOrWrongTarget,
            ],
          ]
        : []),
    ];
    for (const [id, code] of cases) {
      const invalid = referenceFixture();
      const path = setReference(invalid, field, id!);
      expect(path.replaceAll(/\[\d+\]/g, "[index]")).toBe(field.diagnosticPath);
      const result = validateAdventureJson(invalid);
      expect(result.ok ? [] : result.errors).toContainEqual(
        expect.objectContaining({ code, path, entityId: owner.id }),
      );
    }
  });
});

describe("Adventure JSON v1 semantic validator", () => {
  it("validates the shipped CC0 reference one-shot fixture with zero errors", () => {
    const fixture = loadReferenceFixture();
    const result = validateAdventureJson(fixture);
    expect(result.ok).toBe(true);
  });

  it("allows ambiguous and unresolved facts without fabricating missing details", () => {
    const fixture = loadReferenceFixture();
    fixture.actors.push({
      id: "actor-unknown-patron",
      name: "Unidentified Patron",
      summary: "Mentioned in a torn margin note with no further details.",
      visibility: "gm-only",
      epistemicStatus: "ambiguous",
    });
    fixture.unresolved.push({
      id: "unresolved-mill-age",
      code: "MISSING_DATE",
      message: "The founding year of the mill is not stated in the source.",
      relatedEntityId: "loc-greywater-bend",
      epistemicStatus: "unresolved",
    });
    fixture.unresolved.push({
      id: "unresolved-well-owner",
      code: "CONFLICTING_ACCOUNT",
      message: "The source gives conflicting accounts of who owns the well.",
      epistemicStatus: "ambiguous",
    });

    const result = validateAdventureJson(fixture);
    expect(result.ok).toBe(true);
  });

  it("explains the allowed source certainty for unresolved entries", () => {
    const fixture = loadReferenceFixture();
    const result = validateAdventureJson({
      ...fixture,
      unresolved: [
        {
          id: "unresolved-invalid-status",
          code: "UNKNOWN_DATE",
          message: "The source does not state the date.",
          epistemicStatus: "explicit",
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "SCHEMA_VALIDATION_ERROR",
        message:
          'For an unresolved item, choose "ambiguous" when the source is unclear or contradictory, or "unresolved" when the source does not answer it.',
        path: "unresolved[0].epistemicStatus",
      });
    }
  });

  it("exports 10 unique validation codes including the ones tested here", () => {
    expect(ADVENTURE_JSON_VALIDATION_ERROR_CODES).toHaveLength(10);
    expect(new Set(ADVENTURE_JSON_VALIDATION_ERROR_CODES).size).toBe(10);
    for (const code of [
      "INVALID_FORMAT_VERSION",
      "INVALID_VISIBILITY",
      "HIERARCHY_CYCLE",
      "DEAD_END_CYCLE",
      "UNRESOLVED_REFERENCE",
    ] as const) {
      expect(ADVENTURE_JSON_VALIDATION_ERROR_CODES).toContain(code);
    }
  });

  it("detects INVALID_FORMAT_VERSION when formatVersion is missing or unsupported", () => {
    const fixture = loadReferenceFixture();
    const result = validateAdventureJson({
      ...fixture,
      formatVersion: "adventure-json/v0",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: "INVALID_FORMAT_VERSION",
          path: "formatVersion",
        }),
      );
    }
  });

  it("detects INVALID_VISIBILITY when a secret is not marked gm-only", () => {
    const fixture = loadReferenceFixture();
    const result = validateAdventureJson({
      ...fixture,
      secrets: [
        {
          ...fixture.secrets[0]!,
          visibility: "player-visible",
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: "INVALID_VISIBILITY",
          path: "secrets[0].visibility",
          entityId: fixture.secrets[0]!.id,
        }),
      );
    }
  });

  it("detects DUPLICATE_ID when two entities share an ID", () => {
    const fixture = loadReferenceFixture();
    fixture.items.push({
      id: fixture.actors[0]!.id,
      name: "Duplicate Item",
      summary: "Shares an ID with an actor.",
      visibility: "player-visible",
      epistemicStatus: "explicit",
    });

    const result = validateAdventureJson(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.code === "DUPLICATE_ID")).toBe(true);
    }
  });

  it("detects UNRESOLVED_REFERENCE when an entity references a nonexistent target ID", () => {
    const fixture = loadReferenceFixture();
    fixture.actors[0]!.locationId = "loc-does-not-exist";

    const result = validateAdventureJson(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.code === "UNRESOLVED_REFERENCE")).toBe(
        true,
      );
    }
  });

  it("detects SELF_REFERENCE when an entity references itself", () => {
    const fixture = loadReferenceFixture();
    fixture.locations[0]!.parentLocationId = fixture.locations[0]!.id;

    const result = validateAdventureJson(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.code === "SELF_REFERENCE")).toBe(true);
    }
  });

  it("detects HIERARCHY_CYCLE when a circular location parent chain exists", () => {
    const fixture = loadReferenceFixture();
    fixture.locations[0]!.parentLocationId = fixture.locations[1]!.id;

    const result = validateAdventureJson(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.code === "HIERARCHY_CYCLE")).toBe(
        true,
      );
    }
  });

  it("detects DEAD_END_CYCLE when an unescapable mandatory branch loop exists", () => {
    const fixture = loadReferenceFixture();
    fixture.scenes = [
      {
        id: "scene-a",
        title: "Scene A",
        summary: "Loops into Scene B",
        branches: [{ targetSceneId: "scene-b", description: "Go to B" }],
        visibility: "player-visible",
        epistemicStatus: "explicit",
      },
      {
        id: "scene-b",
        title: "Scene B",
        summary: "Loops back to Scene A with no exit",
        branches: [{ targetSceneId: "scene-a", description: "Go to A" }],
        visibility: "player-visible",
        epistemicStatus: "explicit",
      },
    ];
    fixture.encounters = [];
    fixture.clues = [];
    fixture.secrets = [];

    const result = validateAdventureJson(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.code === "DEAD_END_CYCLE")).toBe(true);
    }
  });

  it("detects UNREACHABLE_SCENE when a non-entry scene has no inbound transitions", () => {
    const fixture = loadReferenceFixture();
    fixture.scenes.push({
      id: "scene-orphaned",
      title: "Orphaned Scene",
      summary: "No branch leads here.",
      visibility: "player-visible",
      epistemicStatus: "explicit",
    });

    const result = validateAdventureJson(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.code === "UNREACHABLE_SCENE")).toBe(
        true,
      );
    }
  });

  it("validates the keyed sandbox fixture with unreachable explicit scenes", () => {
    expect(validateAdventureJson(loadKeyedSandboxFixture()).ok).toBe(true);
  });

  it("raises UNREACHABLE_SCENE once when a progression entry is removed", () => {
    const fixture = loadKeyedSandboxFixture();
    const target = fixture.scenes[3]!;
    fixture.unresolved = fixture.unresolved.filter(
      (u) => u.relatedEntityId !== target.id,
    );
    const result = validateAdventureJson(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const errors = result.errors.filter(
        (e) => e.code === "UNREACHABLE_SCENE",
      );
      expect(result.errors).toHaveLength(1);
      expect(errors[0]?.path).toBe("scenes[3]");
      expect(errors[0]?.entityId).toBe(target.id);
    }
  });

  it("rejects duplicate progression entries for the same unreachable scene", () => {
    const fixture = loadKeyedSandboxFixture();
    const target = fixture.scenes[3]!;
    const progressionEntry = fixture.unresolved.find(
      (item) => item.relatedEntityId === target.id,
    )!;
    fixture.unresolved.push({
      ...progressionEntry,
      id: "duplicate-unknown-progression",
    });

    const result = validateAdventureJson(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual({
        code: "DUPLICATE_SCENE_PROGRESSION",
        message: `More than one UNKNOWN_SCENE_PROGRESSION entry names scene "${target.id}".`,
        path: `unresolved[${fixture.unresolved.length - 1}]`,
        entityId: "duplicate-unknown-progression",
      });
    }
  });

  it("still accepts an unreachable ambiguous scene without a progression entry", () => {
    const fixture = loadKeyedSandboxFixture();
    fixture.scenes[3]!.epistemicStatus = "ambiguous";
    fixture.unresolved = fixture.unresolved.filter(
      (u) => u.relatedEntityId !== fixture.scenes[3]!.id,
    );
    expect(validateAdventureJson(fixture).ok).toBe(true);
  });

  it("does not exempt a scene because a progression entry names another scene", () => {
    const fixture = loadKeyedSandboxFixture();
    const entry = fixture.unresolved.find(
      (u) => u.relatedEntityId === fixture.scenes[3]!.id,
    )!;
    entry.relatedEntityId = fixture.scenes[2]!.id;
    const result = validateAdventureJson(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors
          .filter((e) => e.code === "UNREACHABLE_SCENE")
          .map((e) => e.path),
      ).toEqual(["scenes[3]"]);
    }
  });

  it("validates a deep mandatory cycle without recursive traversal", () => {
    const fixture = loadReferenceFixture();
    const sceneCount = 5_000;
    fixture.scenes = Array.from({ length: sceneCount }, (_, index) => ({
      id: `scene-${index}`,
      title: `Scene ${index}`,
      summary: "A scene in a long mandatory cycle.",
      branches: [
        {
          targetSceneId: `scene-${(index + 1) % sceneCount}`,
          description: "Continue to the next scene.",
        },
      ],
      visibility: "player-visible",
      epistemicStatus: "explicit",
    }));
    fixture.encounters = [];
    fixture.clues = [];
    fixture.secrets = [];

    const result = validateAdventureJson(fixture);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((error) => error.code === "DEAD_END_CYCLE"),
      ).toBe(true);
    }
  });
});
