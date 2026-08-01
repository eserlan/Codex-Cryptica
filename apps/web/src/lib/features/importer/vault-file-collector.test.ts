import { describe, it, expect } from "vitest";
import {
  collectDroppedItems,
  collectUploadedItems,
} from "./vault-file-collector";

function fileEntry(name: string, file: File): FileSystemFileEntry {
  return {
    isFile: true,
    isDirectory: false,
    name,
    file: (cb: (f: File) => void) => cb(file),
  } as unknown as FileSystemFileEntry;
}

function dirEntry(
  name: string,
  children: FileSystemEntry[],
): FileSystemDirectoryEntry {
  let read = false;
  return {
    isFile: false,
    isDirectory: true,
    name,
    createReader: () => ({
      readEntries: (cb: (entries: FileSystemEntry[]) => void) => {
        if (read) {
          cb([]);
          return;
        }
        read = true;
        cb(children);
      },
    }),
  } as unknown as FileSystemDirectoryEntry;
}

function dataTransferFromEntries(entries: FileSystemEntry[]): DataTransfer {
  return {
    items: entries.map((entry) => ({
      webkitGetAsEntry: () => entry,
    })) as unknown as DataTransferItemList,
    files: [] as unknown as FileList,
  } as unknown as DataTransfer;
}

describe("collectDroppedItems", () => {
  it("collects loose dropped files with their bare filenames", async () => {
    const file = new File(["hi"], "thistle.md");
    const dt = dataTransferFromEntries([fileEntry("thistle.md", file)]);

    const items = await collectDroppedItems(dt);
    expect(items).toEqual([{ relativePath: "thistle.md", file }]);
  });

  it("treats a dropped folder as the vault root, stripping its own name from paths", async () => {
    const entityFile = new File(["hi"], "thistle.md");
    const imageFile = new File(["bytes"], "thistle.webp");

    const imagesDir = dirEntry("images", [
      fileEntry("thistle.webp", imageFile),
    ]);
    const entitiesDir = dirEntry("entities", [
      fileEntry("thistle.md", entityFile),
    ]);
    const vaultDir = dirEntry("my-vault", [entitiesDir, imagesDir]);

    const dt = dataTransferFromEntries([vaultDir]);
    const items = await collectDroppedItems(dt);

    // No "my-vault/" prefix — paths must match how an entity's frontmatter
    // references its own content (e.g. `image: images/thistle.webp`),
    // which is relative to the vault root, not the dragged folder's name.
    expect(items).toContainEqual({
      relativePath: "entities/thistle.md",
      file: entityFile,
    });
    expect(items).toContainEqual({
      relativePath: "images/thistle.webp",
      file: imageFile,
    });
  });

  it("handles a directory reader that only returns entries after multiple readEntries calls", async () => {
    const fileA = new File(["a"], "a.md");
    const fileB = new File(["b"], "b.md");
    let call = 0;
    const dir = {
      isFile: false,
      isDirectory: true,
      name: "vault",
      createReader: () => ({
        readEntries: (cb: (entries: FileSystemEntry[]) => void) => {
          call++;
          if (call === 1) cb([fileEntry("a.md", fileA)]);
          else if (call === 2) cb([fileEntry("b.md", fileB)]);
          else cb([]);
        },
      }),
    } as unknown as FileSystemDirectoryEntry;

    const items = await collectDroppedItems(dataTransferFromEntries([dir]));
    const paths = items.map((i) => i.relativePath).sort();
    expect(paths).toEqual(["a.md", "b.md"]);
  });

  it("excludes a file entry that fails to read without dropping sibling files", async () => {
    const goodFile = new File(["hi"], "thistle.md");
    const brokenEntry = {
      isFile: true,
      isDirectory: false,
      name: "broken.md",
      file: (_resolve: (f: File) => void, reject: (e: unknown) => void) =>
        reject(new Error("permission denied")),
    } as unknown as FileSystemFileEntry;

    const items = await collectDroppedItems(
      dataTransferFromEntries([brokenEntry, fileEntry("thistle.md", goodFile)]),
    );

    expect(items).toEqual([{ relativePath: "thistle.md", file: goodFile }]);
  });

  it("excludes a directory that fails to read without dropping siblings collected elsewhere", async () => {
    const goodFile = new File(["hi"], "thistle.md");
    const brokenDir = {
      isFile: false,
      isDirectory: true,
      name: "broken-folder",
      createReader: () => ({
        readEntries: (
          _cb: (entries: FileSystemEntry[]) => void,
          reject: (e: unknown) => void,
        ) => reject(new Error("permission denied")),
      }),
    } as unknown as FileSystemDirectoryEntry;

    const items = await collectDroppedItems(
      dataTransferFromEntries([brokenDir, fileEntry("thistle.md", goodFile)]),
    );

    expect(items).toEqual([{ relativePath: "thistle.md", file: goodFile }]);
  });
});

describe("collectUploadedItems", () => {
  it("maps FileList entries to DroppedItems using bare filenames", () => {
    const a = new File(["a"], "a.md");
    const b = new File(["b"], "b.md");
    const items = collectUploadedItems([a, b]);
    expect(items).toEqual([
      { relativePath: "a.md", file: a },
      { relativePath: "b.md", file: b },
    ]);
  });
});
