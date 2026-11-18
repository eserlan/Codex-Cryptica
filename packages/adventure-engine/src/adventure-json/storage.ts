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
  writeAdventurePackageAtomically,
  type AdventurePackageFileIO,
} from "../source-package/storage";

/** 10 MiB local guard before reading an Adventure JSON file into memory. */
export const MAX_ADVENTURE_JSON_BYTES = 10 * 1024 * 1024;
/** Maximum packages inspected while checking for an alternate pinned version. */
export const MAX_ALTERNATE_ADVENTURE_VERSIONS_TO_SCAN = 8;

export interface SaveAdventureJsonResult {
  status: "created" | "deduplicated";
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

function isNativeAdventureJsonRecord(raw: string): boolean {
  const parsed: unknown = JSON.parse(raw);
  return (
    !!parsed &&
    typeof parsed === "object" &&
    "formatVersion" in parsed &&
    parsed.formatVersion === ADVENTURE_JSON_V1_FORMAT_VERSION
  );
}

/**
 * Persists an approved `AdventureJsonV1` package atomically under
 * `.codex/adventures/packages/<canonicalHash>.json`.
 * Re-importing content whose canonical hash already exists deduplicates:
 * the stored file is returned untouched and nothing is written. If a native
 * record at that hash path has changed, re-importing the exact expected
 * content atomically restores it. A legacy approved record at the same hash
 * still rejects, so legacy baselines are never silently replaced.
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
    if (isNativeAdventureJsonRecord(existingRaw)) {
      const stored = assertValidAdventureJson(JSON.parse(existingRaw));
      const storedHash = await computeAdventureJsonHash(stored);
      if (storedHash === hash) {
        return { status: "deduplicated", path, hash, package: stored };
      }
    }
    if (
      !isNativeAdventureJsonRecord(existingRaw) &&
      isApprovedExistingRecord(existingRaw)
    ) {
      throw new Error(
        `Adventure package "${hash}" is already approved and cannot be modified.`,
      );
    }
  }

  const serialized = JSON.stringify(validated, null, 2);
  const reparsed = await writeAdventurePackageAtomically(
    io,
    path,
    existingRaw,
    serialized,
    async (written) => {
      const candidate = assertValidAdventureJson(JSON.parse(written));
      const reparsedHash = await computeAdventureJsonHash(candidate);
      if (reparsedHash !== hash) {
        throw new Error(
          `Adventure package hash mismatch after write: expected ${hash}, found ${reparsedHash}.`,
        );
      }
      return candidate;
    },
  );
  return {
    status: "created",
    path,
    hash,
    package: reparsed,
  };
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

/**
 * Checks a bounded number of packages without retaining the full approved
 * package collection. `null` means the bound was reached before the answer
 * could be determined.
 */
export async function hasOtherApprovedAdventureVersion(
  io: AdventurePackageFileIO,
  packageId: string,
  excludedHash: string,
): Promise<boolean | null> {
  const hashes = await listAdventurePackageHashes(io);
  let scanned = 0;
  for (const hash of hashes) {
    if (hash === excludedHash) continue;
    if (scanned >= MAX_ALTERNATE_ADVENTURE_VERSIONS_TO_SCAN) return null;
    scanned += 1;
    try {
      const loaded = await loadStoredAdventurePackage(io, hash);
      if (loaded?.package.id === packageId) return true;
    } catch {
      // One corrupt package should not hide other available versions.
    }
  }
  return false;
}
