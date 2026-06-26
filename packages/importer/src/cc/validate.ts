import {
  CCImportPackageSchema,
  SUPPORTED_VERSIONS,
  type CCImportPackage,
  type ImportWarning,
} from "./package";

export interface ValidateOptions {
  acceptedVersions?: string[];
}

export interface ValidationError {
  path: string[];
  code: string;
  message: string;
  ref?: string;
}

export type ValidateResult =
  | { ok: true; value: CCImportPackage; warnings: ImportWarning[] }
  | { ok: false; errors: ValidationError[] };

export function validatePackage(
  input: unknown,
  opts: ValidateOptions = {},
): ValidateResult {
  const accepted = opts.acceptedVersions ?? SUPPORTED_VERSIONS;
  const errors: ValidationError[] = [];
  const warnings: ImportWarning[] = [];

  const parsed = CCImportPackageSchema.safeParse(input);

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({
        path: issue.path.map(String),
        code: issue.code,
        message: issue.message,
      });
    }
    // Still check version so UNSUPPORTED_VERSION is always included when applicable.
  }

  // Check version separately so it is collected alongside any other errors.
  if (
    typeof input === "object" &&
    input !== null &&
    "version" in input &&
    typeof (input as Record<string, unknown>).version === "string" &&
    !(accepted as string[]).includes(
      (input as Record<string, unknown>).version as string,
    )
  ) {
    errors.push({
      path: ["version"],
      code: "UNSUPPORTED_VERSION",
      message: `Version "${(input as Record<string, unknown>).version}" is not supported. Accepted: ${accepted.join(", ")}`,
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // parsed.success is guaranteed here since errors.length === 0
  const pkg = parsed.data!;

  // Check for duplicate sourceIds within entityDrafts
  const seenIds = new Map<string, number>();
  for (const draft of pkg.entityDrafts) {
    if (draft.sourceId !== undefined) {
      const count = (seenIds.get(draft.sourceId) ?? 0) + 1;
      seenIds.set(draft.sourceId, count);
    }
  }
  for (const [id, count] of seenIds.entries()) {
    if (count > 1) {
      warnings.push({
        code: "DUPLICATE_SOURCE_ID",
        message: `sourceId "${id}" appears ${count} times in entityDrafts`,
        ref: id,
      });
    }
  }

  return { ok: true, value: pkg, warnings };
}
