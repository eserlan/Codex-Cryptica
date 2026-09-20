import { BUILT_IN_STAT_SHEET_TEMPLATES } from "./stat-sheet-builtins";
import { getDB } from "../utils/idb";
import { type StatSheetTemplate, type StatSheetField } from "schema";
import { vaultRegistry } from "./vault-registry.svelte";
import { type IdGenerator, systemIdGenerator } from "$lib/utils/runtime-deps";
import {
  importTemplatePackage,
  validateFieldKeys,
} from "@codex/stat-sheet-engine";
import type { PublicTemplatePackage } from "schema";

export class StatSheetTemplateStore {
  templates = $state<StatSheetTemplate[]>([]);
  // Vault-scoped map of category id -> template id, applied automatically
  // when a new entity of that category is created.
  categoryDefaults = $state<Record<string, string>>({});
  // Vault-scoped list of enabled template IDs for active vault, or null if all enabled.
  enabledTemplateIds = $state<string[] | null>(null);
  // Vault-scoped map of schema-template id -> default presentation-template
  // id (152-stat-sheet-templates). Stored the same way as categoryDefaults
  // rather than as a field on the StatSheetTemplate record itself, since
  // built-in schema templates (BUILT_IN_STAT_SHEET_TEMPLATES) are plain
  // hardcoded objects, not IDB records, and this way works uniformly for
  // both built-in and vault-owned schema templates.
  presentationDefaults = $state<Record<string, string>>({});
  // Caches the in-flight/completed init() *promise* (not just a started
  // flag), so any caller that mutates state before the constructor's
  // fire-and-forget init() has finished can await the same load and avoid
  // a race where init() resolves later and clobbers their change.
  private _initPromise: Promise<void> | null = null;
  private idGenerator: IdGenerator;

  constructor(idGenerator: IdGenerator = systemIdGenerator) {
    this.idGenerator = idGenerator;
    if (typeof window !== "undefined") void this.init();
  }

  get allTemplates(): StatSheetTemplate[] {
    return [...BUILT_IN_STAT_SHEET_TEMPLATES, ...this.templates];
  }

  get availableTemplates(): StatSheetTemplate[] {
    if (!this.enabledTemplateIds) return this.allTemplates;
    const set = new Set(this.enabledTemplateIds);
    return this.allTemplates.filter((t) => set.has(t.id));
  }

  isTemplateEnabled(templateId: string): boolean {
    if (!this.enabledTemplateIds) return true;
    return this.enabledTemplateIds.includes(templateId);
  }

