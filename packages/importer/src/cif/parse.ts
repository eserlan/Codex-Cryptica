import { CifManifestSchema, CIF_FORMAT, type CifManifest } from "./package";
import type { CifValidationError } from "./package";

export interface CifFileInput {
  fileName: string;
  size: number;
  text(): Promise<string>;
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
      return {
        ok: false,
        errors: [
          {
            code: "unsupported-version",
            message: `This package's CIF version isn't supported by this app.`,
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
