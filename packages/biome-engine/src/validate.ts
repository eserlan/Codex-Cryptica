import { BIOME_OWN_TEXT_MAX, type BiomeProfile } from "./model";

export const BIOME_TITLE_MAX = 120;

export type ValidationCode =
  | "title-required"
  | "title-too-long"
  | "text-too-long"
  | "alteration-description-required";

export interface ValidationError {
  code: ValidationCode;
  message: string;
  field?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  alterationId?: string;
}

export type ValidationResult =
  | { ok: true; warnings: ValidationWarning[] }
  | { ok: false; errors: ValidationError[] };

const TEXT_FIELDS = [
  "terrain",
  "vegetation",
  "water",
  "pressures",
  "notes",
] as const;

/** Errors block a save. Warnings are reminders and never block it. */
export function validateForSave(
  title: string,
  profile: BiomeProfile,
): ValidationResult {
  const errors: ValidationError[] = [];
  const trimmed = title.trim();

  if (trimmed.length === 0) {
    errors.push({
      code: "title-required",
      message: "Give your biome a name before saving.",
      field: "title",
    });
  } else if (trimmed.length > BIOME_TITLE_MAX) {
    errors.push({
      code: "title-too-long",
      message: `Names can be up to ${BIOME_TITLE_MAX} characters.`,
      field: "title",
    });
  }

  for (const field of TEXT_FIELDS) {
    if (profile.own[field].length > BIOME_OWN_TEXT_MAX) {
      errors.push({
        code: "text-too-long",
        message: `This can be up to ${BIOME_OWN_TEXT_MAX} characters.`,
        field,
      });
    }
  }

  const warnings: ValidationWarning[] = [];
  for (const alteration of profile.alterations) {
    if (alteration.description.trim().length === 0) {
      errors.push({
        code: "alteration-description-required",
        message: "Describe what is different, or remove this fictional change.",
        field: `alteration:${alteration.id}`,
      });
    } else if (alteration.cause.trim().length === 0) {
      warnings.push({
        code: "alteration-missing-cause",
        message:
          "Say what causes this change, and what follows from it, so it stays believable. You can save without it.",
        alterationId: alteration.id,
      });
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, warnings };
}
