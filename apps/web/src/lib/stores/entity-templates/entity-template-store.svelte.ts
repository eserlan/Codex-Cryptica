import {
  EMPTY_DEFAULTS,
  TEMPLATE_FORMAT_VERSION,
  effectiveDefaultId,
  exportTemplatePackage,
  importTemplatePackage,
  resolveTemplateMarkdown,
  templateMarkdown,
  validateTemplate,
  type DraftTemplate,
  type EntityTemplate,
  type ImportResult,
  type StoredTemplate,
  type TemplateDefaults,
  type TemplatePackage,
  type ValidationIssue,
} from "entity-template-engine";
import { resolveTemplateSync } from "../../services/EntityTemplateConstants";
import { systemIdGenerator, type IdGenerator } from "$lib/utils/runtime-deps";
import { sessionModeStore } from "$lib/stores/ui/session-mode.svelte";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { themeStore } from "$lib/stores/theme.svelte";
import { buildBuiltinTemplates } from "./builtin-templates";
import {
  entityTemplateRepository,
  type EntityTemplateRepository,
  type LegacyTemplate,
  type TemplateHandles,
} from "./entity-template-repository";

export interface EntityTemplateStoreDeps {
  repository: EntityTemplateRepository;
  getTheme: () => string;
  isReadOnly: () => boolean;
  idGenerator: IdGenerator;
  notify: (message: string, kind: "error" | "info") => void;
}

/** Thrown for refused or invalid changes. The UI shows `message` as-is. */
export class EntityTemplateError extends Error {
  constructor(
    message: string,
    readonly issues: ValidationIssue[] = [],
  ) {
    super(message);
    this.name = "EntityTemplateError";
  }
}

const READ_ONLY_MESSAGE = "Templates can't be changed in this vault.";
const NOT_EDITABLE_MESSAGE =
  "Built-in and file templates can't be edited. Duplicate one to make your own.";

const normalizeType = (type: string) => type.trim().toLowerCase();

/** Vault-scoped entity templates: built-in, legacy files and the user's own. */
export class EntityTemplateStore {
  private userTemplates = $state<StoredTemplate[]>([]);
  private legacyFiles = $state<LegacyTemplate[]>([]);
  private defaults = $state<TemplateDefaults>(EMPTY_DEFAULTS);
  private handles = $state<TemplateHandles>({});
  private loadToken = 0;

  warnings = $state<string[]>([]);
  loaded = $state(false);

  constructor(private deps: EntityTemplateStoreDeps) {}

  get canEdit(): boolean {
    return !this.deps.isReadOnly() && !!this.handles.vault;
  }

  /** Built-in, then legacy, then user templates. */
  list = $derived.by(() => this.buildList(this.deps.getTheme()));

  async loadForVault(vaultId: string, handles: TemplateHandles): Promise<void> {
    const token = ++this.loadToken;
    this.loaded = false;
    this.userTemplates = [];
    this.legacyFiles = [];
    this.defaults = EMPTY_DEFAULTS;
    this.warnings = [];
    this.handles = handles;

    try {
      const result = await this.deps.repository.loadAll(handles);
      if (token !== this.loadToken) return;
      this.userTemplates = result.templates;
      this.legacyFiles = result.legacy;
      this.defaults = result.defaults;
      this.warnings = result.warnings;
    } catch (err) {
      if (token !== this.loadToken) return;
      console.warn(
        `[EntityTemplates] Failed to load templates for ${vaultId}`,
        err,
      );
      this.warnings = [
        "Your templates couldn't be loaded. Built-in templates are still available.",
      ];
    }
    this.loaded = true;
  }

  defaultFor(type: string): string | undefined {
    return this.defaults.defaults[normalizeType(type)];
  }

  effectiveDefaultFor(type: string): string | undefined {
    return effectiveDefaultId(type, this.list, this.defaults);
  }

  /** The markdown a new entity of `type` starts from. No I/O. */
  resolveSync(type: string, themeId?: string): string {
    const theme = themeId || this.deps.getTheme();
    return resolveTemplateMarkdown({
      type,
      templates: this.buildList(theme),
      defaults: this.defaults,
      themeBuiltin: resolveTemplateSync(type, theme),
    });
  }

  previewMarkdown(id: string): string {
    const found = this.list.find((t) => t.id === id);
    return found ? templateMarkdown(found) : "";
  }

  async setDefault(type: string, templateId: string): Promise<void> {
    const vault = this.requireEditable();
    const key = normalizeType(type);
    const target = this.list.find((t) => t.id === templateId);
    if (!target || normalizeType(target.entityType) !== key) {
      throw new EntityTemplateError(
        "That template isn't available for this type.",
      );
    }
    await this.persistDefaults(vault, {
      ...this.defaults,
      defaults: { ...this.defaults.defaults, [key]: templateId },
    });
  }

  async create(draft: DraftTemplate): Promise<EntityTemplate> {
    const vault = this.requireEditable();
    const stored = this.toStored(this.deps.idGenerator.uuid(), draft);
    await this.saveUser(vault, stored);
    this.userTemplates = [...this.userTemplates, stored];
    return this.asEntityTemplate(stored);
  }

