import type { Entity, PresentationTemplate, StatSheetTemplate } from "schema";
import { vault } from "$lib/stores/vault.svelte";
import { statSheetTemplates } from "$lib/stores/stat-sheet-templates.svelte";
import { presentationTemplates } from "$lib/stores/presentation-templates.svelte";
import { getDB } from "$lib/utils/idb";
import { ShelfStore } from "./shelf.svelte";
import type { ShelfVaultDeps } from "./web-shelf-vault";

export { ShelfStore } from "./shelf.svelte";
export { IdbShelfStore, idbShelfStore } from "./idb-shelf-store";
export { WebShelfVault, vaultRecordCodec } from "./web-shelf-vault";
export type { ShelfVaultDeps } from "./web-shelf-vault";

/**
 * Templates are written record-for-record rather than through the stores'
 * authoring helpers, which mint their own ids and timestamps. An imported
 * template has to land exactly as planned — the journal names the ids it will
 * roll back, so a store that quietly chose a different one would leave the
 * rollback list pointing at nothing.
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

  saveStatSheetTemplate: async (template: StatSheetTemplate) => {
    const vaultId = vault.activeVaultId;
    if (!vaultId) throw new Error("No vault is open.");
    const db = await getDB();
    await db.put("stat_sheet_templates", { ...template, vaultId });
    statSheetTemplates.templates = [
      ...statSheetTemplates.templates.filter((t) => t.id !== template.id),
      template,
    ];
  },
  savePresentationTemplate: async (template: PresentationTemplate) => {
    const vaultId = vault.activeVaultId;
    if (!vaultId) throw new Error("No vault is open.");
    const db = await getDB();
    await db.put("stat_sheet_presentation_templates", { ...template, vaultId });
    presentationTemplates.templates = [
      ...presentationTemplates.templates.filter((t) => t.id !== template.id),
      { ...template, vaultId },
    ];
  },

  deleteStatSheetTemplate: async (id: string) => {
    const db = await getDB();
    await db.delete("stat_sheet_templates", id);
    statSheetTemplates.templates = statSheetTemplates.templates.filter(
      (t) => t.id !== id,
    );
  },
  deletePresentationTemplate: async (id: string) => {
    const db = await getDB();
    await db.delete("stat_sheet_presentation_templates", id);
    presentationTemplates.templates = presentationTemplates.templates.filter(
      (t) => t.id !== id,
    );
  },
};

/** The Shelf, shared by every vault in this browser. */
export const shelf = new ShelfStore({ vault: vaultDeps });
