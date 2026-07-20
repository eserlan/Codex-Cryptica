import { unzipSync } from "fflate";
import type { CifValidationError } from "./package";

/**
 * Bounded, validation-first reading of a `.cif.zip` package (Phase 2).
 *
 * Layout contract (docs/CODEX_INTERCHANGE_FORMAT.md): `manifest.json` at the
 * package root plus binary files under `assets/`. Everything else is
 * reported, never silently used. All limits are enforced before any asset
 * content is handed onward, and every failure mode is a coded, plain-language
 * error — this module never throws for malformed input.
 */
export interface CifZipLimits {
  /** Whole-archive cap (compressed file as given to us). */
  maxArchiveBytes: number;
  /** Cap on the number of files inside the archive. */
  maxFileCount: number;
  /** Per-file cap after decompression. */
  maxFileBytes: number;
}

export const DEFAULT_CIF_ZIP_LIMITS: CifZipLimits = {
  maxArchiveBytes: 250 * 1024 * 1024,
  maxFileCount: 512,
  maxFileBytes: 25 * 1024 * 1024,
};

export const CIF_ZIP_MANIFEST_NAME = "manifest.json";
export const CIF_ZIP_ASSET_PREFIX = "assets/";

export interface CifZipContents {
  manifestText: string;
  /** Decompressed files keyed by their archive path (e.g. "assets/lyra.png"). */
  files: Map<string, Uint8Array>;
  /** Paths that were present but outside the CIF layout (reported upstream). */
  ignoredPaths: string[];
}

export type CifZipResult =
  | { ok: true; contents: CifZipContents }
  | { ok: false; errors: CifValidationError[] };

/**
 * A safe CIF archive path is relative, forward-slash only, and can never
 * escape the package root ("..", absolute paths, drive letters, backslashes).
 */
export function isSafeCifZipPath(path: string): boolean {
  if (path.length === 0 || path.length > 1024) return false;
  if (path.startsWith("/") || path.includes("\\")) return false;
  if (/^[A-Za-z]:/.test(path)) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(path)) return false;
  const segments = path.split("/");
  return segments.every((s) => s.length > 0 && s !== "." && s !== "..");
}

function error(code: string, message: string): CifValidationError {
  return { code, message };
}

export function readCifZip(
  bytes: Uint8Array,
  limits: CifZipLimits = DEFAULT_CIF_ZIP_LIMITS,
): CifZipResult {
  if (bytes.byteLength > limits.maxArchiveBytes) {
    return {
      ok: false,
      errors: [
        error(
          "zip-too-large",
          `This package is ${bytes.byteLength.toLocaleString()} bytes, which is over the ${limits.maxArchiveBytes.toLocaleString()}-byte limit for a CIF ZIP package.`,
        ),
      ],
    };
  }

  let entries: Record<string, Uint8Array>;
  try {
    let fileCount = 0;
    entries = unzipSync(bytes, {
      filter: (file) => {
        // Directory markers don't count against the file budget.
        if (file.name.endsWith("/")) return false;
        fileCount++;
        if (fileCount > limits.maxFileCount) {
          throw new Error(`more than ${limits.maxFileCount} files`);
        }
        if (file.originalSize > limits.maxFileBytes) {
          throw new Error(
            `"${file.name}" is larger than the ${limits.maxFileBytes.toLocaleString()}-byte per-file limit`,
          );
        }
        return true;
      },
    });
  } catch (err) {
    return {
      ok: false,
      errors: [
        error(
          "zip-unreadable",
          `This ZIP archive couldn't be read: ${err instanceof Error ? err.message : String(err)}.`,
        ),
      ],
    };
  }

  const files = new Map<string, Uint8Array>();
  const ignoredPaths: string[] = [];
  let manifestText: string | null = null;

  for (const [path, content] of Object.entries(entries)) {
    // Defense in depth: the filter's originalSize comes from the ZIP header,
    // which a crafted archive can understate — re-check the real length.
    if (content.byteLength > limits.maxFileBytes) {
      return {
        ok: false,
        errors: [
          error(
            "zip-file-too-large",
            `"${path}" decompressed to ${content.byteLength.toLocaleString()} bytes, which is over the ${limits.maxFileBytes.toLocaleString()}-byte per-file limit.`,
          ),
        ],
      };
    }

    if (!isSafeCifZipPath(path)) {
      return {
        ok: false,
        errors: [
          error(
            "zip-unsafe-path",
            `"${path}" isn't a safe archive path (paths must be relative, use forward slashes, and stay inside the package).`,
          ),
        ],
      };
    }

    if (path === CIF_ZIP_MANIFEST_NAME) {
      manifestText = new TextDecoder("utf-8", { fatal: false }).decode(content);
    } else if (path.startsWith(CIF_ZIP_ASSET_PREFIX)) {
      files.set(path, content);
    } else {
      ignoredPaths.push(path);
    }
  }

  if (manifestText === null) {
    return {
      ok: false,
      errors: [
        error(
          "zip-missing-manifest",
          `This archive has no "${CIF_ZIP_MANIFEST_NAME}" at its root, so it isn't a CIF ZIP package.`,
        ),
      ],
    };
  }

  return { ok: true, contents: { manifestText, files, ignoredPaths } };
}

/** Hex-encoded SHA-256 of the given bytes (WebCrypto; available in browsers and Node ≥ 20). */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    bytes as BufferSource,
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
