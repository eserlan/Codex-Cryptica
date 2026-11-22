import { describe, expect, it } from "vitest";
import {
  ADVENTURE_JSON_V1_FORMAT_VERSION,
  computeAdventureJsonHash,
  parseAdventureMarkdown,
  type AdventureJsonV1,
} from "@codex/adventure-engine";
import { AdventurePackageRepository } from "./adventure-package-storage";
import { AdventurePackageContextCache } from "./adventure-package-context";

function createInMemoryDirectoryHandle(): FileSystemDirectoryHandle {
  const dirs = new Map<
    string,
    ReturnType<typeof createInMemoryDirectoryHandle>
  >();
  const files = new Map<string, string>();

  const notFound = () => {
    const err = new Error("NotFoundError");
    err.name = "NotFoundError";
    return err;
  };

  return {
    kind: "directory",
    name: "root",
    async getDirectoryHandle(name: string, options?: { create?: boolean }) {
      const existing = dirs.get(name);
      if (existing) return existing;
      if (options?.create) {
        const created = createInMemoryDirectoryHandle();
        dirs.set(name, created);
        return created;
      }
      throw notFound();
    },
    async getFileHandle(name: string, options?: { create?: boolean }) {
      if (!files.has(name) && !options?.create) {
        throw notFound();
      }
      if (!files.has(name) && options?.create) {
        files.set(name, "");
      }
      return {
        kind: "file",
        name,
        async getFile() {
          const content = files.get(name) ?? "";
          return new File([content], name);
        },
        async createWritable() {
          let buffer = "";
          return {
            async write(chunk: string) {
              buffer += chunk;
            },
            async close() {
              files.set(name, buffer);
            },
          };
        },
      } as unknown as FileSystemFileHandle;
    },
    async removeEntry(name: string) {
      if (!files.delete(name) && !dirs.delete(name)) {
        throw notFound();
      }
    },
    async *entries() {
      for (const [name] of files) {
        yield [name, { kind: "file", name } as FileSystemHandle];
      }
      for (const [name, dir] of dirs) {
        yield [name, dir];
      }
    },
  } as unknown as FileSystemDirectoryHandle;
}

const sampleMarkdown = `# The Sunken Mill

## Scene 1: The Ferry Landing
> **Read aloud:** Fog clings to the pilings.
> **GM only:** The ferryman knows the miller's secret.
- **Scene condition:** Players arrive at dusk.

### NPCs
**Wick** — **Motivation:** Collect unpaid wages.
`;

