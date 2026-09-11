/**
 * Title and identifier rules for import.
 *
 * `normaliseTitle` is deliberately shared with connection resolution: if
 * collision detection were stricter than resolution, an import could create
 * two entities whose titles resolution cannot tell apart, permanently
 * poisoning every later import into that vault (research R5).
 */

/** Case-folded, whitespace-trimmed form used for every title comparison. */
export function normaliseTitle(title: string): string {
  return title.trim().toLowerCase();
}

export interface ResolvedTitle {
  finalTitle: string;
  renamed: boolean;
}

/**
 * Keeps the title unless the target vault already holds it, in which case a
 * `(2)` suffix is appended and incremented until free (FR-013a).
 */
export function resolveTitle(
  desired: string,
  taken: Iterable<string>,
): ResolvedTitle {
  const takenSet = new Set<string>();
  for (const title of taken) takenSet.add(normaliseTitle(title));

  if (!takenSet.has(normaliseTitle(desired))) {
    return { finalTitle: desired, renamed: false };
  }

  let counter = 2;
  let candidate = `${desired} (${counter})`;
  while (takenSet.has(normaliseTitle(candidate))) {
    counter += 1;
    candidate = `${desired} (${counter})`;
  }
  return { finalTitle: candidate, renamed: true };
}

/** Vault-style identifier slug, matching the app's own `sanitizeId` shape. */
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug.length > 0 ? slug : "entity";
}

/**
 * Mints an identifier free within the target vault. Import must never land on
 * an existing id, because that is what would turn rollback from "delete what we
 * created" into destroying someone's entity (FR-013, invariant J2).
 */
export function mintUniqueId(title: string, takenIds: Set<string>): string {
  const base = slugify(title);
  if (!takenIds.has(base)) return base;

  let counter = 2;
  while (takenIds.has(`${base}-${counter}`)) counter += 1;
  return `${base}-${counter}`;
}
