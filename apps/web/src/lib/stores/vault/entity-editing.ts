import type { Entity } from "schema";
import type { LocalEntity } from "./types";
import type { VaultStore } from "../vault.svelte";
import { statSheetTemplates } from "../stat-sheet-templates.svelte";
import { sessionModeStore } from "../ui/session-mode.svelte";
import {
  linksNewExternalImage,
  localizeExternalImage,
} from "./external-image-localizer";

type EditingVault = Pick<VaultStore, "entities"> & {
  entityStore: Pick<VaultStore["entityStore"], "createEntity" | "updateEntity">;
  assetStore: Pick<VaultStore["assetStore"], "importExternalImage">;
};

/** Entity defaults and the ordered queue of newly linked external images. */
export class VaultEntityEditing {
  private imageLocalization: Promise<unknown> = Promise.resolve();
  constructor(private vault: EditingVault) {}
  createEntity(
    type: Entity["type"],
    title: string,
    initialData: Partial<Entity> = {},
  ) {
    // Auto-apply the vault's configured default stat sheet template for this
    // category, unless the caller already supplied one (e.g. duplicating an
    // entity, or an import that carries its own statSheet).
    if (!initialData.statSheet) {
      const defaultFields =
        statSheetTemplates.getDefaultFieldsForCategory(type);
      if (defaultFields) {
        initialData = {
          ...initialData,
          statSheet: { templateId: null, fields: defaultFields },
        };
      }
    }
    return this.vault.entityStore.createEntity(type, title, initialData);
  }
  updateEntity(id: string, updates: Partial<LocalEntity>) {
    const linkedImage = sessionModeStore.isGuestMode
      ? null
      : linksNewExternalImage(this.vault.entities[id]?.image, updates);
    const result = this.vault.entityStore.updateEntity(id, updates);
    if (linkedImage) {
      // One at a time: a re-import can relink hundreds of images, and each
      // copy converts to WebP on the main thread.
      this.imageLocalization = this.imageLocalization
        .then(() => result)
        .then(() =>
          localizeExternalImage(
            {
              getEntity: (entityId) => this.vault.entities[entityId],
              importExternalImage: (url, entityId) =>
                this.vault.assetStore.importExternalImage(url, entityId),
              updateEntity: (entityId, patch) =>
                this.vault.entityStore.updateEntity(entityId, patch),
            },
            id,
            linkedImage,
          ),
        ) // A failed save or copy must not stall the images queued after it.
        .catch((error) =>
          console.warn("[Vault] Could not copy linked image", error),
        );
    }
    return result;
  }
}