describe("AdventurePackageRepository", () => {
  it("saves an approved package under .codex/adventures/packages/<hash>.json and loads it back", async () => {
    const root = createInMemoryDirectoryHandle();
    const repo = new AdventurePackageRepository(async () => root);
    const parsed = await parseAdventureMarkdown(sampleMarkdown, {
      fileName: "sunken-mill.md",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const saved = await repo.saveApproved("vault-1", parsed.package);
    expect(saved.status).toBe("created");
    expect(saved.path).toBe(
      `.codex/adventures/packages/${parsed.package.documentHash}.json`,
    );
    expect(saved.package.status).toBe("approved");

    const loaded = await repo.load("vault-1", parsed.package.documentHash);
    expect(loaded).toEqual(saved.package);
    expect(loaded?.status).toBe("approved");
  });

  it("rejects overwriting an already-approved package and throws if storage is not configured", async () => {
    const unconfigured = new AdventurePackageRepository();
    await expect(unconfigured.load("vault-1", "a".repeat(64))).rejects.toThrow(
      "adventure-package-storage-not-configured",
    );

    const root = createInMemoryDirectoryHandle();
    const repo = new AdventurePackageRepository(async () => root);
    const parsed = await parseAdventureMarkdown(sampleMarkdown, {
      fileName: "sunken-mill.md",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    await repo.saveApproved("vault-1", parsed.package);
    await expect(repo.saveApproved("vault-1", parsed.package)).rejects.toThrow(
      "already approved",
    );
  });

  it("saves AdventureJsonV1 under canonical hash, deduplicates re-save, and lists alongside legacy packages", async () => {
    const root = createInMemoryDirectoryHandle();
    const repo = new AdventurePackageRepository(async () => root);

    const parsed = await parseAdventureMarkdown(sampleMarkdown, {
      fileName: "sunken-mill.md",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    await repo.saveApproved("vault-1", parsed.package);

    const jsonPkg: AdventureJsonV1 = {
      formatVersion: ADVENTURE_JSON_V1_FORMAT_VERSION,
      id: "the-last-grind",
      title: "The Last Grind",
      version: "1.0.0",
      premise: {
        background: "The mill stopped.",
        hook: "Investigate the sluice.",
      },
      source: { title: "The Last Grind" },
      locations: [],
      actors: [],
      factions: [],
      scenes: [],
      encounters: [],
      clues: [],
      rumours: [],
      items: [],
      secrets: [],
      endings: [],
      unresolved: [],
    };
    const expectedHash = await computeAdventureJsonHash(jsonPkg);

    const saved = await repo.saveApprovedJson("vault-1", jsonPkg);
    expect(saved.hash).toBe(expectedHash);
    expect(saved.path).toBe(`.codex/adventures/packages/${expectedHash}.json`);

    const deduplicated = await repo.saveApprovedJson("vault-1", jsonPkg);
    expect(deduplicated.status).toBe("deduplicated");
    expect(deduplicated.hash).toBe(expectedHash);

    const loaded = await repo.loadStored("vault-1", expectedHash);
    expect(loaded?.originFormat).toBe("adventure-json/v1");
    expect(loaded?.package).toEqual(jsonPkg);

    const listed = await repo.listApproved("vault-1");
    expect(listed.map((item) => item.hash).sort()).toEqual(
      [parsed.package.documentHash, expectedHash].sort(),
    );
  });

  it("removes only the target version and refuses removal when its hash is pinned", async () => {
    const root = createInMemoryDirectoryHandle();
    const repo = new AdventurePackageRepository(async () => root);
    let currentPinnedHashes = new Set<string>();
    repo.setPackagePinCoordination(
      async (_vaultId, _hash, operation) => operation(),
      async () => currentPinnedHashes,
    );
    const base: AdventureJsonV1 = {
      formatVersion: ADVENTURE_JSON_V1_FORMAT_VERSION,
      id: "the-last-grind",
      title: "The Last Grind",
      version: "1.0.0",
      premise: { background: "The mill stopped.", hook: "Investigate." },
      source: { title: "The Last Grind" },
      locations: [],
      actors: [],
      factions: [],
      scenes: [],
      encounters: [],
      clues: [],
      rumours: [],
      items: [],
      secrets: [],
      endings: [],
      unresolved: [],
    };
    const v1 = await repo.saveApprovedJson("vault-1", base);
    const v2 = await repo.saveApprovedJson("vault-1", {
      ...base,
      version: "1.1.0",
      title: "The Last Grind, revised",
    });
    expect(v1.hash).not.toBe(v2.hash);

    currentPinnedHashes = new Set([v1.hash]);
    const refused = await repo.removeApproved(
      "vault-1",
      v1.hash,
      new Set([v1.hash]),
    );
    expect(refused.status).toBe("refused");
    if (refused.status === "refused") {
      expect(refused.reason).toContain("in use");
    }
    expect(await repo.loadStored("vault-1", v1.hash)).not.toBeNull();
    const cache = new AdventurePackageContextCache(
      (vaultId, hash) => repo.loadStored(vaultId, hash),
      (vaultId, packageId, hash) =>
        repo.hasOtherApprovedVersion(vaultId, packageId, hash),
    );
    await expect(
      cache.verifyPin({
        id: "session-1",
        vaultId: "vault-1",
        sourcePackage: {
          packageId: "the-last-grind",
          version: "1.0.0",
          formatVersion: ADVENTURE_JSON_V1_FORMAT_VERSION,
          hash: v1.hash,
        },
      }),
    ).resolves.toEqual({ status: "available" });

    currentPinnedHashes = new Set();
    const removed = await repo.removeApproved(
      "vault-1",
      v1.hash,
      new Set([v2.hash]),
    );
    expect(removed.status).toBe("removed");
    expect(await repo.loadStored("vault-1", v1.hash)).toBeNull();
    expect(await repo.loadStored("vault-1", v2.hash)).not.toBeNull();
    const listed = await repo.listApproved("vault-1");
    expect(listed.map((item) => item.hash)).toEqual([v2.hash]);
  });

  it("rechecks persisted session pins under the package pin lock before removal", async () => {
    const root = createInMemoryDirectoryHandle();
    const lockEvents: string[] = [];
    let pinnedHash = "";
    const repo = new AdventurePackageRepository(async () => root);
    repo.setPackagePinCoordination(
      async (_vaultId, _hash, operation) => {
        lockEvents.push("lock");
        const result = await operation();
        lockEvents.push("unlock");
        return result;
      },
      async () => {
        lockEvents.push("scan");
        return new Set([pinnedHash]);
      },
    );
    const pkg: AdventureJsonV1 = {
      formatVersion: ADVENTURE_JSON_V1_FORMAT_VERSION,
      id: "the-last-grind",
      title: "The Last Grind",
      version: "1.0.0",
      premise: { background: "The mill stopped.", hook: "Investigate." },
      source: { title: "The Last Grind" },
      locations: [],
      actors: [],
      factions: [],
      scenes: [],
      encounters: [],
      clues: [],
      rumours: [],
      items: [],
      secrets: [],
      endings: [],
      unresolved: [],
    };
    const saved = await repo.saveApprovedJson("vault-1", pkg);
    pinnedHash = saved.hash;

    const result = await repo.removeApproved("vault-1", saved.hash);
    expect(result.status).toBe("refused");
    expect(lockEvents).toEqual(["lock", "scan", "unlock"]);
    expect(await repo.loadStored("vault-1", saved.hash)).not.toBeNull();
  });

  it("allows removal when a stale caller pin snapshot disagrees with the fresh scan", async () => {
    const root = createInMemoryDirectoryHandle();
    const repo = new AdventurePackageRepository(async () => root);
    repo.setPackagePinCoordination(
      async (_vaultId, _hash, operation) => operation(),
      async () => new Set(),
    );
    const pkg: AdventureJsonV1 = {
      formatVersion: ADVENTURE_JSON_V1_FORMAT_VERSION,
      id: "the-last-grind",
      title: "The Last Grind",
      version: "1.0.0",
      premise: { background: "The mill stopped.", hook: "Investigate." },
      source: { title: "The Last Grind" },
      locations: [],
      actors: [],
      factions: [],
      scenes: [],
      encounters: [],
      clues: [],
      rumours: [],
      items: [],
      secrets: [],
      endings: [],
      unresolved: [],
    };
    const saved = await repo.saveApprovedJson("vault-1", pkg);

    const result = await repo.removeApproved(
      "vault-1",
      saved.hash,
      new Set([saved.hash]),
    );

    expect(result.status).toBe("removed");
    expect(await repo.loadStored("vault-1", saved.hash)).toBeNull();
  });
});
