import {
  ADVENTURE_JSON_V1_FORMAT_VERSION,
  type AdventureJsonV1,
} from "./schema";
import { validateAdventureJson } from "./validator";
import { computeAdventureJsonHash } from "./canonical";
import { adventureSourcePackageToAdventureJson } from "./adapter";
import { AdventureSourcePackageSchema } from "../source-package/schema";
import {
  getAdventurePackagePath,
  listAdventurePackageHashes,
  type AdventurePackageFileIO,
} from "../source-package/storage";

/** 10 MiB local guard before reading an Adventure JSON file into memory. */
export const MAX_ADVENTURE_JSON_BYTES = 10 * 1024 * 1024;

export interface SaveAdventureJsonResult {
  status: "created";
  path: string;
  hash: string;
  package: AdventureJsonV1;
}

export interface StoredAdventurePackage {
  hash: string;
  path: string;
  package: AdventureJsonV1;
  originFormat: "adventure-json/v1" | "legacy-source-package";
}

function assertValidAdventureJson(pkg: unknown): AdventureJsonV1 {
  const result = validateAdventureJson(pkg);
  if (!result.ok) {
    const summary = result.errors.map((err) => err.message).join("; ");
    throw new Error(summary || "Invalid Adventure JSON package.");
  }
  return result.value;
}

function isApprovedExistingRecord(raw: string): boolean {
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") return false;
  if (
    "formatVersion" in parsed &&
    parsed.formatVersion === ADVENTURE_JSON_V1_FORMAT_VERSION
  ) {
    return true;
  }
  if ("schemaVersion" in parsed && parsed.schemaVersion === 1) {
    const legacy = AdventureSourcePackageSchema.safeParse(parsed);
    return legacy.success && legacy.data.status === "approved";
  }
  return false;
}

/**
 * Persists an approved `AdventureJsonV1` package atomically under
 * `.codex/adventures/packages/<canonicalHash>.json`.
 * Rejects overwriting any already-approved package at that hash.
 */
export async function saveApprovedAdventureJson(
  io: AdventurePackageFileIO,
  pkg: AdventureJsonV1,
): Promise<SaveAdventureJsonResult> {
  const validated = assertValidAdventureJson(pkg);
  const hash = await computeAdventureJsonHash(validated);
  const path = getAdventurePackagePath(hash);

  let existingRaw: string | null = null;
  if (await io.exists(path)) {
    existingRaw = await io.read(path);
    if (isApprovedExistingRecord(existingRaw)) {
      throw new Error(
        `Adventure package "${hash}" is already approved and cannot be modified.`,
      );
    }
  }

  if (existingRaw === null && !io.remove) {
    throw new Error(
      "Adventure package storage must support removal before a package can be written safely.",
    );
  }

  const serialized = JSON.stringify(validated, null, 2);
  try {
    await io.write(path, serialized);
    const written = await io.read(path);
    const reparsed = assertValidAdventureJson(JSON.parse(written));
    const reparsedHash = await computeAdventureJsonHash(reparsed);
    if (reparsedHash !== hash) {
      throw new Error(
        `Adventure package hash mismatch after write: expected ${hash}, found ${reparsedHash}.`,
      );
    }
    return {
      status: "created",
      path,
      hash,
      package: reparsed,
    };
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

/**
 * Loads a stored adventure package by hash. Supports both native `AdventureJsonV1`
 * files and legacy `AdventureSourcePackage` (`schemaVersion: 1`) files, normalizing
 * legacy records in memory without modifying them on disk.
 */
export async function loadStoredAdventurePackage(
  io: AdventurePackageFileIO,
  hash: string,
): Promise<StoredAdventurePackage | null> {
  const path = getAdventurePackagePath(hash);
  if (!(await io.exists(path))) {
    return null;
  }
  const raw = await io.read(path);
  const parsed: unknown = JSON.parse(raw);

  if (
    parsed &&
    typeof parsed === "object" &&
    "formatVersion" in parsed &&
    parsed.formatVersion === ADVENTURE_JSON_V1_FORMAT_VERSION
  ) {
    const validated = assertValidAdventureJson(parsed);
    const actualHash = await computeAdventureJsonHash(validated);
    if (actualHash !== hash) {
      throw new Error(
        `Adventure package hash mismatch: expected ${hash}, found ${actualHash}.`,
      );
    }
    return {
      hash,
      path,
      package: validated,
      originFormat: "adventure-json/v1",
    };
  }

  const legacy = AdventureSourcePackageSchema.parse(parsed);
  if (legacy.documentHash !== hash) {
    throw new Error(
      `Adventure package hash mismatch: expected ${hash}, found ${legacy.documentHash}.`,
    );
  }
  const adapted = assertValidAdventureJson(
    adventureSourcePackageToAdventureJson(legacy),
  );
  return {
    hash,
    path,
    package: adapted,
    originFormat: "legacy-source-package",
  };
}

/**
 * Lists all approved adventure packages stored in `.codex/adventures/packages/`,
 * including legacy approved `AdventureSourcePackage` records normalized to `AdventureJsonV1`.
 */
export async function listApprovedAdventurePackages(
  io: AdventurePackageFileIO,
): Promise<StoredAdventurePackage[]> {
  const hashes = await listAdventurePackageHashes(io);
  const results: StoredAdventurePackage[] = [];
  for (const hash of hashes) {
    try {
      const path = getAdventurePackagePath(hash);
      const raw = await io.read(path);
      if (!isApprovedExistingRecord(raw)) continue;
      const loaded = await loadStoredAdventurePackage(io, hash);
      if (loaded) results.push(loaded);
    } catch {
      // Skip corrupt or unreadable package files so one bad file does not hide others.
    }
  }
  return results;
}