  // Best-effort, constructor-time attempt: `vaultRegistry.activeVaultId` is
  // itself hydrated asynchronously from IDB, so on a cold page load this
  // very often runs before it's set and silently no-ops (see `load`). The
  // reliable path is `loadForVault`, called explicitly once the active
  // vault is actually known (vault.svelte.ts init / vault switch), the same
  // pattern `themeStore.loadForVault` and `oracle.loadForVault` use.
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
      const all = await db.getAllFromIndex(
        "stat_sheet_templates",
        "by-vault",
        vaultId,
      );
      this.templates = all;
      const defaults = await db.get(
        "settings",
        `statSheetCategoryDefaults_${vaultId}`,
      );
      this.categoryDefaults = defaults ?? {};
      const enabled = await db.get(
        "settings",
        `statSheetEnabledTemplates_${vaultId}`,
      );
      this.enabledTemplateIds = enabled ?? null;
      const presentationDefaults = await db.get(
        "settings",
        `statSheetPresentationDefaults_${vaultId}`,
      );
      this.presentationDefaults = presentationDefaults ?? {};
    } catch (e) {
      console.error("[StatSheetTemplateStore] Failed to load templates:", e);
    }
  }

  async toggleTemplateEnabled(templateId: string): Promise<void> {
    await this.init();
    const vaultId = vaultRegistry.activeVaultId;
    if (!vaultId) return;

    const current =
      this.enabledTemplateIds ?? this.allTemplates.map((t) => t.id);
    const set = new Set(current);
    if (set.has(templateId)) {
      set.delete(templateId);
    } else {
      set.add(templateId);
    }
    const next = Array.from(set);
    this.enabledTemplateIds = next;

    const db = await getDB();
    await db.put("settings", next, `statSheetEnabledTemplates_${vaultId}`);
  }

  async setDefaultTemplate(category: string, templateId: string | null) {
    await this.init();
    const vaultId = vaultRegistry.activeVaultId;
    if (!vaultId) return;

    const next = { ...this.categoryDefaults };
    if (templateId) {
      next[category] = templateId;
    } else {
      delete next[category];
    }
    this.categoryDefaults = next;

    const db = await getDB();
    await db.put("settings", next, `statSheetCategoryDefaults_${vaultId}`);
  }

  getDefaultPresentationTemplateId(schemaTemplateId: string): string | null {
    return this.presentationDefaults[schemaTemplateId] ?? null;
  }

  async setDefaultPresentationTemplate(
    schemaTemplateId: string,
    presentationTemplateId: string | null,
  ): Promise<void> {
    await this.init();
    const vaultId = vaultRegistry.activeVaultId;
    if (!vaultId) return;

    const next = { ...this.presentationDefaults };
    if (presentationTemplateId) {
      next[schemaTemplateId] = presentationTemplateId;
    } else {
      delete next[schemaTemplateId];
    }
    this.presentationDefaults = next;

    const db = await getDB();
    await db.put("settings", next, `statSheetPresentationDefaults_${vaultId}`);
  }

  // Structural fields for the category's default template, or null if the
  // category has no default configured (or it points at a template that no
  // longer exists). Used to auto-populate new entities on creation.
  getDefaultFieldsForCategory(category: string): StatSheetField[] | null {
    const templateId = this.categoryDefaults[category];
    if (!templateId) return null;
    const template = this.allTemplates.find((t) => t.id === templateId);
    if (!template) return null;
    return this.cloneTemplateFields(template);
  }

  async saveAsTemplate(
    name: string,
    fields: StatSheetField[],
    options: { description?: string; category?: string } = {},
  ): Promise<StatSheetTemplate | null> {
    const vaultId = vaultRegistry.activeVaultId;
    if (!vaultId) return null;
    // #3180: never persist duplicate/malformed keys — the editor blocks
    // these at input time, this is the backstop for programmatic callers.
    if (validateFieldKeys(fields).length > 0) return null;

    const template: StatSheetTemplate = {
      id: `template-${this.idGenerator.uuid()}`,
      name,
      description: options.description,
      category: options.category,
      isBuiltIn: false,
      fields: fields.map(
        ({ value: _value, collapsed: _collapsed, ...rest }) => rest,
      ),
    };

    try {
      const db = await getDB();
      await db.put("stat_sheet_templates", { ...template, vaultId });
      this.templates = [...this.templates, template];
      return template;
    } catch (e) {
      console.error("[StatSheetTemplateStore] Failed to save template:", e);
      return null;
    }
  }

  async importPublicTemplate(
    pkg: PublicTemplatePackage,
    options: { name?: string; replaceId?: string } = {},
  ): Promise<StatSheetTemplate | null> {
    await this.init();
    const vaultId = vaultRegistry.activeVaultId;
    if (!vaultId) return null;
    const name = options.name?.trim() || pkg.template.name;
    const existing = this.templates.find(
      (template) => template.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (existing && !options.replaceId) return null;
    const imported = importTemplatePackage(pkg, {
      id: `template-${this.idGenerator.uuid()}`,
      name,
    });
    try {
      const db = await getDB();
      const tx = db.transaction("stat_sheet_templates", "readwrite");
      if (existing && options.replaceId === existing.id)
        await tx.store.delete(existing.id);
      await tx.store.put({ ...imported, vaultId });
      await tx.done;
      this.templates =
        existing && options.replaceId === existing.id
          ? this.templates.map((template) =>
              template.id === existing.id ? imported : template,
            )
          : [...this.templates, imported];
      return imported;
    } catch (e) {
      console.error("[StatSheetTemplateStore] Failed to import template:", e);
      return null;
    }
  }

  /**
   * Writes a template exactly as given, id and all.
   *
   * Distinct from `saveTemplate`, which is the authoring path and mints its
   * own id: an imported template has to land under the identifier the import
   * planned for, because that is what its rollback journal names (156-entity-shelf).
   */
  async putTemplateRecord(template: StatSheetTemplate): Promise<void> {
    const vaultId = vaultRegistry.activeVaultId;
    if (!vaultId) throw new Error("No vault is open.");
    const db = await getDB();
    await db.put("stat_sheet_templates", { ...template, vaultId });
    this.templates = [
      ...this.templates.filter((t) => t.id !== template.id),
      template,
    ];
  }

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const db = await getDB();
      await db.delete("stat_sheet_templates", id);
      this.templates = this.templates.filter((t) => t.id !== id);
      return true;
    } catch (e) {
      console.error("[StatSheetTemplateStore] Failed to delete template:", e);
      return false;
    }
  }

  async renameTemplate(id: string, name: string): Promise<boolean> {
    const vaultId = vaultRegistry.activeVaultId;
    const existing = this.templates.find((t) => t.id === id);
    if (!vaultId || !existing) return false;

    const updated: StatSheetTemplate = { ...$state.snapshot(existing), name };
    try {
      const db = await getDB();
      await db.put("stat_sheet_templates", { ...updated, vaultId });
      this.templates = this.templates.map((t) => (t.id === id ? updated : t));
      return true;
    } catch (e) {
      console.error("[StatSheetTemplateStore] Failed to rename template:", e);
      return false;
    }
  }

  async updateTemplateFields(
    id: string,
    fields: StatSheetField[],
  ): Promise<boolean> {
    const vaultId = vaultRegistry.activeVaultId;
    const existing = this.templates.find((t) => t.id === id);
    if (!vaultId || !existing) return false;
    // #3180 backstop, mirroring saveAsTemplate.
    if (validateFieldKeys(fields).length > 0) return false;

    const updated: StatSheetTemplate = {
      ...$state.snapshot(existing),
      fields: fields.map(
        ({ value: _value, collapsed: _collapsed, ...rest }) => rest,
      ),
    };
    try {
      const db = await getDB();
      await db.put("stat_sheet_templates", { ...updated, vaultId });
      this.templates = this.templates.map((t) => (t.id === id ? updated : t));
      return true;
    } catch (e) {
      console.error(
        "[StatSheetTemplateStore] Failed to update template fields:",
        e,
      );
      return false;
    }
  }

  // Preserves each field's template-defined id (e.g. "hp", "ac") so
  // presentation templates that reference those ids keep resolving after
  // the template is applied to an entity. Only regenerates an id if it
  // would collide with one already present on the target entity (relevant
  // when appending onto an existing stat sheet).
  cloneTemplateFields(
    template: StatSheetTemplate,
    existingFields: StatSheetField[] = [],
  ): StatSheetField[] {
    const usedIds = new Set(existingFields.map((f) => f.id));
    return template.fields.map((f) => {
      const id = usedIds.has(f.id) ? `field-${this.idGenerator.uuid()}` : f.id;
      usedIds.add(id);
      return {
        ...f,
        id,
        // Counters (HP, MP, AP, etc.) start full rather than at the implicit
        // zero default — a freshly-applied template shouldn't read as "dead".
        ...(f.type === "counter" && f.max !== undefined
          ? { value: f.max }
          : null),
      };
    });
  }
}

// Guards against duplicate module instances under Vite HMR (a module can get
// hot-reloaded while other already-loaded importers still hold a reference
// to the old instance) — the same pattern `themeStore` uses. Without this,
// one importer's write and another's read can silently land on two
// different instances, e.g. a category default persisting to IDB correctly
// but never showing up in the Settings UI.
const STAT_SHEET_TEMPLATE_STORE_KEY = "__codex_stat_sheet_template_store__";
export const statSheetTemplates: StatSheetTemplateStore =
  (globalThis as any)[STAT_SHEET_TEMPLATE_STORE_KEY] ??
  ((globalThis as any)[STAT_SHEET_TEMPLATE_STORE_KEY] =
    new StatSheetTemplateStore());
