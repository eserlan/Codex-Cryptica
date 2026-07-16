import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { zipSync, strToU8 } from "fflate";

// In-memory stand-in for OPFS. Keys are "vaultId/relative/path".
const store = new Map<string, Uint8Array>();

vi.mock("./opfs", () => ({
  VAULTS_DIR: "vaults",
  getOpfsRoot: vi.fn(async () => ({ __root: true })),
  getVaultDir: vi.fn(async (_root: unknown, vaultId: string) => ({
    __vaultId: vaultId,
  })),
  walkOpfsDirectory: vi.fn(async (dir: { __vaultId: string }) => {
    const prefix = `${dir.__vaultId}/`;
    return [...store.keys()]
      .filter((k) => k.startsWith(prefix))
      .map((k) => ({ path: k.slice(prefix.length).split("/"), handle: {} }));
  }),
  readOpfsBlob: vi.fn(
    async (path: string[], dir: { __vaultId: string }) =>
      new Blob([store.get(`${dir.__vaultId}/${path.join("/")}`)! as BlobPart]),
  ),
  writeOpfsFile: vi.fn(
    async (path: string[], content: Blob, _root: unknown) => {
      // path is [VAULTS_DIR, vaultId, ...rest]; strip the VAULTS_DIR segment.
      const [, vaultId, ...rest] = path;
      const bytes = new Uint8Array(await content.arrayBuffer());
      store.set(`${vaultId}/${rest.join("/")}`, bytes);
    },
  ),
}));

import {
  exportVaultToZip,
  parseVaultArchive,
  writeArchiveToVault,
  VAULT_ARCHIVE_EXTENSION,
} from "./vault-archive";

describe("vault-archive", () => {
  let lastBlob: Blob | null = null;
  let capturedDownload: { filename: string; blob: Blob } | null = null;

  beforeEach(() => {
    store.clear();
    lastBlob = null;
    capturedDownload = null;

    // Capture the download instead of touching a real DOM anchor. The blob is
    // whatever the code most recently passed to URL.createObjectURL.
    vi.spyOn(URL, "createObjectURL").mockImplementation(
      (blob: Blob | MediaSource) => {
        lastBlob = blob as Blob;
        return "blob:mock";
      },
    );
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockImplementation(
      (tag: string) =>
        ({
          tagName: tag,
          href: "",
          download: "",
          click: vi.fn(function (this: { download: string }) {
            capturedDownload = { filename: this.download, blob: lastBlob! };
          }),
          remove: vi.fn(),
        }) as unknown as HTMLElement,
    );
    vi.spyOn(document.body, "appendChild").mockImplementation((n: any) => n);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("round-trips a vault through export and import", async () => {
    store.set("source/hero.md", strToU8("# Hero\nBrave and true."));
    store.set("source/.codex/canvases/map.json", strToU8('{"nodes":[]}'));
    store.set("source/images/portrait.png", new Uint8Array([137, 80, 78, 71]));

    const count = await exportVaultToZip("source", "My World");
    expect(count).toBe(3);
    expect(capturedDownload).not.toBeNull();
    expect(capturedDownload!.filename).toContain("My-World");
    expect(capturedDownload!.filename.endsWith(VAULT_ARCHIVE_EXTENSION)).toBe(
      true,
    );

    const archive = await parseVaultArchive(capturedDownload!.blob);
    expect(archive.vaultName).toBe("My World");
    expect(archive.files).toHaveLength(3);

    // Import into a fresh vault id and confirm bytes survive. Compare by
    // content (Array.from) to sidestep typed-array view/offset identity quirks.
    await writeArchiveToVault("restored", archive);
    expect(Array.from(store.get("restored/hero.md")!)).toEqual(
      Array.from(store.get("source/hero.md")!),
    );
    expect(Array.from(store.get("restored/images/portrait.png")!)).toEqual([
      137, 80, 78, 71,
    ]);
    expect(store.has("restored/.codex/canvases/map.json")).toBe(true);
  });

  it("rejects a non-zip file", async () => {
    const notZip = new Blob([strToU8("just some text")]);
    await expect(parseVaultArchive(notZip)).rejects.toThrow(/valid zip/i);
  });

  it("rejects a zip without a manifest", async () => {
    const zipped = zipSync({ "vault/hero.md": strToU8("# Hero") });
    await expect(parseVaultArchive(new Blob([zipped]))).rejects.toThrow(
      /no archive manifest|isn't a Codex vault backup/i,
    );
  });

  it("rejects an archive from a newer version", async () => {
    const zipped = zipSync({
      "codex-archive.json": strToU8(
        JSON.stringify({
          format: "codex-vault-archive",
          version: 999,
          vaultName: "Future",
          exportedAt: new Date().toISOString(),
          fileCount: 0,
        }),
      ),
    });
    await expect(parseVaultArchive(new Blob([zipped]))).rejects.toThrow(
      /newer version/i,
    );
  });

  it("ignores the manifest and directory entries when listing files", async () => {
    const zipped = zipSync({
      "codex-archive.json": strToU8(
        JSON.stringify({
          format: "codex-vault-archive",
          version: 1,
          vaultName: "Tidy",
          exportedAt: new Date().toISOString(),
          fileCount: 1,
        }),
      ),
      "vault/notes.md": strToU8("hello"),
    });
    const archive = await parseVaultArchive(new Blob([zipped]));
    expect(archive.files).toHaveLength(1);
    expect(archive.files[0].path).toEqual(["notes.md"]);
  });
});
