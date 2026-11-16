import { describe, expect, it } from "vitest";
import {
  ADVENTURE_JSON_V1_FORMAT_VERSION,
  approveAdventurePackage,
  computeAdventureJsonHash,
  listApprovedAdventurePackages,
  loadStoredAdventurePackage,
  parseAdventureMarkdown,
  saveAdventurePackage,
  saveApprovedAdventureJson,
  type AdventureJsonV1,
  type AdventurePackageFileIO,
} from "../../src";

function createMemoryIO(): AdventurePackageFileIO & {
  files: Map<string, string>;
} {
  const files = new Map<string, string>();
  return {
    files,
    async exists(path) {
      return files.has(path);
    },
    async read(path) {
      const value = files.get(path);
      if (value === undefined) throw new Error(`Missing file: ${path}`);
      return value;
    },
    async write(path, content) {
      files.set(path, content);
    },
    async list(dir) {
      const prefix = dir.endsWith("/") ? dir : `${dir}/`;
      return [...files.keys()].filter((key) => key.startsWith(prefix));
    },
    async remove(path) {
      files.delete(path);
    },
  };
}

function makeSampleJson(overrides: Partial<AdventureJsonV1> = {}): AdventureJsonV1 {
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

  it("rejects overwriting an already-approved package at the same canonical hash", async () => {
    const io = createMemoryIO();
    const pkg = makeSampleJson();
    await saveApprovedAdventureJson(io, pkg);

    await expect(saveApprovedAdventureJson(io, pkg)).rejects.toThrow(
      /already approved/i,
    );
  });

  it("rolls back on write verification failure and rejects invalid AdventureJsonV1", async () => {
    const io = createMemoryIO();
    const pkg = makeSampleJson();
    const badPkg = { ...pkg, formatVersion: "adventure-json/v99" } as unknown as AdventureJsonV1;
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
