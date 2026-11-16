import { parseAdventureMarkdown } from "./parser";
import {
  AdventureSourcePackageSchema,
  type AdventureImportError,
  type AdventureSourcePackage,
} from "./schema";

export const ADVENTURE_PACKAGES_DIR = ".codex/adventures/packages" as const;

export interface AdventurePackageFileIO {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  list(dir: string): Promise<string[]>;
  remove?(path: string): Promise<void>;
}

export interface SaveAdventurePackageResult {
  status: "created" | "deduplicated";
  path: string;
  package: AdventureSourcePackage;
}

export type ImportAndSaveResult =
  | ({ ok: true } & SaveAdventurePackageResult)
  | { ok: false; error: AdventureImportError };

export function getAdventurePackagePath(documentHash: string): string {
  if (!/^[a-f0-9]{64}$/.test(documentHash)) {
    throw new Error(`Invalid adventure document hash: "${documentHash}"`);
  }
  return `${ADVENTURE_PACKAGES_DIR}/${documentHash}.json`;
}

function parseStoredPackage(
  raw: string,
  expectedHash: string,
): AdventureSourcePackage {
  const pkg = AdventureSourcePackageSchema.parse(JSON.parse(raw));
  if (pkg.documentHash !== expectedHash) {
    throw new Error(
      `Adventure package hash mismatch: expected ${expectedHash}, found ${pkg.documentHash}.`,
    );
  }
  return pkg;
}

export async function loadAdventurePackage(
  io: AdventurePackageFileIO,
  documentHash: string,
): Promise<AdventureSourcePackage | null> {
  const path = getAdventurePackagePath(documentHash);
  if (!(await io.exists(path))) {
    return null;
  }
  const raw = await io.read(path);
  return parseStoredPackage(raw, documentHash);
}

export async function listAdventurePackageHashes(
  io: AdventurePackageFileIO,
): Promise<string[]> {
  const entries = await io.list(ADVENTURE_PACKAGES_DIR);
  return entries
    .map((entry) => entry.replace(/^.*\//, ""))
    .filter((name) => /^[a-f0-9]{64}\.json$/.test(name))
    .map((name) => name.slice(0, -5));
}

export function approveAdventurePackage(
  pkg: AdventureSourcePackage,
): AdventureSourcePackage {
  const validated = AdventureSourcePackageSchema.parse(pkg);
  return AdventureSourcePackageSchema.parse({
    ...validated,
    status: "approved",
  });
}

export async function writeAdventurePackageAtomically<T>(
  io: AdventurePackageFileIO,
  path: string,
  existingRaw: string | null,
  serialized: string,
  verify: (written: string) => T | Promise<T>,
): Promise<T> {
  if (existingRaw === null && !io.remove) {
    throw new Error(
      "Adventure package storage must support removal before a package can be written safely.",
    );
  }

  try {
    await io.write(path, serialized);
    const written = await io.read(path);
    return await verify(written);
  } catch (error) {
    try {
      if (existingRaw !== null) {
        await io.write(path, existingRaw);
      } else if (io.remove) {
        await io.remove(path);
      }
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        `Adventure package write failed and rollback also failed: ${String(cleanupError)}`,
        { cause: cleanupError },
      );
    }
    throw error;
  }
}

export async function saveAdventurePackage(
  io: AdventurePackageFileIO,
  pkg: AdventureSourcePackage,
): Promise<SaveAdventurePackageResult> {
  const validated = AdventureSourcePackageSchema.parse(pkg);
  const path = getAdventurePackagePath(validated.documentHash);

  let existingRaw: string | null = null;
  if (await io.exists(path)) {
    existingRaw = await io.read(path);
    const existing = parseStoredPackage(existingRaw, validated.documentHash);
    if (existing.status === "approved") {
      throw new Error(
        `Adventure package "${validated.documentHash}" is already approved and cannot be modified.`,
      );
    }
    if (validated.status === "draft") {
      return {
        status: "deduplicated",
        path,
        package: existing,
      };
    }
  }

  const serialized = JSON.stringify(validated, null, 2);
  const reparsed = await writeAdventurePackageAtomically(
    io,
    path,
    existingRaw,
    serialized,
    (written) => parseStoredPackage(written, validated.documentHash),
  );
  return {
    status: "created",
    path,
    package: reparsed,
  };
}

export async function importAndSaveAdventureMarkdown(
  io: AdventurePackageFileIO,
  rawContent: string | Uint8Array,
  options: { fileName: string },
): Promise<ImportAndSaveResult> {
  const parsed = await parseAdventureMarkdown(rawContent, options);
  if (!parsed.ok) {
    return parsed;
  }
  const saved = await saveAdventurePackage(io, parsed.package);
  return { ok: true, ...saved };
}
