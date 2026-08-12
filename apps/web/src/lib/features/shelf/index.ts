import type { Entity, PresentationTemplate, StatSheetTemplate } from "schema";
import { vault } from "$lib/stores/vault.svelte";
import { statSheetTemplates } from "$lib/stores/stat-sheet-templates.svelte";
import { presentationTemplates } from "$lib/stores/presentation-templates.svelte";
import { ShelfStore } from "./shelf.svelte";
import type { ShelfVaultDeps } from "./web-shelf-vault";

export { ShelfStore } from "./shelf.svelte";
export { IdbShelfStore, idbShelfStore } from "./idb-shelf-store";
export { WebShelfVault, vaultRecordCodec } from "./web-shelf-vault";
export type { ShelfVaultDeps } from "./web-shelf-vault";

/**
 * Templates go through each store's `putTemplateRecord`, which writes a record
 * exactly as given rather than minting its own id like the authoring path
 * does. An imported template has to land under the identifier the import
 * planned for, because that is what its rollback journal names.
 */
const vaultDeps: ShelfVaultDeps = {
  activeVaultId: () => vault.activeVaultId ?? null,
  vaultHandle: async () => (await vault.getActiveVaultHandle()) ?? null,
  entities: () => vault.entities as Record<string, Entity>,
  createEntity: (type, title, initialData) =>
    vault.createEntity(type, title, initialData),
  deleteEntity: (id) => vault.deleteEntity(id),

  readStatSheetTemplate: (id) =>
    statSheetTemplates.allTemplates.find((t) => t.id === id) ?? null,
  readPresentationTemplate: (id) =>
    presentationTemplates.templates.find((t) => t.id === id) ?? null,

  saveStatSheetTemplate: (template: StatSheetTemplate) =>
    statSheetTemplates.putTemplateRecord(template),
  savePresentationTemplate: (template: PresentationTemplate) =>
    presentationTemplates.putTemplateRecord(template),

  deleteStatSheetTemplate: (id: string) =>
    statSheetTemplates.deleteTemplate(id),
  deletePresentationTemplate: (id: string) =>
    presentationTemplates.deleteTemplate(id),
};

/** The Shelf, shared by every vault in this browser. */
export const shelf = new ShelfStore({ vault: vaultDeps });
