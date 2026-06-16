import { z } from "zod";
import { vault } from "$lib/stores/vault.svelte";
import { vaultRegistry } from "$lib/stores/vault-registry.svelte";
import { browserStorage, type StorageLike } from "$lib/utils/runtime-deps";

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
    private storage: StorageLike = browserStorage,
  ) {}

  /**
   * Checks if there is a pending draft in localStorage and imports it.
   * Returns the ID of the created entity, or null if no import occurred.
   */
  async checkAndHandlePendingImport(): Promise<string | null> {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return null;
    }

    // Clean up UTM query parameters from the address bar if present
    if (window.history && window.location.search.includes("utm_source")) {
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    const payload = this.storage.getItem("__codex_pending_import");
    if (!payload) {
      return null;
    }

    try {
      // Parse & Validate
      const rawData = JSON.parse(payload);

      let drafts: ImportDraft[] = [];
      if (Array.isArray(rawData)) {
        drafts = z.array(ImportDraftSchema).parse(rawData);
      } else {
        drafts = [ImportDraftSchema.parse(rawData)];
      }

      if (drafts.length === 0) {
        this.storage.removeItem("__codex_pending_import");
        return null;
      }

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

      // title → entityId map for wiring [[wiki links]] after creation
      const titleToId = new Map<string, string>();
      let lastImportedId: string | null = null;

      try {
        for (const draft of drafts) {
          // Check for duplicate entity title and append suffix if necessary
          let title = draft.title;
          let counter = 1;
          const titleLower = title.toLowerCase();

          const isDuplicate = Object.values(this.vaultStore.entities).some(
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

          const entityId = await this.vaultStore.createEntity(
            draft.type,
            title,
            {
              content: draft.content,
              lore: draft.lore || "",
              labels: draft.labels,
              status: draft.status,
            },
          );

          titleToId.set(title.toLowerCase(), entityId);
          // Also index by original draft title in case it was de-duped
          titleToId.set(draft.title.toLowerCase(), entityId);
          lastImportedId = entityId;
        }
      } finally {
        // Remove only after all creates attempted — if we fail mid-loop the
        // user at least gets the entities that succeeded; clear to prevent
        // double-import on any subsequent load.
        this.storage.removeItem("__codex_pending_import");
      }

      // Wire [[wiki links]] between imported entities
      for (const draft of drafts) {
        const sourceId = titleToId.get(draft.title.toLowerCase());
        if (!sourceId || !draft.content) continue;

        const wikiLinkPattern = /\[\[([^\]]+)\]\]/g;
        let match: RegExpExecArray | null;
        while ((match = wikiLinkPattern.exec(draft.content)) !== null) {
          const targetId = titleToId.get(match[1].toLowerCase());
          if (targetId && targetId !== sourceId) {
            try {
              await this.vaultStore.addConnection(
                sourceId,
                targetId,
                "references",
                match[1],
              );
            } catch {
              // Non-fatal: link wiring is best-effort
            }
          }
        }
      }

      // Select the last imported entity
      if (lastImportedId) {
        this.vaultStore.selectedEntityId = lastImportedId;
      }

      return lastImportedId;
    } catch (err) {
      console.error("Failed to parse and import pending SEO draft:", err);
      this.storage.removeItem("__codex_pending_import");
      return null;
    }
  }
}

export const seoImportService = new SeoImportService();
