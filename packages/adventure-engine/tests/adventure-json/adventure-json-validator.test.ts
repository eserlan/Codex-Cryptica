import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  validateAdventureJson,
  type AdventureJsonV1,
} from "../../src/adventure-json";

const REPO_ROOT = resolve(import.meta.dir, "../../../..");
const REFERENCE_FIXTURE_PATH = resolve(
  REPO_ROOT,
  "fixtures/adventures/reference-one-shot/adventure.v1.json",
);

function loadReferenceFixture(): AdventureJsonV1 {
  return JSON.parse(
    readFileSync(REFERENCE_FIXTURE_PATH, "utf8"),
  ) as AdventureJsonV1;
}

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

  it("detects INVALID_FORMAT_VERSION when formatVersion is missing or unsupported", () => {
    const fixture = loadReferenceFixture();
    const result = validateAdventureJson({
      ...fixture,
      formatVersion: "adventure-json/v0",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => e.code === "INVALID_FORMAT_VERSION"),
      ).toBe(true);
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
      expect(result.errors.some((e) => e.code === "INVALID_VISIBILITY")).toBe(
        true,
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