  async duplicate(id: string, name?: string): Promise<EntityTemplate> {
    this.requireEditable();
    const source = this.list.find((t) => t.id === id);
    if (!source)
      throw new EntityTemplateError("That template no longer exists.");
    return this.create({
      name: name?.trim() || `${source.name} (copy)`,
      entityType: source.entityType,
      markdown: source.markdown,
    });
  }

  async update(id: string, draft: DraftTemplate): Promise<void> {
    const vault = this.requireEditable();
    const previous = this.requireUserTemplate(id);
    const stored = this.toStored(id, draft);
    await this.saveUser(vault, stored);
    this.userTemplates = this.userTemplates.map((t) =>
      t.id === id ? stored : t,
    );
    // Moving a template to another type must not leave it as the old type's default.
    if (normalizeType(previous.entityType) !== stored.entityType) {
      await this.clearDefault(vault, previous.entityType, id);
    }
  }

  async remove(id: string): Promise<void> {
    const vault = this.requireEditable();
    const existing = this.requireUserTemplate(id);
    try {
      await this.deps.repository.deleteTemplate(vault, id);
    } catch (err) {
      this.deps.notify("The template couldn't be deleted.", "error");
      throw err;
    }
    this.userTemplates = this.userTemplates.filter((t) => t.id !== id);
    await this.clearDefault(vault, existing.entityType, id);
  }

  exportPackage(id: string): TemplatePackage {
    const found = this.list.find((t) => t.id === id);
    if (!found)
      throw new EntityTemplateError("That template no longer exists.");
    return exportTemplatePackage({
      name: found.name,
      entityType: found.entityType,
      markdown: found.markdown,
    });
  }

  async importPackage(raw: unknown): Promise<ImportResult> {
    this.requireEditable();
    const result = importTemplatePackage(raw);
    if (!result.ok) return result;

    const draft = result.template;
    const taken = this.list.some(
      (t) =>
        normalizeType(t.entityType) === normalizeType(draft.entityType) &&
        t.name.trim().toLowerCase() === draft.name.trim().toLowerCase(),
    );
    const created = await this.create({
      ...draft,
      name: taken ? `${draft.name.trim()} (imported)` : draft.name,
    });
    return { ok: true, template: { ...draft, name: created.name } };
  }

  // -- internals ------------------------------------------------------------

  private buildList(theme: string): EntityTemplate[] {
    const legacy = this.legacyFiles.map((l): EntityTemplate => ({
      id: `legacy:${l.type}`,
      name: `Your ${l.type} file`,
      entityType: l.type,
      markdown: l.markdown,
      source: "legacy",
      version: TEMPLATE_FORMAT_VERSION,
    }));
    return [
      ...buildBuiltinTemplates(theme),
      ...legacy,
      ...this.userTemplates.map((t) => this.asEntityTemplate(t)),
    ];
  }

  private asEntityTemplate(t: StoredTemplate): EntityTemplate {
    return {
      id: t.id,
      name: t.name,
      entityType: t.entityType,
      markdown: t.markdown,
      source: "user",
      version: t.version,
    };
  }

  private toStored(id: string, draft: DraftTemplate): StoredTemplate {
    const issues = validateTemplate(draft);
    if (issues.length) throw new EntityTemplateError(issues[0].message, issues);
    return {
      version: TEMPLATE_FORMAT_VERSION,
      id,
      name: draft.name.trim(),
      entityType: normalizeType(draft.entityType),
      markdown: draft.markdown,
    };
  }

  private requireEditable(): FileSystemDirectoryHandle {
    const vault = this.handles.vault;
    if (this.deps.isReadOnly() || !vault) {
      throw new EntityTemplateError(READ_ONLY_MESSAGE);
    }
    return vault;
  }

  private requireUserTemplate(id: string): StoredTemplate {
    const found = this.userTemplates.find((t) => t.id === id);
    if (!found) throw new EntityTemplateError(NOT_EDITABLE_MESSAGE);
    return found;
  }

  private async saveUser(
    vault: FileSystemDirectoryHandle,
    stored: StoredTemplate,
  ) {
    try {
      await this.deps.repository.saveTemplate(vault, stored);
    } catch (err) {
      this.deps.notify("The template couldn't be saved.", "error");
      throw err;
    }
  }

  /** Forgets `id` as the chosen default for `type`, if it was. */
  private async clearDefault(
    vault: FileSystemDirectoryHandle,
    type: string,
    id: string,
  ) {
    const key = normalizeType(type);
    if (this.defaults.defaults[key] !== id) return;
    const { [key]: _removed, ...rest } = this.defaults.defaults;
    await this.persistDefaults(vault, { ...this.defaults, defaults: rest });
  }

  private async persistDefaults(
    vault: FileSystemDirectoryHandle,
    next: TemplateDefaults,
  ) {
    try {
      await this.deps.repository.saveDefaults(vault, next);
    } catch (err) {
      this.deps.notify("The default couldn't be saved.", "error");
      throw err;
    }
    this.defaults = next;
  }
}

export const entityTemplateStore = new EntityTemplateStore({
  repository: entityTemplateRepository,
  getTheme: () => themeStore.worldThemeId || "workspace",
  isReadOnly: () => sessionModeStore.isGuestMode,
  idGenerator: systemIdGenerator,
  notify: (message, kind) => notificationStore.notify(message, kind),
});
