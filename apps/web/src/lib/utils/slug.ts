/**
 * Produces a readable ASCII route slug while preserving letters that use
 * accents or other combining marks through Unicode decomposition.
 */
export function toRouteSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
