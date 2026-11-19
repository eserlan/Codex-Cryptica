import { describe, expect, it } from "vitest";
import {
  ADVENTURE_JSON_V1_FORMAT_VERSION,
  compareAdventureJsonVersion,
  computeAdventureJsonHash,
  diffAdventureJsonVersions,
  selectAdventureJsonPredecessor,
  validateAdventureJson,
  type AdventureJsonV1,
} from "../../src";

function makePackage(
  overrides: Partial<AdventureJsonV1> = {},
): AdventureJsonV1 {
  return {
    formatVersion: ADVENTURE_JSON_V1_FORMAT_VERSION,
    id: "the-sunken-mill",
    title: "The Sunken Mill",
    version: "1.0.0",
    premise: {
      background: "The river mill stopped turning three nights ago.",
      hook: "Maren asks the party to inspect the sluice gate.",
    },
    source: { title: "The Sunken Mill", license: "CC0-1.0" },
    locations: [
      {
        id: "loc-mill",
        name: "Stone Mill",
        summary: "A damp watermill on the bend.",
        visibility: "player-visible",
        epistemicStatus: "explicit",
      },
    ],
    actors: [
      {
        id: "actor-maren",
        name: "Maren",
        summary: "The miller's daughter.",
        visibility: "player-visible",
        epistemicStatus: "explicit",
      },
    ],
    factions: [],
    scenes: [
      {
        id: "scene-1",
        title: "The Mill Yard",
        summary: "Arrival at the silent mill.",
        locationId: "loc-mill",
        conditions: ["Players arrive at dusk"],
        visibility: "player-visible",
        epistemicStatus: "explicit",
      },
    ],
    encounters: [],
    clues: [
      {
        id: "clue-prints",
        text: "Muddy bootprints lead to the lever.",
        visibility: "player-visible",
        epistemicStatus: "explicit",
      },
    ],
    rumours: [],
    items: [],
    secrets: [
      {
        id: "sec-1",
        text: "The miller sabotaged the sluice.",
        visibility: "gm-only",
        epistemicStatus: "explicit",
      },
    ],
    endings: [],
    unresolved: [],
    ...overrides,
  };
}

