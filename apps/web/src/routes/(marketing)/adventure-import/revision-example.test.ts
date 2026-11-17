import { describe, expect, it } from "vitest";
import {
  AdventureJsonV1Schema,
  diffAdventureJsonVersions,
  isAdventureJsonVersionGreater,
  validateAdventureJson,
} from "@codex/adventure-engine";
import {
  CORRESPONDENCE_EXTENSION_KEY,
  REVISION_EXAMPLE_AFTER,
  REVISION_EXAMPLE_BEFORE,
  SPLIT_MERGE_EXAMPLE_DOC,
} from "./conversion-guide.js";

const COLLECTIONS = [
  "locations",
  "actors",
  "factions",
  "scenes",
  "encounters",
  "clues",
  "rumours",
  "items",
  "secrets",
  "endings",
  "unresolved",
] as const;

// The diff and validator accept parsed JSON; the constants are plain data.
const before = REVISION_EXAMPLE_BEFORE as never;
const after = REVISION_EXAMPLE_AFTER as never;

type Rec = Record<string, unknown>;
const clone = (v: unknown): Rec => JSON.parse(JSON.stringify(v));

describe("revision example data", () => {
  it("both versions validate and share an id with a higher version", () => {
    for (const ex of [before, after]) {
      expect(AdventureJsonV1Schema.safeParse(ex).success).toBe(true);
      expect(validateAdventureJson(ex).ok).toBe(true);
    }
    expect(REVISION_EXAMPLE_AFTER.id).toBe(REVISION_EXAMPLE_BEFORE.id);
    expect(
      isAdventureJsonVersionGreater(
        REVISION_EXAMPLE_AFTER.version,
        REVISION_EXAMPLE_BEFORE.version,
      ),
    ).toBe(true);
  });

  it("diffs with one mapped rename and nothing unresolved", () => {
    const diff = diffAdventureJsonVersions(before, after);

    expect(diff.unresolved).toEqual([]);
    expect(diff.groups).toEqual([]);
    expect(diff.entrySceneChange).toBeNull();
    const mapped = diff.collections.scenes.changed.filter((c) => c.previousId);
    expect(mapped).toHaveLength(1);
    expect(mapped[0].previousId).toBe("scene-stairs");
    for (const c of COLLECTIONS) {
      expect(diff.collections[c].added).toEqual([]);
      expect(diff.collections[c].removed).toEqual([]);
    }

    const afterIds = new Set(
      COLLECTIONS.flatMap((c) =>
        ((REVISION_EXAMPLE_AFTER[c] as Rec[]) ?? []).map((e) => e.id),
      ),
    );
    for (const c of COLLECTIONS) {
      for (const e of REVISION_EXAMPLE_BEFORE[c] as Rec[]) {
        if (e.id !== "scene-stairs") expect(afterIds.has(e.id)).toBe(true);
      }
    }
  });

  it("does not infer the rename without the extension", () => {
    const bare = clone(REVISION_EXAMPLE_AFTER);
    delete bare.extensions;
    const diff = diffAdventureJsonVersions(before, bare as never);

    expect(diff.unresolved.map((u) => u.kind).sort()).toEqual([
      "added",
      "removed",
    ]);
  });

  it("rejects the correspondence entry placed on an entity", () => {
    const wrong = clone(REVISION_EXAMPLE_AFTER);
    const entries = (wrong.extensions as Rec)[CORRESPONDENCE_EXTENSION_KEY];
    delete wrong.extensions;
    const scene = (wrong.scenes as Rec[]).find(
      (s) => s.id === "scene-spiral-stair",
    )!;
    scene.extensions = { [CORRESPONDENCE_EXTENSION_KEY]: entries };

    expect(AdventureJsonV1Schema.safeParse(wrong).success).toBe(false);
    expect(validateAdventureJson(wrong).ok).toBe(false);
  });
});

describe("split and merge snippet", () => {
  it("is flagged as one split and one merge needing review", () => {
    const extensions = JSON.parse(SPLIT_MERGE_EXAMPLE_DOC).extensions;
    const scene = (id: string, branches: string[] = []) => ({
      id,
      title: id,
      summary: id,
      branches: branches.map((t) => ({ targetSceneId: t, description: t })),
      visibility: "player-visible",
      epistemicStatus: "explicit",
    });
    const build = (version: string, scenes: Rec[], ext?: unknown) => ({
      ...clone(REVISION_EXAMPLE_BEFORE),
      version,
      scenes,
      ...(ext ? { extensions: ext } : {}),
    });
    const prev = build("1.0.0", [
      scene("scene-start", ["scene-market", "scene-cellar", "scene-crypt"]),
      scene("scene-market"),
      scene("scene-cellar"),
      scene("scene-crypt"),
    ]);
    const next = build(
      "2.0.0",
      [
        scene("scene-start", [
          "scene-market-day",
          "scene-market-night",
          "scene-vaults",
        ]),
        scene("scene-market-day"),
        scene("scene-market-night"),
        scene("scene-vaults"),
      ],
      extensions,
    );
    expect(validateAdventureJson(prev).ok).toBe(true);
    expect(validateAdventureJson(next).ok).toBe(true);

    const diff = diffAdventureJsonVersions(prev as never, next as never);
    expect(diff.groups.map((g) => g.kind).sort()).toEqual(["merge", "split"]);
    const kinds = diff.unresolved.map((u) => u.kind);
    expect(kinds).toContain("split");
    expect(kinds).toContain("merge");
  });
});
