import type {
  Clock,
  IdFactory,
  RecordCodec,
  ShelfStore,
  VaultReader,
  VaultWriter,
} from "./ports";
import {
  chooseTemplate,
  executeImport,
  planImport,
  recoverCrashedImports,
} from "./import";
import { shelveEntities } from "./shelve";
import type {
  ImportOutcome,
  ImportPlan,
  ProgressFn,
  ShelfEntry,
  ShelfEntrySummary,
  ShelfGroup,
} from "./types";

export * from "./types";
export * from "./ports";
export { resolveTitle, mintUniqueId, normaliseTitle, slugify } from "./titles";
export { decideTemplate } from "./templates";
export { resolveReference } from "./connections";
export { shelveEntities } from "./shelve";
export {
  planImport,
  executeImport,
  chooseTemplate,
  recoverCrashedImports,
} from "./import";

const systemClock: Clock = { now: () => Date.now() };

const randomIds: IdFactory = {
  next: () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
};

export interface EntityShelfServiceDeps {
  store: ShelfStore;
  /** Reader for a given vault — shelving reads one while importing writes another. */
  readerFor: (vaultId: string) => VaultReader;
  writerFor: (vaultId: string) => VaultWriter;
  codec: RecordCodec;
  clock?: Clock;
  ids?: IdFactory;
}

/**
 * The Shelf: carry entities between vaults without anything leaving the app.
 *
 * `plan` and `import` are deliberately separate calls. Every decision the
 * author has to make happens during planning, so the journalled write phase
 * runs unattended — a dialog opening inside it could be left hanging by a
 * closed tab, stranding a journal behind it (FR-016a).
 */
export class EntityShelfService {
  private readonly clock: Clock;
  private readonly ids: IdFactory;

  constructor(private readonly deps: EntityShelfServiceDeps) {
    this.clock = deps.clock ?? systemClock;
    this.ids = deps.ids ?? randomIds;
  }

  listEntries(): Promise<ShelfEntrySummary[]> {
    return this.deps.store.listEntries();
  }

  getEntry(id: string): Promise<ShelfEntry | null> {
    return this.deps.store.getEntry(id);
  }

  totalBytes(): Promise<number> {
    return this.deps.store.totalBytes();
  }

  removeEntry(id: string): Promise<void> {
    return this.deps.store.removeEntry(id);
  }

  clear(): Promise<void> {
    return this.deps.store.clear();
  }

  /** Copies entities onto the shelf. The source vault is only ever read (FR-010). */
  shelve(
    input: { vaultId: string; vaultName: string; entityIds: string[] },
    onProgress?: ProgressFn,
  ): Promise<ShelfGroup> {
    return shelveEntities(
      {
        store: this.deps.store,
        reader: this.deps.readerFor(input.vaultId),
        codec: this.deps.codec,
        clock: this.clock,
        ids: this.ids,
      },
      input,
      onProgress,
    );
  }

  plan(entryIds: string[], targetVaultId: string): Promise<ImportPlan> {
    return planImport(this.importDeps(targetVaultId), {
      entryIds,
      targetVaultId,
    });
  }

  /** Records the author's answer to one template conflict (FR-016). */
  choose(
    plan: ImportPlan,
    templateId: string,
    choice: "keep-existing" | "bring-in",
  ): ImportPlan {
    return chooseTemplate(plan, templateId, choice);
  }

  import(plan: ImportPlan, onProgress?: ProgressFn): Promise<ImportOutcome> {
    return executeImport(this.importDeps(plan.targetVaultId), plan, onProgress);
  }

  /**
   * Undoes any import that never finished. Call at startup, before the shelf
   * becomes usable, so a half-written import cannot be mistaken for content.
   */
  recoverCrashedImports(): Promise<void> {
    return recoverCrashedImports({ store: this.deps.store }, (vaultId) =>
      this.deps.writerFor(vaultId),
    );
  }

  private importDeps(vaultId: string) {
    return {
      store: this.deps.store,
      reader: this.deps.readerFor(vaultId),
      writer: this.deps.writerFor(vaultId),
      codec: this.deps.codec,
      clock: this.clock,
      ids: this.ids,
    };
  }
}
