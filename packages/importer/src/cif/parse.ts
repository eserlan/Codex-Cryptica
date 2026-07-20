import {
  CifManifestSchema,
  CIF_FORMAT,
  SUPPORTED_CIF_VERSIONS,
  type CifManifest,
} from "./package";
import type { CifValidationError } from "./package";
import { readCifZip, DEFAULT_CIF_ZIP_LIMITS, type CifZipLimits } from "./zip";

export interface CifFileInput {
  fileName: string;
  size: number;
  text(): Promise<string>;
  /** Raw bytes, required to read ZIP packages. Browser `File` satisfies this. */
  bytes?(): Promise<Uint8Array>;
}

export interface CifParseOptions {
  /** Manifest size guard (FR-005). Default 20 MB. */
  maxManifestBytes?: number;
}

export type CifParseResult =
  | { ok: true; manifest: CifManifest }
  | { ok: false; errors: CifValidationError[] };

export const DEFAULT_MAX_MANIFEST_BYTES = 20 * 1024 * 1024;

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

function looksLikeZip(text: string): boolean {
  // Cheap sniff on the first few characters' char codes; a real ZIP is binary
  // and its magic bytes never form valid leading JSON whitespace/braces.
  for (let i = 0; i < ZIP_MAGIC.length; i++) {
    if (text.charCodeAt(i) !== ZIP_MAGIC[i]) return false;
  }
  return true;
}

/**
 * Parses and structurally validates a CIF file. Never throws: every failure
 * mode (malformed JSON, wrong format, unsupported ZIP, oversized input)
 * returns a coded, plain-language error (FR-003).
 */
export async function parseCifFile(
  input: CifFileInput,
  options: CifParseOptions = {},
): Promise<CifParseResult> {
  const maxManifestBytes =
    options.maxManifestBytes ?? DEFAULT_MAX_MANIFEST_BYTES;

  if (input.fileName.toLowerCase().endsWith(".cif.zip")) {
    return {
      ok: false,
      errors: [
        {
          code: "zip-not-supported",
          message:
            "ZIP packages (.cif.zip) with binary assets are not supported yet. Export a text-only .cif.json package instead.",
        },
      ],
    };
  }

  if (input.size > maxManifestBytes) {
    return {
      ok: false,
      errors: [
        {
          code: "oversized-manifest",
          message: `This file is ${input.size.toLocaleString()} bytes, which is over the ${maxManifestBytes.toLocaleString()}-byte limit for a CIF package.`,
        },
      ],
    };
  }

  const text = await input.text();

  if (looksLikeZip(text)) {
    return {
      ok: false,
      errors: [
        {
          code: "zip-not-supported",
          message:
            "This file looks like a ZIP archive. ZIP packages (.cif.zip) with binary assets are not supported yet.",
        },
      ],
    };
  }

  return parseManifestText(text);
}

/**
 * Result of parsing a full CIF package: the manifest plus, for ZIP packages,
 * the decompressed asset files and any paths outside the CIF layout.
 */
export type CifPackageParseResult =
  | {
      ok: true;
      manifest: CifManifest;
      zip?: { files: Map<string, Uint8Array>; ignoredPaths: string[] };
    }
  | { ok: false; errors: CifValidationError[] };

/**
 * Parses either package form: `.cif.json` (text-only) or `.cif.zip` (with
 * binary assets). Same guarantees as {@link parseCifFile}: never throws,
 * every failure is a coded plain-language error.
 */
export async function parseCifPackage(
  input: CifFileInput,
  options: CifParseOptions & { zipLimits?: CifZipLimits } = {},
): Promise<CifPackageParseResult> {
  const isZipName = input.fileName.toLowerCase().endsWith(".cif.zip");
  const zipLimits = options.zipLimits ?? DEFAULT_CIF_ZIP_LIMITS;

  if (!isZipName) {
    const result = await parseCifFile(input, options);
    if (result.ok || result.errors[0]?.code !== "zip-not-supported") {
      return result;
    }
    // A `.json`-named file with ZIP magic — fall through to the ZIP path.
  }

  if (!input.bytes) {
    return {
      ok: false,
      errors: [
        {
          code: "zip-bytes-unavailable",
          message:
            "This looks like a ZIP package, but its raw content couldn't be read in this context.",
        },
      ],
    };
  }

  const bytes = await input.bytes();
  const zipResult = readCifZip(bytes, zipLimits);
  if (!zipResult.ok) {
    return zipResult;
  }

  const maxManifestBytes =
    options.maxManifestBytes ?? DEFAULT_MAX_MANIFEST_BYTES;
  if (zipResult.contents.manifestText.length > maxManifestBytes) {
    return {
      ok: false,
      errors: [
        {
          code: "oversized-manifest",
          message: `This package's manifest.json is over the ${maxManifestBytes.toLocaleString()}-byte limit.`,
        },
      ],
    };
  }

  const manifestResult = parseManifestText(zipResult.contents.manifestText);
  if (!manifestResult.ok) {
    return manifestResult;
  }

  return {
    ok: true,
    manifest: manifestResult.manifest,
    zip: {
      files: zipResult.contents.files,
      ignoredPaths: zipResult.contents.ignoredPaths,
    },
  };
}

/** Shared manifest-text validation for both package forms. */
function parseManifestText(text: string): CifParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return {
      ok: false,
      errors: [
        {
          code: "malformed-json",
          message: `This file isn't valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
    };
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as Record<string, unknown>).format !== CIF_FORMAT
  ) {
    return {
      ok: false,
      errors: [
        {
          code: "not-cif",
          message: `This file doesn't declare the Codex Interchange Format ("format": "${CIF_FORMAT}"), so it can't be imported as CIF.`,
        },
      ],
    };
  }

  const result = CifManifestSchema.safeParse(parsed);
  if (!result.success) {
    const versionIssue = result.error.issues.find(
      (i) => i.path[0] === "version",
    );
    if (versionIssue) {
      const declaredVersion = String(
        (parsed as Record<string, unknown>).version ?? "unknown",
      );
      return {
        ok: false,
        errors: [
          {
            code: "unsupported-version",
            message: `This package declares CIF version "${declaredVersion}", but this app only supports version ${SUPPORTED_CIF_VERSIONS.join(", ")}.`,
          },
        ],
      };
    }
    return {
      ok: false,
      errors: result.error.issues.map((issue) => ({
        code: "invalid-structure",
        message: `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      })),
    };
  }

  return { ok: true, manifest: result.data };
}
