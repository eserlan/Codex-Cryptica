/**
 * Stock artwork that a source system fills in when an entry has no picture of
 * its own. It says nothing about the entity, and a vault of a few hundred of
 * them spends most of its image loading time drawing the same handful of icons,
 * so a node showing one is better served by the entity's silhouette.
 */
const PLACEHOLDER_IMAGE_PATTERNS: readonly RegExp[] = [
  // Scabard's per-category icons, e.g. /images/cross_categories/event.png
  /^https?:\/\/(?:www\.)?scabard\.com\/images\/cross_categories\/[a-z0-9_-]+\.(?:png|jpe?g|webp|gif|svg)(?:[?#].*)?$/i,
];

export function isPlaceholderImageUrl(url: string | null | undefined): boolean {
  const value = url?.trim();
  if (!value) return false;
  return PLACEHOLDER_IMAGE_PATTERNS.some((pattern) => pattern.test(value));
}
