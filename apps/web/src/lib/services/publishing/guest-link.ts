import { basePath } from "#lib/utils/base-path.js";

/**
 * Shareable deep link to an entity in a published guest world.
 * Resolved by the /guest/[publishId] route via the `entity` query param.
 */
export function buildGuestEntityUrl(
  publishId: string,
  entityId: string,
  origin: string = typeof location !== "undefined" ? location.origin : "",
): string {
  return `${origin}${basePath()}/guest/${encodeURIComponent(publishId)}?entity=${encodeURIComponent(entityId)}`;
}

/** Copy the shareable guest entity link to the clipboard. */
export async function copyGuestEntityLink(
  publishId: string,
  entityId: string,
): Promise<void> {
  await navigator.clipboard.writeText(buildGuestEntityUrl(publishId, entityId));
}
