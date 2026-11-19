import { describe, expect, it } from "vitest";
import {
  ADVENTURE_JSON_V1_FORMAT_VERSION,
  approveAdventurePackage,
  computeAdventureJsonHash,
  listApprovedAdventurePackages,
  hasOtherApprovedAdventureVersion,
  loadStoredAdventurePackage,
  MAX_ALTERNATE_ADVENTURE_VERSIONS_TO_SCAN,
  parseAdventureMarkdown,
  saveAdventurePackage,
  saveApprovedAdventureJson,
  type AdventureJsonV1,
  type AdventurePackageFileIO,
} from "../../src";

function createMemoryIO(): AdventurePackageFileIO & {
  files: Map<string, string>;
  writeCalls: number;
} {
  const files = new Map<string, string>();
  const io: AdventurePackageFileIO & {
    files: Map<string, string>;
    writeCalls: number;
  } = {
    files,
    writeCalls: 0,
    async exists(path) {
      return files.has(path);
    },
    async read(path) {
      const value = files.get(path);
      if (value === undefined) throw new Error(`Missing file: ${path}`);
      return value;
    },
    async write(path, content) {
      io.writeCalls += 1;
      files.set(path, content);
    },
    async list(dir) {
      const prefix = dir.endsWith("/") ? dir : `${dir}/`;
      return [...files.keys()].filter((key) => key.startsWith(prefix));
    },
    async listLimited(dir, limit) {
      const entries = await io.list(dir);
      return {
        entries: entries.slice(0, limit),
        truncated: entries.length > limit,
      };
    },
    async remove(path) {
      files.delete(path);
    },
  };
  return io;
}

