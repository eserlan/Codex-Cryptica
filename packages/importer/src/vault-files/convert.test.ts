import { describe, it, expect } from "vitest";
import { droppedItemsToPackage, resolveMissingImage } from "./convert";
import type { DroppedItem, MissingImageReference } from "./convert";

function md(
  overrides: Record<string, unknown> = {},
  content = "Lore body.",
): File {
  const fields = {
    id: "thistle",
    type: "Character",
    title: "Thistle",
    tags: [],
    ...overrides,
  };
  const yaml = Object.entries(fields)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
  return new File([`---\n${yaml}\n---\n\n${content}`], "entity.md", {
    type: "text/markdown",
  });
}

function imageFile(name: string, bytes = "fake-image-bytes"): File {
  return new File([bytes], name, { type: "image/webp" });
}

describe("droppedItemsToPackage", () => {
  it("converts a lone entity file with no image refs into one EntityDraft", async () => {
    const items: DroppedItem[] = [
      { relativePath: "entities/thistle.md", file: md() },
    ];
    const { pkg, missingImageRefs } = await droppedItemsToPackage(items);

    expect(pkg.entityDrafts).toHaveLength(1);
    expect(pkg.entityDrafts[0]).toMatchObject({
      sourcePath: "entities/thistle.md",
      sourceType: "Character",
      title: "Thistle",
      content: "Lore body.",
    });
    expect(pkg.assetDrafts).toHaveLength(0);
    expect(missingImageRefs).toHaveLength(0);
    expect(pkg.warnings).toHaveLength(0);
  });

  it("matches an entity's image reference to a dropped image file by path", async () => {
    const items: DroppedItem[] = [
      {
        relativePath: "entities/thistle.md",
        file: md({ image: "images/thistle.webp" }),
      },
      { relativePath: "images/thistle.webp", file: imageFile("thistle.webp") },
    ];
    const { pkg, missingImageRefs } = await droppedItemsToPackage(items);

    expect(pkg.assetDrafts).toHaveLength(1);
    expect(pkg.assetDrafts[0]).toMatchObject({
      placementRef: "entities/thistle.md",
      originalName: "thistle.webp",
    });
    expect(pkg.assetDrafts[0].contentHash).toBeTruthy();
    expect(missingImageRefs).toHaveLength(0);
  });

  it("matches both image and thumbnail references", async () => {
    const items: DroppedItem[] = [
      {
        relativePath: "entities/thistle.md",
        file: md({
          image: "images/thistle.webp",
          thumbnail: "images/thistle_thumb.webp",
        }),
      },
      { relativePath: "images/thistle.webp", file: imageFile("thistle.webp") },
      {
        relativePath: "images/thistle_thumb.webp",
        file: imageFile("thistle_thumb.webp"),
      },
    ];
    const { pkg } = await droppedItemsToPackage(items);
    expect(pkg.assetDrafts).toHaveLength(2);
  });

  it("surfaces an unresolved image reference instead of silently dropping it", async () => {
    const items: DroppedItem[] = [
      {
        relativePath: "entities/thistle.md",
        file: md({ image: "images/thistle.webp" }),
      },
    ];
    const { pkg, missingImageRefs } = await droppedItemsToPackage(items);

    expect(pkg.entityDrafts).toHaveLength(1); // entity still imports
    expect(pkg.assetDrafts).toHaveLength(0);
    expect(missingImageRefs).toEqual([
      {
        path: "images/thistle.webp",
        referencedBy: ["entities/thistle.md"],
        resolution: "unresolved",
      },
    ]);
  });

  it("excludes and reports a non-entity file", async () => {
    const items: DroppedItem[] = [
      {
        relativePath: "notes/readme.txt",
        file: new File(["hello"], "readme.txt"),
      },
    ];
    const { pkg } = await droppedItemsToPackage(items);

    expect(pkg.entityDrafts).toHaveLength(0);
    expect(pkg.warnings).toHaveLength(1);
    expect(pkg.warnings[0]).toMatchObject({
      code: "vault-files.unrecognized-file",
      ref: "notes/readme.txt",
    });
  });

  it("gives two images with the same filename but different bytes distinct content hashes", async () => {
    const items: DroppedItem[] = [
      {
        relativePath: "a/entity.md",
        file: md({ id: "a", title: "A" }, ""),
      },
      {
        relativePath: "a/portrait.webp",
        file: imageFile("portrait.webp", "bytes-A"),
      },
      {
        relativePath: "b/entity.md",
        file: md({ id: "b", title: "B" }, ""),
      },
      {
        relativePath: "b/portrait.webp",
        file: imageFile("portrait.webp", "bytes-B"),
      },
    ];
    // Patch image refs onto each entity file manually since md() above
    // doesn't set them — rebuild with explicit image refs instead.
    const withRefs: DroppedItem[] = [
      {
        relativePath: "a/entity.md",
        file: md({ id: "a", title: "A", image: "a/portrait.webp" }, ""),
      },
      items[1],
      {
        relativePath: "b/entity.md",
        file: md({ id: "b", title: "B", image: "b/portrait.webp" }, ""),
      },
      items[3],
    ];

    const { pkg } = await droppedItemsToPackage(withRefs);
    expect(pkg.assetDrafts).toHaveLength(2);
    expect(pkg.assetDrafts[0].contentHash).not.toBe(
      pkg.assetDrafts[1].contentHash,
    );
  });

  it("shares one AssetDraft's content hash across two entities referencing the same image path", async () => {
    const items: DroppedItem[] = [
      {
        relativePath: "entities/a.md",
        file: md({ id: "a", title: "A", image: "images/shared.webp" }),
      },
      {
        relativePath: "entities/b.md",
        file: md({ id: "b", title: "B", image: "images/shared.webp" }),
      },
      { relativePath: "images/shared.webp", file: imageFile("shared.webp") },
    ];
    const { pkg } = await droppedItemsToPackage(items);

    expect(pkg.assetDrafts).toHaveLength(2);
    expect(pkg.assetDrafts[0].contentHash).toBe(pkg.assetDrafts[1].contentHash);
    const placementRefs = pkg.assetDrafts.map((a) => a.placementRef).sort();
    expect(placementRefs).toEqual(["entities/a.md", "entities/b.md"]);
  });

  it("excludes an unreadable file without blocking the rest of the selection", async () => {
    const unreadable: DroppedItem = {
      relativePath: "entities/broken.md",
      file: {
        text: () => Promise.reject(new Error("permission denied")),
      } as unknown as File,
    };
    const items: DroppedItem[] = [
      unreadable,
      { relativePath: "entities/thistle.md", file: md() },
    ];

    const { pkg } = await droppedItemsToPackage(items);
    expect(pkg.entityDrafts).toHaveLength(1);
    expect(pkg.entityDrafts[0].sourcePath).toBe("entities/thistle.md");
  });
});

