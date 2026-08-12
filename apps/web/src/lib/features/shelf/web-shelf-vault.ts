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

function extensionOf(name: string, fallback: string): string {
  const match = name.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : fallback;
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

    const directory = ASSET_DIRECTORY[input.role];
    const extension = extensionOf(
      input.originalName,
      input.role === "soundBite" ? "wav" : "webp",
    );
    const ref = `${directory}/${input.entityId}_${input.role}.${extension}`;

    await writeOpfsFile(
      ref.split("/"),
      input.bytes,
      handle,
      this.deps.activeVaultId() ?? undefined,
    );
    return { ref };
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

    // Assets this import wrote are named from the entity id, and the entity is
    // one this import created, so every match is ours to remove.
    for (const [role, directory] of Object.entries(ASSET_DIRECTORY)) {
      for (const extension of [
        "webp",
        "png",
        "jpg",
        "jpeg",
        "gif",
        "wav",
        "mp3",
      ]) {
        await deleteOpfsEntry(
          handle,
          [directory, `${entityId}_${role}.${extension}`],
          this.deps.activeVaultId() ?? undefined,
        ).catch(() => {});
      }
    }
  }

  async deleteStatSheetTemplate(id: string): Promise<void> {
    await this.deps.deleteStatSheetTemplate(id).catch(() => {});
  }

  async deletePresentationTemplate(id: string): Promise<void> {
    await this.deps.deletePresentationTemplate(id).catch(() => {});
  }
}
