import type { Entity, PresentationTemplate, StatSheetTemplate } from "schema";
import type {
  ParsedRecord,
  RecordCodec,
  SaveAssetInput,
  VaultEntitySummary,
  VaultReader,
  VaultWriter,
} from "@codex/entity-shelf";
import { parseMarkdown, stringifyEntity } from "$lib/utils/markdown";
import { deleteOpfsEntry, readOpfsBlob, writeOpfsFile } from "$lib/utils/opfs";

/**
 * `VaultReader` and `VaultWriter` over the open vault, plus the record codec.
 *
 * Only one vault is open at a time, so both are bound to the active one: an
 * author shelves from vault A, switches, then imports into vault B. Asking for
 * a vault that is not open is a programming error rather than a supported case.
 */

/**
 * The vault's own serialisation, not a format of the Shelf's own — which is the
 * point. `stringifyEntity` already writes an entity losslessly into frontmatter,
 * so carrying its output verbatim is what makes a shelved entity complete
 * (research R4).
 */
export const vaultRecordCodec: RecordCodec = {
  parse(record: string): ParsedRecord {
    const { metadata, content } = parseMarkdown(record);
    return { metadata: metadata as Record<string, unknown>, content };
  },
  stringify(metadata: Record<string, unknown>, content: string): string {
    return stringifyEntity({ ...metadata, content } as unknown as Entity);
  },
};

/** The slice of the vault store this adapter needs, injected for testability. */
export interface ShelfVaultDeps {
  activeVaultId: () => string | null;
  vaultHandle: () => Promise<FileSystemDirectoryHandle | null>;
  entities: () => Record<string, Entity>;
  createEntity: (
    type: string,
    title: string,
    initialData: Partial<Entity>,
  ) => Promise<string>;
  deleteEntity: (id: string) => Promise<void> | void;
  readStatSheetTemplate: (id: string) => StatSheetTemplate | null;
  listStatSheetTemplateIds: () => string[];
  listPresentationTemplateIds: () => string[];
  readPresentationTemplate: (id: string) => PresentationTemplate | null;
  saveStatSheetTemplate: (template: StatSheetTemplate) => Promise<void>;
  savePresentationTemplate: (template: PresentationTemplate) => Promise<void>;
  deleteStatSheetTemplate: (id: string) => Promise<unknown>;
  deletePresentationTemplate: (id: string) => Promise<unknown>;
}

const ASSET_DIRECTORY: Record<SaveAssetInput["role"], string> = {
  image: "images",
  thumbnail: "images",
  soundBite: "audio",
};

/**
 * Fixed per role rather than derived from the incoming filename.
 *
 * Rollback has to be able to name every file this import wrote without being
 * told, and a filename-derived extension makes that guesswork: an asset saved
 * as `portrait.jfif` would never be matched by a delete pass guessing `.webp`,
 * leaving an orphan behind and breaking the "nothing left behind" half of
 * FR-020. The original filename still travels on the shelf entry for display.
 */
const ASSET_EXTENSION: Record<SaveAssetInput["role"], string> = {
  image: "webp",
  thumbnail: "webp",
  soundBite: "wav",
};

function assetRef(entityId: string, role: SaveAssetInput["role"]): string[] {
  return [
    ASSET_DIRECTORY[role],
    `${entityId}_${role}.${ASSET_EXTENSION[role]}`,
  ];
}

export class WebShelfVault implements VaultReader, VaultWriter {
  constructor(private readonly deps: ShelfVaultDeps) {}

  // --- VaultReader ---

  async readEntityRecord(entityId: string): Promise<string> {
    const entity = this.deps.entities()[entityId];
    if (!entity) throw new Error(`No entity ${entityId} in the open vault.`);
    return stringifyEntity(entity);
  }