function makeSampleJson(
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
    source: {
      title: "The Sunken Mill",
      license: "CC0-1.0",
    },
    locations: [
      {
        id: "loc-mill",
        name: "Stone Mill",
        summary: "A damp watermill on the bend.",
        visibility: "player-visible",
        epistemicStatus: "explicit",
      },
    ],
    actors: [],
    factions: [],
    scenes: [
      {
        id: "scene-1",
        title: "The Mill Yard",
        summary: "Arrival at the silent mill.",
        locationId: "loc-mill",
        visibility: "player-visible",
        epistemicStatus: "explicit",
      },
    ],
    encounters: [],
    clues: [],
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

describe("AdventureJsonV1 storage", () => {
  it("saves an approved AdventureJsonV1 package under its canonical SHA-256 hash and loads it back", async () => {
    const io = createMemoryIO();
    const pkg = makeSampleJson();
    const expectedHash = await computeAdventureJsonHash(pkg);

    const saved = await saveApprovedAdventureJson(io, pkg);
    expect(saved.status).toBe("created");
    expect(saved.hash).toBe(expectedHash);
    expect(saved.path).toBe(`.codex/adventures/packages/${expectedHash}.json`);

    const loaded = await loadStoredAdventurePackage(io, expectedHash);
    expect(loaded).not.toBeNull();
    expect(loaded?.originFormat).toBe("adventure-json/v1");
    expect(loaded?.hash).toBe(expectedHash);
    expect(loaded?.package).toEqual(pkg);
  });

  it("deduplicates a re-save of the same canonical content without a second write or byte change", async () => {
    const io = createMemoryIO();
    const pkg = makeSampleJson();
    const first = await saveApprovedAdventureJson(io, pkg);
    const bytesBefore = io.files.get(first.path);
    const writesBefore = io.files.size;
    const writeCallsBefore = io.writeCalls;

    const again = await saveApprovedAdventureJson(io, pkg);
    expect(again.status).toBe("deduplicated");
    expect(again.hash).toBe(first.hash);
    expect(again.path).toBe(first.path);
    expect(again.package).toEqual(pkg);
    expect(io.files.get(first.path)).toBe(bytesBefore);
    expect(io.files.size).toBe(writesBefore);
    expect(io.writeCalls).toBe(writeCallsBefore);

    // Key-reordered serialisation of the same content deduplicates as well.
    const reordered = JSON.parse(
      JSON.stringify(pkg, (_key, value) => {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).reverse(),
          );
        }
        return value;
      }),
    ) as AdventureJsonV1;
    const reorderedResult = await saveApprovedAdventureJson(io, reordered);
    expect(reorderedResult.status).toBe("deduplicated");
    expect(reorderedResult.hash).toBe(first.hash);
    expect(io.files.get(first.path)).toBe(bytesBefore);
  });

  it("restores a changed native hash-path file only from its exact original content", async () => {
    const io = createMemoryIO();
    const original = makeSampleJson();
    const { path, hash } = await saveApprovedAdventureJson(io, original);
    const altered = makeSampleJson({ title: "Changed on disk" });
    io.files.set(path, JSON.stringify(altered));

    await expect(loadStoredAdventurePackage(io, hash)).rejects.toThrow(
      "hash mismatch",
    );
    const restored = await saveApprovedAdventureJson(io, original);

    expect(restored.status).toBe("created");
    expect(restored.hash).toBe(hash);
    expect(await loadStoredAdventurePackage(io, hash)).toMatchObject({
      hash,
      package: original,
    });
    const separateVersion = await saveApprovedAdventureJson(io, altered);
    expect(separateVersion.hash).not.toBe(hash);
    expect((await loadStoredAdventurePackage(io, hash))?.package).toEqual(
      original,
    );
  });

  it("restores malformed bytes at the pinned hash path after re-import", async () => {
    const io = createMemoryIO();
    const original = makeSampleJson();
    const { path, hash } = await saveApprovedAdventureJson(io, original);
    io.files.set(path, "{not valid JSON");

    await expect(loadStoredAdventurePackage(io, hash)).rejects.toThrow();
    const restored = await saveApprovedAdventureJson(io, original);

    expect(restored.status).toBe("created");
    expect(restored.hash).toBe(hash);
    expect(await loadStoredAdventurePackage(io, hash)).toMatchObject({
      hash,
      package: original,
    });
  });

  it("bounds alternate-version checks and does not retain an approved package list", async () => {
    const io = createMemoryIO();
    const pinned = makeSampleJson({ id: "pinned" });
    const pinnedSaved = await saveApprovedAdventureJson(io, pinned);
    for (
      let index = 0;
      index <= MAX_ALTERNATE_ADVENTURE_VERSIONS_TO_SCAN;
      index++
    ) {
      await saveApprovedAdventureJson(
        io,
        makeSampleJson({ id: `other-${index}`, title: `Other ${index}` }),
      );
    }

    await expect(
      hasOtherApprovedAdventureVersion(io, "absent", pinnedSaved.hash),
    ).resolves.toBeNull();
    await saveApprovedAdventureJson(
      io,
      makeSampleJson({ id: "pinned", version: "2.0.0" }),
    );
    await expect(
      hasOtherApprovedAdventureVersion(io, "pinned", pinnedSaved.hash),
    ).resolves.toBeNull();
    const matchingIO = createMemoryIO();
    const matchingPinned = await saveApprovedAdventureJson(matchingIO, pinned);
    await saveApprovedAdventureJson(
      matchingIO,
      makeSampleJson({ id: "pinned", version: "2.0.0" }),
    );
    await expect(
      hasOtherApprovedAdventureVersion(
        matchingIO,
        "pinned",
        matchingPinned.hash,
      ),
    ).resolves.toBe(true);
  });

  it("stores changed same-id content under a new hash without touching the earlier file", async () => {
    const io = createMemoryIO();
    const v1 = makeSampleJson();
    const first = await saveApprovedAdventureJson(io, v1);
    const bytesBefore = io.files.get(first.path);
    const v2 = makeSampleJson({
      version: "1.1.0",
      scenes: [
        {
          id: "scene-1",
          title: "The Mill Yard",
          summary: "Arrival at the silent mill, revised.",
          visibility: "player-visible",
          epistemicStatus: "explicit",
        },
      ],
    });
    const second = await saveApprovedAdventureJson(io, v2);
    expect(second.status).toBe("created");
    expect(second.hash).not.toBe(first.hash);
    expect(io.files.get(first.path)).toBe(bytesBefore);
    const listed = await listApprovedAdventurePackages(io);
    expect(listed.map((entry) => entry.hash).sort()).toEqual(
      [first.hash, second.hash].sort(),
    );
    const reloadedV1 = await loadStoredAdventurePackage(io, first.hash);
    expect(reloadedV1?.package).toEqual(v1);
  });

  it("rolls back on write verification failure and rejects invalid AdventureJsonV1", async () => {
    const io = createMemoryIO();
    const pkg = makeSampleJson();
    const badPkg = {
      ...pkg,
      formatVersion: "adventure-json/v99",
    } as unknown as AdventureJsonV1;
    await expect(saveApprovedAdventureJson(io, badPkg)).rejects.toThrow();
    expect(io.files.size).toBe(0);

    const corruptIO: AdventurePackageFileIO = {
      ...io,
      async read() {
        return "{not-json";
      },
    };
    await expect(saveApprovedAdventureJson(corruptIO, pkg)).rejects.toThrow();
    expect(io.files.size).toBe(0);
  });

  it("loads and lists legacy approved AdventureSourcePackage files normalized to AdventureJsonV1 without modifying disk", async () => {
    const io = createMemoryIO();
    const mdResult = await parseAdventureMarkdown(
      `# Legacy Module\n\n## Scene 1: Gate\n> **Read aloud:** Rain falls.\n`,
      { fileName: "legacy.md" },
    );
    expect(mdResult.ok).toBe(true);
    if (!mdResult.ok) return;

    const approvedLegacy = approveAdventurePackage(mdResult.package);
    await saveAdventurePackage(io, approvedLegacy);
    const legacyPath = `.codex/adventures/packages/${approvedLegacy.documentHash}.json`;
    const rawBefore = io.files.get(legacyPath);

    const jsonPkg = makeSampleJson();
    const jsonSaved = await saveApprovedAdventureJson(io, jsonPkg);

    const loadedLegacy = await loadStoredAdventurePackage(
      io,
      approvedLegacy.documentHash,
    );
    expect(loadedLegacy?.originFormat).toBe("legacy-source-package");
    expect(loadedLegacy?.package.formatVersion).toBe(
      ADVENTURE_JSON_V1_FORMAT_VERSION,
    );
    expect(loadedLegacy?.package.title).toBe("Legacy Module");
    expect(io.files.get(legacyPath)).toBe(rawBefore);

    const listed = await listApprovedAdventurePackages(io);
    expect(listed.map((entry) => entry.hash).sort()).toEqual(
      [approvedLegacy.documentHash, jsonSaved.hash].sort(),
    );
  });
});
