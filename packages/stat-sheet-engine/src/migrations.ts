import type { PublicTemplatePackage } from "schema";
import {
  validateTemplatePackage,
  TemplatePackageValidationError,
} from "./template-package";

export function migrateTemplatePackage(input: unknown): PublicTemplatePackage {
  if (!input || typeof input !== "object") {
    throw new TemplatePackageValidationError(
      "Template package must be an object",
    );
  }
  const version = (input as { schemaVersion?: unknown }).schemaVersion;
  if (version !== 1) {
    throw new TemplatePackageValidationError(
      typeof version === "number" && version > 1
        ? `This template uses an unsupported newer format (v${version}).`
        : "This template uses an unsupported format.",
    );
  }
  return validateTemplatePackage(input);
}
