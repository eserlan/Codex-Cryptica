import {
  EMPTY_DEFAULTS,
  StoredTemplateSchema,
  TEMPLATE_FORMAT_VERSION,
  TemplateDefaultsSchema,
  type StoredTemplate,
  type TemplateDefaults,
} from "entity-template-engine";
import {
  deleteOpfsEntry,
  isNotFoundError,
  writeOpfsFile,
} from "../../utils/opfs";

const TEMPLATES_PATH = [".codex", "templates"];
const DEFAULTS_FILE = "defaults.json";

export interface TemplateHandles {
  /** The vault's own directory (OPFS). Templates are written here. */
  vault?: FileSystemDirectoryHandle;
  /** The linked local folder, when one is set. Legacy files are read from it first. */
  folder?: FileSystemDirectoryHandle;
}

export interface LegacyTemplate {
  type: string;
  markdown: string;
}

export interface LoadedTemplates {
  templates: StoredTemplate[];
  defaults: TemplateDefaults;
  legacy: LegacyTemplate[];
  warnings: string[];
}

async function tryDir(
  parent: FileSystemDirectoryHandle,
  name: string,
): Promise<FileSystemDirectoryHandle | undefined> {
  try {
    return await parent.getDirectoryHandle(name);
  } catch {
    return undefined;
  }
}

async function readText(
  handle: FileSystemFileHandle,
): Promise<string | undefined> {
  try {
    return await (await handle.getFile()).text();
  } catch {
    return undefined;
  }
}

interface NamedFile {
  name: string;
  text: string | undefined;
}

/** Files in `dir` whose name ends with `ext` (case-insensitive), with their text. */
async function* filesWithExtension(
  dir: FileSystemDirectoryHandle,
  ext: string,
): AsyncGenerator<NamedFile> {
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== "file" || !name.toLowerCase().endsWith(ext)) continue;
    yield { name, text: await readText(handle as FileSystemFileHandle) };
  }
}

/** Adds `{type}.md` files to `byType`; the first file seen for a type wins. */
async function collectLegacy(
  dir: FileSystemDirectoryHandle,
  byType: Map<string, string>,
): Promise<void> {
  try {
    for await (const file of filesWithExtension(dir, ".md")) {
      const type = file.name.slice(0, -3).toLowerCase();
      if (file.text !== undefined && !byType.has(type)) {
        byType.set(type, file.text);
      }
    }
  } catch {
    // An unreadable folder falls back to the built-in templates.
  }
}

/** Disk access for vault templates. Thin on purpose: no reactive state here. */
export class EntityTemplateRepository {
  async saveTemplate(
    vault: FileSystemDirectoryHandle,
    template: StoredTemplate,
  ): Promise<void> {
    await writeOpfsFile(
      [...TEMPLATES_PATH, `${template.id}.json`],
      JSON.stringify(template, null, 2),
      vault,
      vault.name,
    );
  }

  async deleteTemplate(
    vault: FileSystemDirectoryHandle,
    id: string,
  ): Promise<void> {
    try {
      await deleteOpfsEntry(
        vault,
        [...TEMPLATES_PATH, `${id}.json`],
        vault.name,
      );
    } catch (err) {
      if (!isNotFoundError(err)) throw err;
    }
  }

  async saveDefaults(
    vault: FileSystemDirectoryHandle,
    defaults: TemplateDefaults,
  ): Promise<void> {
    await writeOpfsFile(
      [...TEMPLATES_PATH, DEFAULTS_FILE],
      JSON.stringify(defaults, null, 2),
      vault,
      vault.name,
    );
  }

  async loadAll(handles: TemplateHandles): Promise<LoadedTemplates> {
    const result: LoadedTemplates = {
      templates: [],
      defaults: EMPTY_DEFAULTS,
      legacy: [],
      warnings: [],
    };
    if (handles.vault) await this.loadUserFiles(handles.vault, result);
    result.legacy = await this.loadLegacy(handles.folder ?? handles.vault);
    return result;
  }

  private async loadUserFiles(
    vault: FileSystemDirectoryHandle,
    result: LoadedTemplates,
  ): Promise<void> {
    const dir = await this.templatesDir(vault, ".codex");
    if (!dir) return;
    for await (const file of filesWithExtension(dir, ".json")) {
      this.absorb(result, file.name, file.text);
    }
  }

  /** Files a parsed `.json` into the result, or records why it was skipped. */
  private absorb(
    result: LoadedTemplates,
    name: string,
    text: string | undefined,
  ): void {
    if (name === DEFAULTS_FILE) {
      const defaults = this.parseDefaults(text);
      if (defaults) result.defaults = defaults;
      else
        result.warnings.push(
          `Couldn't read ${DEFAULTS_FILE}; using built-in defaults.`,
        );
      return;
    }
    const template = this.parseTemplate(text);
    // The id names the file we write back to, so a file whose id disagrees with
    // its name (or would land on defaults.json) is not trusted.
    if (template && `${template.id}.json` === name) {
      result.templates.push(template);
    } else {
      result.warnings.push(`Skipped "${name}" because it couldn't be read.`);
    }
  }

  private async templatesDir(
    root: FileSystemDirectoryHandle,
    top: ".cc" | ".codex",
  ) {
    const base = await tryDir(root, top);
    return base ? tryDir(base, "templates") : undefined;
  }

  /** Legacy `{type}.md` files. `.cc/templates` wins over `.codex/templates`. */
  private async loadLegacy(
    root: FileSystemDirectoryHandle | undefined,
  ): Promise<LegacyTemplate[]> {
    if (!root) return [];
    const byType = new Map<string, string>();
    for (const top of [".cc", ".codex"] as const) {
      const dir = await this.templatesDir(root, top);
      if (dir) await collectLegacy(dir, byType);
    }
    return [...byType].map(([type, markdown]) => ({ type, markdown }));
  }

  private parseTemplate(text: string | undefined): StoredTemplate | null {
    if (text === undefined) return null;
    try {
      const parsed = StoredTemplateSchema.safeParse(JSON.parse(text));
      if (!parsed.success) return null;
      if (parsed.data.version > TEMPLATE_FORMAT_VERSION) return null;
      return parsed.data;
    } catch {
      return null;
    }
  }

  private parseDefaults(text: string | undefined): TemplateDefaults | null {
    if (text === undefined) return null;
    try {
      const parsed = TemplateDefaultsSchema.safeParse(JSON.parse(text));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }
}

export const entityTemplateRepository = new EntityTemplateRepository();