describe("resolveMissingImage", () => {
  const ref: MissingImageReference = {
    path: "images/thistle.webp",
    referencedBy: ["entities/thistle.md"],
    resolution: "unresolved",
  };

  it("resolves via a directly-added file", async () => {
    const file = imageFile("thistle.webp");
    const drafts = await resolveMissingImage(ref, { addedFile: file });

    expect(drafts).toHaveLength(1);
    expect(drafts![0]).toMatchObject({
      placementRef: "entities/thistle.md",
      originalName: "thistle.webp",
    });
    expect(drafts![0].contentHash).toBeTruthy();
  });

  it("resolves via a granted folder handle by walking it", async () => {
    const file = imageFile("thistle.webp");
    const leafHandle = {
      kind: "file" as const,
      name: "thistle.webp",
      getFile: () => Promise.resolve(file),
    };
    const rootHandle = {
      values: async function* () {
        yield leafHandle;
      },
    } as unknown as FileSystemDirectoryHandle;

    const drafts = await resolveMissingImage(ref, {
      sourceFolderHandle: rootHandle,
    });
    expect(drafts).toHaveLength(1);
    expect(drafts![0].originalName).toBe("thistle.webp");
  });

  it("walks into subdirectories of the granted folder", async () => {
    const file = imageFile("thistle.webp");
    const leafHandle = {
      kind: "file" as const,
      name: "thistle.webp",
      getFile: () => Promise.resolve(file),
    };
    const subDir = {
      kind: "directory" as const,
      name: "images",
      values: async function* () {
        yield leafHandle;
      },
    };
    const rootHandle = {
      values: async function* () {
        yield subDir;
      },
    } as unknown as FileSystemDirectoryHandle;

    const drafts = await resolveMissingImage(ref, {
      sourceFolderHandle: rootHandle,
    });
    expect(drafts).toHaveLength(1);
  });

  it("resolves via an exact path match when the granted folder contains a parent directory", async () => {
    // The user selected a parent folder that itself contains the vault
    // folder — the target should still resolve via its full relative path.
    const file = imageFile("thistle.webp");
    const leafHandle = {
      kind: "file" as const,
      name: "thistle.webp",
      getFile: () => Promise.resolve(file),
    };
    const imagesDir = {
      kind: "directory" as const,
      name: "images",
      values: async function* () {
        yield leafHandle;
      },
    };
    const vaultDir = {
      kind: "directory" as const,
      name: "my-vault",
      values: async function* () {
        yield imagesDir;
      },
    };
    const rootHandle = {
      values: async function* () {
        yield vaultDir;
      },
    } as unknown as FileSystemDirectoryHandle;

    const drafts = await resolveMissingImage(ref, {
      sourceFolderHandle: rootHandle,
    });
    expect(drafts).toHaveLength(1);
    expect(drafts![0].originalName).toBe("thistle.webp");
  });

  it("does not guess when multiple same-named files exist and none matches the full path", async () => {
    const fileA = imageFile("thistle.webp");
    const fileB = imageFile("thistle.webp");
    const dirA = {
      kind: "directory" as const,
      name: "old-art",
      values: async function* () {
        yield {
          kind: "file" as const,
          name: "thistle.webp",
          getFile: () => Promise.resolve(fileA),
        };
      },
    };
    const dirB = {
      kind: "directory" as const,
      name: "new-art",
      values: async function* () {
        yield {
          kind: "file" as const,
          name: "thistle.webp",
          getFile: () => Promise.resolve(fileB),
        };
      },
    };
    const rootHandle = {
      values: async function* () {
        yield dirA;
        yield dirB;
      },
    } as unknown as FileSystemDirectoryHandle;

    const drafts = await resolveMissingImage(ref, {
      sourceFolderHandle: rootHandle,
    });
    expect(drafts).toBeNull();
  });

  it("returns null (still missing) when not found via either path", async () => {
    const rootHandle = {
      values: async function* () {
        // empty folder
      },
    } as unknown as FileSystemDirectoryHandle;

    const drafts = await resolveMissingImage(ref, {
      sourceFolderHandle: rootHandle,
    });
    expect(drafts).toBeNull();
  });

  it("returns null when neither an added file nor a folder handle is given", async () => {
    const drafts = await resolveMissingImage(ref, {});
    expect(drafts).toBeNull();
  });
});
