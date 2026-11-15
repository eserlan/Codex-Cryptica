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

export async function loadAdventurePackage(
  io: AdventurePackageFileIO,
  documentHash: string,
): Promise<AdventureSourcePackage | null> {
  const path = getAdventurePackagePath(documentHash);
  if (!(await io.exists(path))) {
    return null;
  }
  const raw = await io.read(path);
  return AdventureSourcePackageSchema.parse(JSON.parse(raw));
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

export async function saveAdventurePackage(
  io: AdventurePackageFileIO,
  pkg: AdventureSourcePackage,
): Promise<SaveAdventurePackageResult> {
  const validated = AdventureSourcePackageSchema.parse(pkg);
  const path = getAdventurePackagePath(validated.documentHash);

  if (await io.exists(path)) {
    const existingRaw = await io.read(path);
    const existing = AdventureSourcePackageSchema.parse(
      JSON.parse(existingRaw),
    );
    return {
      status: "deduplicated",
      path,
      package: existing,
    };
  }

  if (!io.remove) {
    throw new Error(
      "Adventure package storage must support removal before a package can be written safely.",
    );
  }

  const serialized = JSON.stringify(validated, null, 2);
  try {
    await io.write(path, serialized);
    const written = await io.read(path);
    const reparsed = AdventureSourcePackageSchema.parse(JSON.parse(written));
    return {
      status: "created",
      path,
      package: reparsed,
    };
  } catch (error) {
    try {
      await io.remove(path);
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