  /**
   * Missing files return null rather than throwing: an entity whose image has
   * already gone from its own vault should still be shelvable, minus that
   * asset. Refusing the whole operation over a broken reference would be worse
   * than carrying an incomplete one.
   */
  async readAsset(path: string) {
    const handle = await this.deps.vaultHandle();
    if (!handle) return null;
    try {
      const bytes = await readOpfsBlob(path.split("/"), handle);
      const originalName = path.split("/").pop() ?? path;
      return {
        bytes,
        mimeType: bytes.type || "application/octet-stream",
        originalName,
      };
    } catch {
      return null;
    }
  }

  async readStatSheetTemplate(id: string): Promise<StatSheetTemplate | null> {
    return this.deps.readStatSheetTemplate(id);
  }

  async readPresentationTemplate(
    id: string,
  ): Promise<PresentationTemplate | null> {
    return this.deps.readPresentationTemplate(id);
  }

  async listStatSheetTemplateIds(): Promise<string[]> {
    return this.deps.listStatSheetTemplateIds();
  }

  async listPresentationTemplateIds(): Promise<string[]> {
    return this.deps.listPresentationTemplateIds();
  }

  async listEntities(): Promise<VaultEntitySummary[]> {
    return Object.values(this.deps.entities()).map((entity) => ({
      id: entity.id,
      title: entity.title,
      aliases: entity.aliases ?? [],
    }));
  }

  // --- VaultWriter ---

  /**
   * Creates under the identifier the caller minted. That id was already checked
   * free against this vault, and `createEntity` only auto-suffixes when the
   * requested id is taken, so nothing existing is ever displaced (FR-013).
   */
  async createEntity(input: { id: string; record: string }): Promise<void> {
    const { metadata, content } = vaultRecordCodec.parse(input.record);
    const created = await this.deps.createEntity(
      String(metadata.type ?? "note"),
      String(metadata.title ?? input.id),
      { ...(metadata as Partial<Entity>), id: input.id, content },
    );
    if (created !== input.id) {
      throw new Error(
        `Vault assigned ${created} instead of the planned ${input.id}; ` +
          "refusing to continue so rollback stays accurate.",
      );
    }
  }

  async saveAsset(input: SaveAssetInput): Promise<{ ref: string }> {
    const handle = await this.deps.vaultHandle();
    if (!handle) throw new Error("No vault is open.");

    const path = assetRef(input.entityId, input.role);
    await writeOpfsFile(
      path,
      input.bytes,
      handle,
      this.deps.activeVaultId() ?? undefined,
    );
    return { ref: path.join("/") };
  }

  async saveStatSheetTemplate(template: StatSheetTemplate): Promise<void> {
    await this.deps.saveStatSheetTemplate(template);
  }

  async savePresentationTemplate(
    template: PresentationTemplate,
  ): Promise<void> {
    await this.deps.savePresentationTemplate(template);
  }

  // --- Rollback. Every one of these is idempotent (invariant J3): a failed
  // import's journal lists artifacts that may never have been created.

  async deleteEntity(id: string): Promise<void> {
    try {
      await this.deps.deleteEntity(id);
    } catch {
      // Already absent.
    }
  }

  async deleteEntityAssets(entityId: string): Promise<void> {
    const handle = await this.deps.vaultHandle();
    if (!handle) return;

    // Assets this import wrote are named deterministically from the entity id
    // and role, and the entity is one this import created — so these three
    // paths are exhaustive, and every one of them is ours to remove.
    for (const role of Object.keys(
      ASSET_DIRECTORY,
    ) as SaveAssetInput["role"][]) {
      await deleteOpfsEntry(
        handle,
        assetRef(entityId, role),
        this.deps.activeVaultId() ?? undefined,
      ).catch(() => {});
    }
  }

  async deleteStatSheetTemplate(id: string): Promise<void> {
    await this.deps.deleteStatSheetTemplate(id).catch(() => {});
  }

  async deletePresentationTemplate(id: string): Promise<void> {
    await this.deps.deletePresentationTemplate(id).catch(() => {});
  }
}