describe("diffAdventureJsonVersions", () => {
  it("reports package extension-only changes", () => {
    const diff = diffAdventureJsonVersions(
      makePackage({ extensions: { "example.tool": { setting: "old" } } }),
      makePackage({ extensions: { "example.tool": { setting: "new" } } }),
    );

    expect(diff.packageChangedFields).toEqual(["extensions"]);
  });

  it("classifies added, removed, and changed entries across scenes, actors, clues, and secrets", () => {
    const previous = makePackage();
    const next = makePackage({
      version: "1.1.0",
      actors: [
        {
          id: "actor-maren",
          name: "Maren",
          summary: "The miller's daughter, now frightened.",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
        {
          id: "actor-wick",
          name: "Wick",
          summary: "An anxious millhand.",
          visibility: "player-visible",
          epistemicStatus: "inferred",
        },
      ],
      clues: [],
      secrets: [
        {
          id: "sec-1",
          text: "The miller sabotaged the sluice and hid the ledger.",
          visibility: "gm-only",
          epistemicStatus: "explicit",
        },
      ],
      scenes: [
        {
          id: "scene-1",
          title: "The Mill Yard",
          summary: "Arrival at the silent mill.",
          locationId: "loc-mill",
          conditions: ["Players arrive at dusk"],
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
        {
          id: "scene-2",
          title: "The Sluice Gate",
          summary: "The party reaches the gate.",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
    });
    const diff = diffAdventureJsonVersions(previous, next);
    expect(diff.packageChangedFields).toContain("version");
    expect(diff.collections.actors.added.map((e) => e.id)).toEqual([
      "actor-wick",
    ]);
    expect(diff.collections.actors.changed.map((e) => e.id)).toEqual([
      "actor-maren",
    ]);
    expect(diff.collections.actors.changed[0]?.changedFields).toContain(
      "summary",
    );
    expect(diff.collections.clues.removed.map((e) => e.id)).toEqual([
      "clue-prints",
    ]);
    expect(diff.collections.scenes.added.map((e) => e.id)).toEqual(["scene-2"]);
    expect(diff.collections.secrets.changed.map((e) => e.id)).toEqual([
      "sec-1",
    ]);
    expect(diff.collections.secrets.changed[0]?.changedFields).toContain(
      "text",
    );
    expect(
      diff.unresolved.some(
        (u) => u.kind === "added" && u.ids.includes("actor-wick"),
      ),
    ).toBe(true);
    expect(
      diff.unresolved.some(
        (u) => u.kind === "removed" && u.ids.includes("clue-prints"),
      ),
    ).toBe(true);
  });

  it("names conditions, branches, and sourceRef changes and ignores key order", () => {
    const previous = makePackage();
    const conditionsOnly = makePackage({
      scenes: [
        {
          id: "scene-1",
          title: "The Mill Yard",
          summary: "Arrival at the silent mill.",
          locationId: "loc-mill",
          conditions: ["Players arrive at midnight"],
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
    });
    const diffConditions = diffAdventureJsonVersions(previous, conditionsOnly);
    expect(diffConditions.collections.scenes.changed).toHaveLength(1);
    expect(diffConditions.collections.scenes.changed[0]?.changedFields).toEqual(
      ["conditions"],
    );

    const branchesOnly = makePackage({
      scenes: [
        {
          id: "scene-1",
          title: "The Mill Yard",
          summary: "Arrival at the silent mill.",
          locationId: "loc-mill",
          conditions: ["Players arrive at dusk"],
          branches: [
            {
              targetSceneId: "scene-1",
              description: "Return to the yard.",
            },
          ],
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
    });
    const diffBranches = diffAdventureJsonVersions(previous, branchesOnly);
    expect(diffBranches.collections.scenes.changed[0]?.changedFields).toEqual([
      "branches",
    ]);

    const sourceRefOnly = makePackage({
      scenes: [
        {
          id: "scene-1",
          title: "The Mill Yard",
          summary: "Arrival at the silent mill.",
          locationId: "loc-mill",
          conditions: ["Players arrive at dusk"],
          visibility: "player-visible",
          epistemicStatus: "explicit",
          sourceRef: { page: 3 },
        },
      ],
    });
    const diffSourceRef = diffAdventureJsonVersions(previous, sourceRefOnly);
    expect(diffSourceRef.collections.scenes.changed[0]?.changedFields).toEqual([
      "sourceRef",
    ]);

    const reordered = JSON.parse(
      JSON.stringify(conditionsOnly, (_key, value) => {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).reverse(),
          );
        }
        return value;
      }),
    ) as AdventureJsonV1;
    const diffReordered = diffAdventureJsonVersions(conditionsOnly, reordered);
    expect(diffReordered.collections.scenes.changed).toHaveLength(0);
    expect(diffReordered.collections.scenes.added).toHaveLength(0);
    expect(diffReordered.collections.scenes.removed).toHaveLength(0);
  });

  it("reports package-level title and version changes", () => {
    const diff = diffAdventureJsonVersions(
      makePackage(),
      makePackage({ title: "The Sunken Mill Revisited", version: "2.0.0" }),
    );
    expect(diff.packageChangedFields).toContain("title");
    expect(diff.packageChangedFields).toContain("version");
    expect(diff.collections.scenes.changed).toHaveLength(0);
  });

  it("reports a valid scene reorder that changes the entry scene", () => {
    const previous = makePackage({
      scenes: [
        {
          id: "scene-1",
          title: "The Mill Yard",
          summary: "Arrival at the silent mill.",
          branches: [{ targetSceneId: "scene-2", description: "Go inside." }],
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
        {
          id: "scene-2",
          title: "The Mill",
          summary: "Inside the mill.",
          branches: [
            {
              targetSceneId: "scene-1",
              description: "Go outside.",
              optional: true,
            },
          ],
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
    });
    const next = makePackage({ scenes: [...previous.scenes].reverse() });

    expect(validateAdventureJson(previous).ok).toBe(true);
    expect(validateAdventureJson(next).ok).toBe(true);
    expect(diffAdventureJsonVersions(previous, next).entrySceneChange).toEqual({
      previousId: "scene-1",
      currentId: "scene-2",
    });
  });

  it("treats same-ID title changes as one changed entry and renamed unmatched entities as added plus removed and unresolved", () => {
    const previous = makePackage();
    const sameIdRenamed = makePackage({
      scenes: [
        {
          id: "scene-1",
          title: "The Mill Yard at Dusk",
          summary: "Arrival at the silent mill.",
          locationId: "loc-mill",
          conditions: ["Players arrive at dusk"],
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
    });
    const diffSameId = diffAdventureJsonVersions(previous, sameIdRenamed);
    expect(diffSameId.collections.scenes.added).toHaveLength(0);
    expect(diffSameId.collections.scenes.removed).toHaveLength(0);
    expect(diffSameId.collections.scenes.changed).toHaveLength(1);
    expect(diffSameId.collections.scenes.changed[0]?.changedFields).toContain(
      "title",
    );

    const newIdRenamed = makePackage({
      scenes: [
        {
          id: "scene-new",
          title: "The Mill Yard at Dusk",
          summary: "Arrival at the silent mill.",
          locationId: "loc-mill",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
    });
    const diffNewId = diffAdventureJsonVersions(previous, newIdRenamed);
    expect(diffNewId.collections.scenes.added.map((e) => e.id)).toEqual([
      "scene-new",
    ]);
    expect(diffNewId.collections.scenes.removed.map((e) => e.id)).toEqual([
      "scene-1",
    ]);
    expect(diffNewId.collections.scenes.changed).toHaveLength(0);
    expect(diffNewId.unresolved.length).toBeGreaterThan(0);
    expect(diffNewId.unresolved.some((u) => u.kind === "added")).toBe(true);
  });

  it("groups supplied splits and merges and flags them unresolved without plain added or removed", () => {
    const previous = makePackage();
    const splitNext = makePackage({
      scenes: [
        {
          id: "scene-1a",
          title: "The Mill Yard, Part One",
          summary: "Arrival at the silent mill.",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
        {
          id: "scene-1b",
          title: "The Mill Yard, Part Two",
          summary: "The party waits.",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
      extensions: {
        "codex-cryptica.adventure-correspondence": [
          {
            previousId: "scene-1",
            currentId: "scene-1a",
            collection: "scenes",
          },
          {
            previousId: "scene-1",
            currentId: "scene-1b",
            collection: "scenes",
          },
        ],
      },
    });
    const splitDiff = diffAdventureJsonVersions(previous, splitNext);
    expect(splitDiff.groups).toHaveLength(1);
    expect(splitDiff.groups[0]?.kind).toBe("split");
    expect(splitDiff.groups[0]?.currentIds).toEqual(["scene-1a", "scene-1b"]);
    expect(splitDiff.collections.scenes.added).toHaveLength(0);
    expect(splitDiff.collections.scenes.removed).toHaveLength(0);
    expect(splitDiff.unresolved.some((u) => u.kind === "split")).toBe(true);

    const mergePrevious = makePackage({
      scenes: [
        {
          id: "scene-1",
          title: "The Mill Yard",
          summary: "Arrival at the silent mill.",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
        {
          id: "scene-2",
          title: "The Sluice Gate",
          summary: "The party reaches the gate.",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
    });
    const mergeNext = makePackage({
      scenes: [
        {
          id: "scene-combined",
          title: "The Mill Yard and Gate",
          summary: "Combined arrival.",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
      extensions: {
        "codex-cryptica.adventure-correspondence": [
          {
            previousId: "scene-1",
            currentId: "scene-combined",
            collection: "scenes",
          },
          {
            previousId: "scene-2",
            currentId: "scene-combined",
            collection: "scenes",
          },
        ],
      },
    });
    const mergeDiff = diffAdventureJsonVersions(mergePrevious, mergeNext);
    expect(mergeDiff.groups).toHaveLength(1);
    expect(mergeDiff.groups[0]?.kind).toBe("merge");
    expect(mergeDiff.collections.scenes.added).toHaveLength(0);
    expect(mergeDiff.collections.scenes.removed).toHaveLength(0);
    expect(mergeDiff.unresolved.some((u) => u.kind === "merge")).toBe(true);
  });

  it("pairs the same ID string mapped in two different collections as two one-to-one correspondences", () => {
    const previous = makePackage({
      clues: [
        {
          id: "ref-1",
          text: "Muddy bootprints lead to the lever.",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
      secrets: [
        {
          id: "ref-1",
          text: "The miller sabotaged the sluice.",
          visibility: "gm-only",
          epistemicStatus: "explicit",
        },
      ],
    });
    const next = makePackage({
      clues: [
        {
          id: "clue-1",
          text: "Muddy bootprints lead to the lever and a hatch.",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
      secrets: [
        {
          id: "sec-1",
          text: "The miller sabotaged the sluice and hid the ledger.",
          visibility: "gm-only",
          epistemicStatus: "explicit",
        },
      ],
      extensions: {
        "codex-cryptica.adventure-correspondence": [
          { previousId: "ref-1", currentId: "clue-1", collection: "clues" },
          { previousId: "ref-1", currentId: "sec-1", collection: "secrets" },
        ],
      },
    });
    const diff = diffAdventureJsonVersions(previous, next);
    expect(diff.groups).toHaveLength(0);
    expect(diff.collections.clues.changed).toHaveLength(1);
    expect(diff.collections.clues.changed[0]?.previousId).toBe("ref-1");
    expect(diff.collections.clues.changed[0]?.id).toBe("clue-1");
    expect(diff.collections.clues.added).toHaveLength(0);
    expect(diff.collections.clues.removed).toHaveLength(0);
    expect(diff.collections.secrets.changed).toHaveLength(1);
    expect(diff.collections.secrets.changed[0]?.previousId).toBe("ref-1");
    expect(diff.collections.secrets.changed[0]?.id).toBe("sec-1");
    expect(diff.collections.secrets.added).toHaveLength(0);
    expect(diff.collections.secrets.removed).toHaveLength(0);
    expect(
      diff.unresolved.some((u) => u.kind === "split" || u.kind === "merge"),
    ).toBe(false);
  });

  it("pairs one-to-one supplied correspondence as changed and reports invalid or conflicting mappings as unresolved without throwing", () => {
    const previous = makePackage();
    const mapped = makePackage({
      scenes: [
        {
          id: "scene-renamed",
          title: "The Mill Yard",
          summary: "Arrival at the silent mill, revised.",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
      extensions: {
        "codex-cryptica.adventure-correspondence": [
          {
            previousId: "scene-1",
            currentId: "scene-renamed",
            collection: "scenes",
          },
          {
            previousId: "ghost",
            currentId: "scene-renamed",
            collection: "scenes",
          },
          {
            previousId: "scene-1",
            currentId: "scene-renamed",
            collection: "bogus",
          },
          { previousId: "scene-1", currentId: "scene-renamed" },
          "not-an-entry",
          {
            previousId: "loc-mill",
            currentId: "scene-renamed",
            collection: "scenes",
          },
        ],
      },
    });
    const diff = diffAdventureJsonVersions(previous, mapped);
    expect(diff.collections.scenes.changed).toHaveLength(1);
    expect(diff.collections.scenes.changed[0]?.previousId).toBe("scene-1");
    expect(diff.collections.scenes.added).toHaveLength(0);
    expect(diff.collections.scenes.removed).toHaveLength(0);
    const invalid = diff.unresolved.filter((u) => u.kind === "invalid-mapping");
    expect(invalid.length).toBeGreaterThanOrEqual(4);

    const conflicting = diffAdventureJsonVersions(
      previous,
      makePackage({
        scenes: [
          {
            id: "scene-1",
            title: "The Mill Yard",
            summary: "Arrival at the silent mill.",
            locationId: "loc-mill",
            conditions: ["Players arrive at dusk"],
            visibility: "player-visible",
            epistemicStatus: "explicit",
          },
          {
            id: "scene-other",
            title: "Other",
            summary: "Other.",
            visibility: "player-visible",
            epistemicStatus: "explicit",
          },
        ],
        extensions: {
          "codex-cryptica.adventure-correspondence": [
            {
              previousId: "scene-1",
              currentId: "scene-other",
              collection: "scenes",
            },
          ],
        },
      }),
    );
    expect(
      conflicting.unresolved.some((u) => u.kind === "invalid-mapping"),
    ).toBe(true);
    expect(conflicting.collections.scenes.changed).toHaveLength(0);
  });

  it("reports a correspondence rename when the ID is the only changed field", () => {
    const diff = diffAdventureJsonVersions(
      makePackage(),
      makePackage({
        scenes: [
          {
            id: "scene-renamed",
            title: "The Mill Yard",
            summary: "Arrival at the silent mill.",
            locationId: "loc-mill",
            conditions: ["Players arrive at dusk"],
            visibility: "player-visible",
            epistemicStatus: "explicit",
          },
        ],
        extensions: {
          "codex-cryptica.adventure-correspondence": [
            {
              previousId: "scene-1",
              currentId: "scene-renamed",
              collection: "scenes",
            },
          ],
        },
      }),
    );

    expect(diff.collections.scenes.changed).toEqual([
      {
        id: "scene-renamed",
        title: "The Mill Yard",
        changedFields: [],
        previousId: "scene-1",
      },
    ]);
    expect(diff.collections.scenes.added).toHaveLength(0);
    expect(diff.collections.scenes.removed).toHaveLength(0);
  });

  it("deduplicates repeated identical correspondence edges before split or merge grouping", () => {
    const diff = diffAdventureJsonVersions(
      makePackage(),
      makePackage({
        scenes: [
          {
            id: "scene-renamed",
            title: "The Mill Yard",
            summary: "Arrival at the silent mill, revised.",
            visibility: "player-visible",
            epistemicStatus: "explicit",
          },
        ],
        extensions: {
          "codex-cryptica.adventure-correspondence": [
            {
              previousId: "scene-1",
              currentId: "scene-renamed",
              collection: "scenes",
            },
            {
              previousId: "scene-1",
              currentId: "scene-renamed",
              collection: "scenes",
            },
          ],
        },
      }),
    );

    expect(diff.groups).toHaveLength(0);
    expect(diff.collections.scenes.changed).toHaveLength(1);
    expect(diff.collections.scenes.changed[0]).toMatchObject({
      id: "scene-renamed",
      previousId: "scene-1",
      changedFields: ["conditions", "locationId", "summary"],
    });
    expect(
      diff.unresolved.some(
        (item) => item.kind === "split" || item.kind === "merge",
      ),
    ).toBe(false);
  });

  it("never throws on malformed correspondence extensions and lists unmapped entities unresolved", () => {
    expect(() =>
      diffAdventureJsonVersions(
        makePackage(),
        makePackage({
          extensions: {
            "codex-cryptica.adventure-correspondence": 42 as never,
          },
        }),
      ),
    ).not.toThrow();
    const diff = diffAdventureJsonVersions(
      makePackage(),
      makePackage({
        extensions: { "codex-cryptica.adventure-correspondence": 42 as never },
      }),
    );
    expect(diff.unresolved.some((u) => u.kind === "invalid-mapping")).toBe(
      true,
    );
  });
});

describe("selectAdventureJsonPredecessor and version comparison", () => {
  it("prefers same-version different-hash, then highest SemVer, then hash ascending", async () => {
    const v1 = makePackage({ version: "1.0.0" });
    const v2 = makePackage({ version: "2.0.0", title: "V2" });
    const v15 = makePackage({ version: "1.5.0", title: "V15" });
    const v1Changed = makePackage({ version: "1.0.0", title: "V1 changed" });
    const candidates = [
      { hash: await computeAdventureJsonHash(v1), package: v1 },
      { hash: await computeAdventureJsonHash(v2), package: v2 },
      { hash: await computeAdventureJsonHash(v15), package: v15 },
      { hash: await computeAdventureJsonHash(v1Changed), package: v1Changed },
    ];
    const incoming = makePackage({ version: "1.0.0", title: "Incoming" });
    const sameVersion = selectAdventureJsonPredecessor(
      candidates,
      incoming,
      await computeAdventureJsonHash(incoming),
    );
    // Same-version candidates win over the higher 2.0.0; among themselves the
    // lowest hash wins.
    expect(sameVersion?.package.version).toBe("1.0.0");
    const sameVersionHashes = candidates
      .filter((c) => c.package.version === "1.0.0")
      .map((c) => c.hash)
      .sort();
    expect(sameVersion?.hash).toBe(sameVersionHashes[0]);

    const incomingNew = makePackage({ version: "3.0.0" });
    const highest = selectAdventureJsonPredecessor(
      candidates.filter((c) => c.package.title !== "V1 changed"),
      incomingNew,
      await computeAdventureJsonHash(incomingNew),
    );
    expect(highest?.package.version).toBe("2.0.0");
    expect(compareAdventureJsonVersion("1.0.0", "1.0.0")).toBe(0);
    expect(compareAdventureJsonVersion("1.0.0", "2.0.0")).toBeLessThan(0);
    expect(compareAdventureJsonVersion("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareAdventureJsonVersion("1.0.0-alpha", "1.0.0")).toBeLessThan(0);
    expect(compareAdventureJsonVersion("1.0.0", "1.0.0-alpha")).toBeGreaterThan(
      0,
    );
    expect(
      compareAdventureJsonVersion("1.0.0-alpha", "1.0.0-alpha.1"),
    ).toBeLessThan(0);
    expect(compareAdventureJsonVersion("1.0.0-2", "1.0.0-alpha")).toBeLessThan(
      0,
    );
    expect(
      compareAdventureJsonVersion("1.0.0-rc.1", "1.0.0-rc.2"),
    ).toBeLessThan(0);
    expect(selectAdventureJsonPredecessor([], incoming)).toBeNull();
    expect(
      selectAdventureJsonPredecessor(
        candidates.filter((c) => c.package.id !== incoming.id),
        incoming,
      ),
    ).toBeNull();
  });

  it("compares SemVer numeric identifiers above Number.MAX_SAFE_INTEGER without precision loss", () => {
    expect(
      compareAdventureJsonVersion(
        "9007199254740992.0.0",
        "9007199254740993.0.0",
      ),
    ).toBeLessThan(0);
    expect(
      compareAdventureJsonVersion(
        "1.0.0-9007199254740993",
        "1.0.0-9007199254740992",
      ),
    ).toBeGreaterThan(0);

    const older = makePackage({ version: "9007199254740992.0.0" });
    const newer = makePackage({ version: "9007199254740993.0.0" });
    const incoming = makePackage({ version: "9007199254740994.0.0" });
    const selected = selectAdventureJsonPredecessor(
      [
        { package: older, hash: "a".repeat(64) },
        { package: newer, hash: "f".repeat(64) },
      ],
      incoming,
      "b".repeat(64),
    );
    expect(selected?.package.version).toBe("9007199254740993.0.0");
  });
});
