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

  it("walks a dropped folder recursively, building folder-relative paths", async () => {
    const entityFile = new File(["hi"], "thistle.md");
    const imageFile = new File(["bytes"], "thistle.webp");

    const imagesDir = dirEntry("images", [
      fileEntry("thistle.webp", imageFile),
    ]);
    const vaultDir = dirEntry("my-vault", [
      fileEntry("thistle.md", entityFile),
      imagesDir,
    ]);

    const dt = dataTransferFromEntries([vaultDir]);
    const items = await collectDroppedItems(dt);

    expect(items).toContainEqual({
      relativePath: "my-vault/thistle.md",
      file: entityFile,
    });
    expect(items).toContainEqual({
      relativePath: "my-vault/images/thistle.webp",
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
    expect(paths).toEqual(["vault/a.md", "vault/b.md"]);
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
