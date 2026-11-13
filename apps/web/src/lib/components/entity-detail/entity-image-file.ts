import { vault } from "#lib/stores/vault.svelte.js";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
import { mapSession } from "#lib/stores/map-session.svelte.js";
import { debugStore } from "#lib/stores/debug.svelte.js";

export interface EntityImageFileDeps {
  saveImageToVault: (
    file: Blob,
    entityId: string,
  ) => Promise<{ image: string; thumbnail?: string }>;
  updateEntity: (
    id: string,
    patch: { image: string; thumbnail?: string },
  ) => Promise<unknown>;
  notify: (message: string, type: "error") => void;
}

const defaultDeps: EntityImageFileDeps = {
  saveImageToVault: (file, id) => vault.saveImageToVault(file, id),
  updateEntity: (id, patch) => vault.updateEntity(id, patch),
  notify: (message, type) => notificationStore.notify(message, type),
};

export type EntityImageFileResult =
  { ok: true; image: string } | { ok: false; error: string };

/** Checks a picked or dropped file is an image, saves it and sets it on the entity. */
export async function saveEntityImageFile(
  entityId: string,
  file: File,
  overrides: Partial<EntityImageFileDeps> = {},
): Promise<EntityImageFileResult> {
  const deps = { ...defaultDeps, ...overrides };
  if (!file.type.startsWith("image/")) {
    const error = "Choose an image file to upload.";
    deps.notify(error, "error");
    return { ok: false, error };
  }
  try {
    const { image, thumbnail } = await deps.saveImageToVault(file, entityId);
    await deps.updateEntity(entityId, { image, thumbnail });
    return { ok: true, image };
  } catch (err) {
    debugStore.error("[entity-image-file] Failed to save image:", err);
    const error = "Failed to save image. Please try again.";
    deps.notify(error, "error");
    return { ok: false, error };
  }
}

/** Opens the file picker and saves the chosen image on the entity. */
export function pickEntityImage(entityId: string) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) void saveEntityImageFile(entityId, file);
  };
  input.click();
}

export function showEntityImageToGuests(entity: {
  title: string;
  image?: string;
}) {
  if (!entity.image) return;
  if (mapSession.showImageToPlayers(entity.title, entity.image)) {
    notificationStore.notify("Shared image with guests", "success");
  }
}
