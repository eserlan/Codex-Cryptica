import { z } from "zod";

/**
 * The public entity template package: the only shape that ever leaves the
 * browser for a community listing, and the one the worker accepts and serves.
 *
 * It lives in `schema` (not `entity-template-engine`) because workers may only
 * import `schema`. The local package format is owned by `entity-template-engine`;
 * these constants must match it, which a test in `apps/web` asserts.
 */
export const ENTITY_TEMPLATE_PACKAGE_KIND = "entity-template";
export const ENTITY_TEMPLATE_FORMAT_VERSION = 1;

/** A local package as received: extra fields are tolerated and then dropped. */
const LocalPackageSchema = z.object({
  kind: z.literal(ENTITY_TEMPLATE_PACKAGE_KIND),
  formatVersion: z.number().int(),
  template: z
    .object({
      name: z.string(),
      entityType: z.string(),
      markdown: z.string(),
    })
    .passthrough(),
});

/** The only shape that ever leaves the browser for a community listing. */
export interface PublicEntityTemplatePackage {
  kind: typeof ENTITY_TEMPLATE_PACKAGE_KIND;
  formatVersion: number;
  template: { name: string; entityType: string; markdown: string };
}

export type PublicPackageResult =
  | { ok: true; package: PublicEntityTemplatePackage }
  | { ok: false; error: string };

/** Limits applied to a published template and its listing metadata. */
export const ENTITY_TEMPLATE_PUBLIC_LIMITS = {
  nameMax: 80,
  entityTypeMax: 60,
  descriptionMax: 500,
  bodyMax: 50_000,
  labelsMax: 8,
  labelMax: 30,
  displayNameMax: 80,
} as const;

export interface PublishMetadataIssue {
  field: "description" | "labels" | "ownerDisplayName";
  message: string;
}

const fail = (error: string): PublicPackageResult => ({ ok: false, error });

/**
 * Projects a local template package to the strict public shape. Unknown fields
 * (including the passthrough extras kept locally) are dropped, so nothing but
 * name, entity type and markdown can be published. The markdown is otherwise
 * untouched so an installed copy is byte-identical to what was published.
 * Pure. Never throws.
 */
export function toPublicEntityPackage(raw: unknown): PublicPackageResult {
  const parsed = LocalPackageSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("This is not a Codex Cryptica template.");
  }
  if (parsed.data.formatVersion > ENTITY_TEMPLATE_FORMAT_VERSION) {
    return fail(
      "This template was made with a newer version of Codex Cryptica. Update the app to use it.",
    );
  }

  const { name, entityType, markdown } = parsed.data.template;
  const trimmedName = name.trim();
  const type = entityType.trim().toLowerCase();

  if (!trimmedName) return fail("Give the template a name.");
  if (/[\r\n]/.test(trimmedName)) {
    return fail("Keep the name on a single line.");
  }
  if (trimmedName.length > ENTITY_TEMPLATE_PUBLIC_LIMITS.nameMax) {
    return fail(
      `Keep the name under ${ENTITY_TEMPLATE_PUBLIC_LIMITS.nameMax} characters.`,
    );
  }
  if (!type) return fail("Choose which type of entity this template is for.");
  if (type.length > ENTITY_TEMPLATE_PUBLIC_LIMITS.entityTypeMax) {
    return fail(
      `Keep the entity type under ${ENTITY_TEMPLATE_PUBLIC_LIMITS.entityTypeMax} characters.`,
    );
  }
  if (!markdown.trim()) {
    return fail("This template is empty, so there is nothing to share.");
  }
  if (markdown.length > ENTITY_TEMPLATE_PUBLIC_LIMITS.bodyMax) {
    return fail(
      "This template is too long to share. Shorten it and try again.",
    );
  }

  return {
    ok: true,
    package: {
      kind: ENTITY_TEMPLATE_PACKAGE_KIND,
      formatVersion: parsed.data.formatVersion,
      template: { name: trimmedName, entityType: type, markdown },
    },
  };
}

/** Trims labels and removes case-insensitive duplicates, keeping first spelling. */
export function normalizeEntityTemplateLabels(
  labels: readonly string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of labels) {
    const trimmed = label.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/** Returns plain-language problems with listing metadata; [] means valid. */
export function validateEntityTemplatePublishMetadata(input: {
  description: string;
  labels: readonly string[];
  ownerDisplayName?: string;
}): PublishMetadataIssue[] {
  const issues: PublishMetadataIssue[] = [];
  const description = input.description.trim();

  if (!description) {
    issues.push({
      field: "description",
      message:
        "Add a short description so people know what this template is for.",
    });
  } else if (
    description.length > ENTITY_TEMPLATE_PUBLIC_LIMITS.descriptionMax
  ) {
    issues.push({
      field: "description",
      message: `Keep the description under ${ENTITY_TEMPLATE_PUBLIC_LIMITS.descriptionMax} characters.`,
    });
  }

  const labels = normalizeEntityTemplateLabels(input.labels);
  if (labels.length === 0) {
    issues.push({
      field: "labels",
      message: "Add at least one label, such as a genre or game system.",
    });
  } else if (labels.length > ENTITY_TEMPLATE_PUBLIC_LIMITS.labelsMax) {
    issues.push({
      field: "labels",
      message: `Use at most ${ENTITY_TEMPLATE_PUBLIC_LIMITS.labelsMax} labels.`,
    });
  }
  if (
    labels.some(
      (label) => label.length > ENTITY_TEMPLATE_PUBLIC_LIMITS.labelMax,
    )
  ) {
    issues.push({
      field: "labels",
      message: `Keep each label under ${ENTITY_TEMPLATE_PUBLIC_LIMITS.labelMax} characters.`,
    });
  }

  const displayName = input.ownerDisplayName?.trim();
  if (
    displayName &&
    displayName.length > ENTITY_TEMPLATE_PUBLIC_LIMITS.displayNameMax
  ) {
    issues.push({
      field: "ownerDisplayName",
      message: `Keep the display name under ${ENTITY_TEMPLATE_PUBLIC_LIMITS.displayNameMax} characters.`,
    });
  }

  return issues;
}
