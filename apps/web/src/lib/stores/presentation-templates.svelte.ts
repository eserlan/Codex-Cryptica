import { getDB } from "../utils/idb";
import type { PresentationTemplate } from "schema";
import { vaultRegistry } from "./vault-registry.svelte";
import { type IdGenerator, systemIdGenerator } from "$lib/utils/runtime-deps";
import { getBuiltInPresentationTemplates } from "@codex/stat-sheet-engine";
import { statSheetTemplates } from "./stat-sheet-templates.svelte";

/**
 * Vault-scoped store for Markdown presentation templates
 * (152-stat-sheet-templates), mirroring StatSheetTemplateStore's
 * load/init/DI pattern (stat-sheet-templates.svelte.ts).
 */
export class PresentationTemplateStore {
  templates = $state<PresentationTemplate[]>([]);
  private _initPromise: Promise<void> | null = null;
  private idGenerator: IdGenerator;

  constructor(idGenerator: IdGenerator = systemIdGenerator) {
    this.idGenerator = idGenerator;
    if (typeof window !== "undefined") void this.init();
  }

  init(force = false): Promise<void> {
    if (this._initPromise && !force) return this._initPromise;
    const vaultId = vaultRegistry.activeVaultId;
    this._initPromise = vaultId ? this.load(vaultId) : Promise.resolve();
    return this._initPromise;
  }

  loadForVault(vaultId: string): Promise<void> {
    this._initPromise = this.load(vaultId);
    return this._initPromise;
  }

  private async load(vaultId: string) {
    try {
      const db = await getDB();
      this.templates = await db.getAllFromIndex(
        "stat_sheet_presentation_templates",
        "by-vault",
        vaultId,
      );
    } catch (e) {
      console.error("[PresentationTemplateStore] Failed to load templates:", e);
    }
  }

  /** Built-ins for a schema plus this vault's own templates targeting it,
   * exact-matched by `schemaTemplateId` (Clarifications: no cross-schema
   * reuse in V1). */
  availableTemplatesForSchema(
    schemaTemplateId: string,
  ): PresentationTemplate[] {
    return [
      ...getBuiltInPresentationTemplates(schemaTemplateId),
      ...this.templates.filter((t) => t.schemaTemplateId === schemaTemplateId),
    ];
  }

  findById(id: string): PresentationTemplate | null {
    const builtIn = this.templates.find((t) => t.id === id);
    if (builtIn) return builtIn;
    // Built-ins are namespaced by schema id (built-ins.ts), so a direct
    // lookup requires knowing the schema; callers resolving an unknown id
    // against a specific schema should prefer availableTemplatesForSchema.
    return null;
  }

  async saveTemplate(input: {
    id?: string;
    schemaTemplateId: string;
    name: string;
    description?: string | null;
    source: string;
    formatVersion: number;
  }): Promise<PresentationTemplate | null> {
    const vaultId = vaultRegistry.activeVaultId;
    if (!vaultId) return null;
    const now = new Date().toISOString();
    const existing = input.id
      ? this.templates.find((t) => t.id === input.id)
      : undefined;
    const template: PresentationTemplate = {
      id: input.id ?? `presentation-${this.idGenerator.uuid()}`,
      vaultId,
      schemaTemplateId: input.schemaTemplateId,
      name: input.name,
      description: input.description ?? null,
      source: input.source,
      formatVersion: input.formatVersion,
      isBuiltIn: false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    try {
      const db = await getDB();
      await db.put("stat_sheet_presentation_templates", template);
      this.templates = existing
        ? this.templates.map((t) => (t.id === template.id ? template : t))
        : [...this.templates, template];
      return template;
    } catch (e) {
      console.error("[PresentationTemplateStore] Failed to save template:", e);
      return null;
    }
  }

  /** Per-schema name uniqueness (Clarifications): appends " (2)", " (3)",
   * etc. until the name is free within `(vaultId, schemaTemplateId)`. */
  uniqueNameForSchema(desiredName: string, schemaTemplateId: string): string {
    const existingNames = new Set(
      this.templates
        .filter((t) => t.schemaTemplateId === schemaTemplateId)
        .map((t) => t.name),
    );
    if (!existingNames.has(desiredName)) return desiredName;
    let n = 2;
    while (existingNames.has(`${desiredName} (${n})`)) n++;
    return `${desiredName} (${n})`;
  }

  /** Deletes a vault-owned template. Per data-model.md Validation Rules: if
   * it was a schema's default, that default is reset (FR-017); any entity
   * override pointing at it is left as a now-dangling id, which
   * `resolvePresentationTemplate`/`isTemplateUsable` treat as invalid and
   * fall back on next render (no migration needed). */
  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const db = await getDB();
      await db.delete("stat_sheet_presentation_templates", id);
      const deleted = this.templates.find((t) => t.id === id);
      this.templates = this.templates.filter((t) => t.id !== id);
      if (
        deleted &&
        statSheetTemplates.getDefaultPresentationTemplateId(
          deleted.schemaTemplateId,
        ) === id
      ) {
        await statSheetTemplates.setDefaultPresentationTemplate(
          deleted.schemaTemplateId,
          null,
        );
      }
      return true;
    } catch (e) {
      console.error(
        "[PresentationTemplateStore] Failed to delete template:",
        e,
      );
      return false;
    }
  }
}

const PRESENTATION_TEMPLATE_STORE_KEY = "__codex_presentation_template_store__";
export const presentationTemplates: PresentationTemplateStore =
  (globalThis as any)[PRESENTATION_TEMPLATE_STORE_KEY] ??
  ((globalThis as any)[PRESENTATION_TEMPLATE_STORE_KEY] =
    new PresentationTemplateStore());
