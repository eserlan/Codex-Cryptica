import type {
  AssetDraft,
  CCImportPackage,
  EntityDraft,
  ImportWarning,
} from "../cc/package";
import { sha256Hex } from "../cif/zip";
import {
  hasEntityFileExtension,
  isVaultEntityFile,
  parseVaultFileFrontmatter,
} from "./detect";

/** A single file the user dragged in or chose via the file upload dialog. */
export interface DroppedItem {
  /** Bare filename for a loose file, or folder-relative path for a dropped folder. */
  relativePath: string;
  file: File | Blob;
}

export type MissingImageResolution =
  "unresolved" | "added-directly" | "resolved-from-folder" | "still-missing";

export interface MissingImageReference {
  path: string;
  referencedBy: string[];
  resolution: MissingImageResolution;
}

export interface DroppedItemsConversionResult {
  pkg: CCImportPackage;
  missingImageRefs: MissingImageReference[];
}

function fileNameOf(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

function guessMimeType(file: File | Blob, path: string): string {
  if ("type" in file && file.type) return file.type;
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

async function hashOf(file: File | Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return sha256Hex(bytes);
}

function buildAssetDraft(
  item: DroppedItem,
  placementRef: string,
  contentHash: string,
): AssetDraft {
  return {
    id: `${placementRef}::${item.relativePath}`,
    bytes: item.file,
    originalName: fileNameOf(item.relativePath),
    mimeType: guessMimeType(item.file, item.relativePath),
    placementRef,
    contentHash,
  };
}

/**
 * Converts a drag-and-drop / file-upload selection into a CCImportPackage,
 * the same shape ImportEngine already consumes for CIF/Scabard/Chronica.
 * Image (and thumbnail) references are matched against other dropped items
 * by relative path; references with no match are returned separately as
 * `missingImageRefs` rather than silently dropped, so the review UI can
 * offer resolution (see resolveMissingImage).
 */
export async function droppedItemsToPackage(
  items: DroppedItem[],
): Promise<DroppedItemsConversionResult> {
  const byPath = new Map(items.map((item) => [item.relativePath, item]));
  const entityDrafts: EntityDraft[] = [];
  const warnings: ImportWarning[] = [];
  const usedImagePaths = new Set<string>();
  // Entity sourcePath -> its unresolved image reference paths, gathered in
  // a first pass so a second pass can classify every dropped item.
  const wantedImages = new Map<string, Set<string>>();

  for (const item of items) {
    if (!hasEntityFileExtension(item.relativePath)) continue;

    let raw: string;
    try {
      raw = await item.file.text();
    } catch {
      continue; // unreadable — excluded, not surfaced as vault content
    }
    if (!isVaultEntityFile(item.relativePath, raw)) continue;

    const { metadata, content } = parseVaultFileFrontmatter(raw);
    const sourceType =
      typeof metadata.type === "string" ? metadata.type : undefined;
    const image =
      typeof metadata.image === "string" ? metadata.image : undefined;
    const thumbnail =
      typeof metadata.thumbnail === "string" ? metadata.thumbnail : undefined;

    const draft: EntityDraft = {
      sourcePath: item.relativePath,
      sourceType,
      title: String(metadata.title),
      content,
      lore: typeof metadata.lore === "string" ? metadata.lore : undefined,
      tags: Array.isArray(metadata.tags) ? metadata.tags.map(String) : [],
      labels: Array.isArray(metadata.labels)
        ? metadata.labels.map(String)
        : undefined,
      aliases: Array.isArray(metadata.aliases)
        ? metadata.aliases.map(String)
        : undefined,
      image,
      thumbnail,
      metadata:
        metadata.metadata && typeof metadata.metadata === "object"
          ? (metadata.metadata as Record<string, unknown>)
          : undefined,
      startDate: extractDraftDate(metadata.start_date),
      endDate: extractDraftDate(metadata.end_date),
    };
    entityDrafts.push(draft);

    const wanted = new Set<string>();
    if (image) wanted.add(image);
    if (thumbnail) wanted.add(thumbnail);
    if (wanted.size > 0) wantedImages.set(draft.sourcePath!, wanted);
  }

  const referencedByPath = new Map<string, string[]>();
  for (const [sourcePath, paths] of wantedImages) {
    for (const path of paths) {
      const refs = referencedByPath.get(path) ?? [];
      refs.push(sourcePath);
      referencedByPath.set(path, refs);
    }
  }

  const assetDrafts: AssetDraft[] = [];
  const hashCache = new Map<string, Promise<string>>();

  for (const [imagePath, referencedBy] of referencedByPath) {
    const imageItem = byPath.get(imagePath);
    if (!imageItem) continue; // handled as missingImageRefs below

    usedImagePaths.add(imagePath);
    let hashPromise = hashCache.get(imagePath);
    if (!hashPromise) {
      hashPromise = hashOf(imageItem.file);
      hashCache.set(imagePath, hashPromise);
    }
    const hash = await hashPromise;

    for (const sourcePath of referencedBy) {
      assetDrafts.push(buildAssetDraft(imageItem, sourcePath, hash));
    }
  }

  const missingImageRefs: MissingImageReference[] = [];
  for (const [imagePath, referencedBy] of referencedByPath) {
    if (byPath.has(imagePath)) continue;
    missingImageRefs.push({
      path: imagePath,
      referencedBy,
      resolution: "unresolved",
    });
  }

  const entityPaths = new Set(entityDrafts.map((d) => d.sourcePath));
  for (const item of items) {
    if (entityPaths.has(item.relativePath)) continue;
    if (usedImagePaths.has(item.relativePath)) continue;
    warnings.push({
      code: "vault-files.unrecognized-file",
      message: `"${item.relativePath}" was not recognized as vault content and was not imported.`,
      ref: item.relativePath,
    });
  }

  const pkg: CCImportPackage = {
    version: "1.0",
    sourceSystem: "vault-files",
    sourceLabel: "Files from your device",
    entityDrafts,
    relationshipDrafts: [],
    assetDrafts,
    warnings,
  };

  return { pkg, missingImageRefs };
}

function extractDraftDate(
  value: unknown,
): EntityDraft["startDate"] | undefined {
  if (
    value &&
    typeof value === "object" &&
    "year" in value &&
    typeof (value as { year: unknown }).year === "number"
  ) {
    const v = value as { year: number; month?: number; day?: number };
    return { year: v.year, month: v.month, day: v.day };
  }
  return undefined;
}

export interface MissingImageResolutionInput {
  addedFile?: File;
  sourceFolderHandle?: FileSystemDirectoryHandle;
}

/**
 * Resolves a missing image reference either from a directly-added file, or
 * by searching a granted folder handle (walked recursively). Returns one
 * AssetDraft per referencing entity (sharing the same content hash, so
 * WebVaultWriter's content-addressed storage naturally dedupes them into a
 * single stored file) — or null when the image remains unresolved.
 */
export async function resolveMissingImage(
  ref: MissingImageReference,
  input: MissingImageResolutionInput,
): Promise<AssetDraft[] | null> {
  let file: File | Blob | undefined = input.addedFile;

  if (!file && input.sourceFolderHandle) {
    file = await findFileInFolder(input.sourceFolderHandle, ref.path);
  }

  if (!file) return null;

  const hash = await hashOf(file);
  const item: DroppedItem = { relativePath: ref.path, file };
  return ref.referencedBy.map((sourcePath) =>
    buildAssetDraft(item, sourcePath, hash),
  );
}

async function findFileInFolder(
  dir: FileSystemDirectoryHandle,
  targetPath: string,
): Promise<File | undefined> {
  const targetName = fileNameOf(targetPath);

  async function walk(
    handle: FileSystemDirectoryHandle,
  ): Promise<File | undefined> {
    for await (const entry of handle.values()) {
      if (entry.kind === "file") {
        if (entry.name === targetName) {
          return (entry as FileSystemFileHandle).getFile();
        }
      } else if (entry.kind === "directory") {
        const found = await walk(entry as FileSystemDirectoryHandle);
        if (found) return found;
      }
    }
    return undefined;
  }

  return walk(dir);
}
