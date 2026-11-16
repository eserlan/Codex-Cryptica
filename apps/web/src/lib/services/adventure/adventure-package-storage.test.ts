import { describe, expect, it } from "vitest";
import { parseAdventureMarkdown } from "@codex/adventure-engine";
import { AdventurePackageRepository } from "./adventure-package-storage";

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
});
