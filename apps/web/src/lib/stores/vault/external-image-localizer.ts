import type { LocalEntity } from "./types";

const EXTERNAL_URL = /^https?:\/\//i;

export interface ExternalImageLocalizerDeps {
  /** Only the image fields are read, so any entity record shape fits. */
  getEntity: (id: string) => { image?: string; thumbnail?: string } | undefined;
  importExternalImage: (
    url: string,
    entityId: string,
  ) => Promise<{ image: string; thumbnail: string } | null>;
  updateEntity: (id: string, updates: Partial<LocalEntity>) => unknown;
}

/** Whether an update links an entity to a new external image. */
export function linksNewExternalImage(
  previousImage: string | undefined,
  updates: Partial<LocalEntity>,
): string | null {
  const next = typeof updates.image === "string" ? updates.image.trim() : "";
  if (!EXTERNAL_URL.test(next) || next === previousImage?.trim()) return null;
  return next;
}

/**
 * Copies a newly linked external image into the vault and points the entity
 * at the local copy and its thumbnail, so it no longer depends on the remote
 * host and the graph paints a small image instead of a full photo.
 *
 * Runs after the link is saved; a user who changes the image again before the
 * download finishes keeps their newer choice. When the image cannot be copied
 * (no CORS, gone) the link stays, and the thumbnail follows it so a previous
 * image's thumbnail is not left showing.
 */
export async function localizeExternalImage(
  deps: ExternalImageLocalizerDeps,
  entityId: string,
  url: string,
): Promise<"localized" | "linked" | "superseded"> {
  const local = await deps.importExternalImage(url, entityId).catch(() => null);
  const current = deps.getEntity(entityId);
  if (!current || current.image?.trim() !== url) return "superseded";
  if (local) {
    await deps.updateEntity(entityId, local);
    return "localized";
  }
  if (current.thumbnail !== url) {
    await deps.updateEntity(entityId, { thumbnail: url });
  }
  return "linked";
}
