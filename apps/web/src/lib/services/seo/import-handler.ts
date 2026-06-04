import { z } from "zod";
import { vault } from "$lib/stores/vault.svelte";
import { vaultRegistry } from "$lib/stores/vault-registry.svelte";

export const ImportDraftSchema = z.object({
  type: z.enum([
    "character",
    "creature",
    "location",
    "item",
    "event",
    "faction",
    "note",
  ]),
  title: z.string().min(1),
  content: z.string().default(""),
  lore: z.string().optional(),
  labels: z.array(z.string()).default(["imported-draft"]),
  status: z.enum(["active", "draft"]).default("active"),
});

export type ImportDraft = z.infer<typeof ImportDraftSchema>;

export class SeoImportService {
  constructor(
    private vaultStore = vault,
    private registryStore = vaultRegistry,
  ) {}

  /**
   * Checks if there is a pending draft in localStorage and imports it.
   * Returns the ID of the created entity, or null if no import occurred.
   */
  async checkAndHandlePendingImport(): Promise<string | null> {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return null;
    }

    const payload = localStorage.getItem("__codex_pending_import");
    if (!payload) {
      return null;
    }

    try {
      // Parse & Validate
      const rawData = JSON.parse(payload);
      const draft = ImportDraftSchema.parse(rawData);

      // Clean up localStorage immediately to prevent double-import on reload
      localStorage.removeItem("__codex_pending_import");

      // Ensure a vault is active
      if (!this.vaultStore.isInitialized) {
        await this.vaultStore.init();
      }

      if (!this.vaultStore.activeVaultId) {
        await this.registryStore.init();
        if (this.registryStore.availableVaults.length === 0) {
          const newVaultId =
            await this.registryStore.createVault("My Codex Vault");
          await this.vaultStore.switchVault(newVaultId);
        } else {
          await this.vaultStore.switchVault(
            this.registryStore.availableVaults[0].id,
          );
        }
      }

      // Check for duplicate entity title and append suffix if necessary
      let title = draft.title;
      let counter = 1;
      const entities = this.vaultStore.entities;
      const titleLower = title.toLowerCase();

      // Check if duplicate title exists in active vault
      const isDuplicate = Object.values(entities).some(
        (e) => e.title.toLowerCase() === titleLower,
      );

      if (isDuplicate) {
        let uniqueTitle = title;
        while (
          Object.values(this.vaultStore.entities).some(
            (e) => e.title.toLowerCase() === uniqueTitle.toLowerCase(),
          )
        ) {
          uniqueTitle = `${title} (Imported${counter > 1 ? ` ${counter}` : ""})`;
          counter++;
        }
        title = uniqueTitle;
      }

      // Import entity to the vault
      const entityId = await this.vaultStore.createEntity(draft.type, title, {
        content: draft.content,
        lore: draft.lore || "",
        labels: draft.labels,
        status: draft.status,
      });

      // Select the imported entity
      this.vaultStore.selectedEntityId = entityId;

      return entityId;
    } catch (err) {
      console.error("Failed to parse and import pending SEO draft:", err);
      // Clean up localStorage anyway to avoid stuck alert/loop
      localStorage.removeItem("__codex_pending_import");
      return null;
    }
  }
}

export const seoImportService = new SeoImportService();
