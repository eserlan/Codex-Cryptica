import type { PresentationTemplate, StatSheetTemplate } from "schema";
import type {
  Clock,
  IdFactory,
  ParsedRecord,
  RecordCodec,
  SaveAssetInput,
  ShelfStore,
  VaultEntitySummary,
  VaultReader,
  VaultWriter,
} from "./ports";
import type { ImportJournal, ShelfEntry, ShelfEntrySummary } from "./types";

/**
 * In-memory port fakes. Every rule in this package is exercised against these
 * rather than against browser storage, which is what makes the coverage goal
 * for a new package reachable (constitution principle X).
 */

export class FakeClock implements Clock {
  constructor(private t = 1_000) {}
  now(): number {
    return this.t;
  }
  advance(ms: number): void {
    this.t += ms;
  }
}

export class SeqIdFactory implements IdFactory {
  private n = 0;
  constructor(private prefix = "id") {}
  next(): string {
    this.n += 1;
    return `${this.prefix}-${this.n}`;
  }
}

/**
 * Deliberately not YAML. The package must never strip a field it does not
 * recognise, and a transparent codec makes that testable without pulling the
 * app's serialiser into a package that has no business depending on it. The
 * real YAML codec is the app's own and is covered by the adapter tests.
 */
export class JsonRecordCodec implements RecordCodec {
  parse(record: string): ParsedRecord {
    const match = record.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) return { metadata: {}, content: record };
    return {
      metadata: JSON.parse(match[1]) as Record<string, unknown>,
      content: match[2] ?? "",
    };
  }
  stringify(metadata: Record<string, unknown>, content: string): string {
    return `---\n${JSON.stringify(metadata)}\n---\n${content}`;
  }
}

export class InMemoryShelfStore implements ShelfStore {
  entries = new Map<string, ShelfEntry>();
  journals = new Map<string, ImportJournal>();
  /** Set to fail the next putEntry, standing in for a quota error. */
  failNextPut: Error | null = null;

  private summarise(entry: ShelfEntry): ShelfEntrySummary {
    const {
      entityRecord: _record,
      assets: _assets,
      statSheetTemplate: _schema,
      presentationTemplate: _presentation,
      referencedTitles: _referencedTitles,
      ...summary
    } = entry;
    return summary;
  }

  async listEntries(): Promise<ShelfEntrySummary[]> {
    return [...this.entries.values()]
      .sort((a, b) => b.shelvedAt - a.shelvedAt)
      .map((entry) => this.summarise(entry));
  }

  async getEntry(id: string): Promise<ShelfEntry | null> {
    return this.entries.get(id) ?? null;
  }

  async putEntry(entry: ShelfEntry): Promise<void> {
    if (this.failNextPut) {
      const err = this.failNextPut;
      this.failNextPut = null;
      throw err;
    }
    for (const [id, existing] of this.entries) {
      if (
        existing.sourceVaultId === entry.sourceVaultId &&
        existing.sourceEntityId === entry.sourceEntityId
      ) {
        this.entries.delete(id);
      }
    }
    this.entries.set(entry.id, entry);
  }

  async removeEntry(id: string): Promise<void> {
    this.entries.delete(id);
  }

  async clear(): Promise<void> {
    this.entries.clear();
  }

  async totalBytes(): Promise<number> {
    let total = 0;
    for (const entry of this.entries.values()) total += entry.byteSize;
    return total;
  }

  async writeJournal(journal: ImportJournal): Promise<void> {
    this.journals.set(journal.importId, journal);
  }

  async readJournals(): Promise<ImportJournal[]> {
    return [...this.journals.values()];
  }

  async deleteJournal(importId: string): Promise<void> {
    this.journals.delete(importId);
  }
}

export interface FakeVaultSeed {
  entities?: Array<{
    id: string;
    title: string;
    aliases?: string[];
    record?: string;
  }>;
  assets?: Record<
    string,
    { bytes: Blob; mimeType: string; originalName: string }
  >;
  schemaTemplates?: StatSheetTemplate[];
  presentationTemplates?: PresentationTemplate[];
}

/**
 * One fake standing in for both reader and writer over a single vault, so a
 * test can assert that shelving left the source untouched (FR-010) by
 * comparing snapshots of the same object.
 */
export class FakeVault implements VaultReader, VaultWriter {
  entities = new Map<
    string,
    { id: string; title: string; aliases: string[]; record: string }
  >();
  assets = new Map<
    string,
    { bytes: Blob; mimeType: string; originalName: string }
  >();
  entityAssets = new Map<string, string[]>();
  schemaTemplates = new Map<string, StatSheetTemplate>();
  presentationTemplates = new Map<string, PresentationTemplate>();

  /** Every mutating call, so a test can assert none were made. */
  writes: string[] = [];
  /** Throw from the named write step, to exercise rollback. */
  failOn: string | null = null;

  constructor(seed: FakeVaultSeed = {}) {
    for (const e of seed.entities ?? []) {
      this.entities.set(e.id, {
        id: e.id,
        title: e.title,
        aliases: e.aliases ?? [],
        record: e.record ?? `---\n{"id":"${e.id}","title":"${e.title}"}\n---\n`,
      });
    }
    for (const [path, asset] of Object.entries(seed.assets ?? {})) {
      this.assets.set(path, asset);
    }
    for (const t of seed.schemaTemplates ?? [])
      this.schemaTemplates.set(t.id, t);
    for (const t of seed.presentationTemplates ?? [])
      this.presentationTemplates.set(t.id, t);
  }

  private guard(step: string): void {
    this.writes.push(step);
    if (this.failOn && step.startsWith(this.failOn)) {
      throw new Error(`injected failure at ${step}`);
    }
  }

  // --- VaultReader ---

  async readEntityRecord(entityId: string): Promise<string> {
    const entity = this.entities.get(entityId);
    if (!entity) throw new Error(`no such entity: ${entityId}`);
    return entity.record;
  }

  async readAsset(path: string) {
    return this.assets.get(path) ?? null;
  }

  async readStatSheetTemplate(id: string): Promise<StatSheetTemplate | null> {
    return this.schemaTemplates.get(id) ?? null;
  }

  async readPresentationTemplate(
    id: string,
  ): Promise<PresentationTemplate | null> {
    return this.presentationTemplates.get(id) ?? null;
  }

  async listEntities(): Promise<VaultEntitySummary[]> {
    return [...this.entities.values()].map(({ id, title, aliases }) => ({
      id,
      title,
      aliases,
    }));
  }

  // --- VaultWriter ---

  async createEntity(input: { id: string; record: string }): Promise<void> {
    this.guard(`createEntity:${input.id}`);
    if (this.entities.has(input.id)) {
      throw new Error(`refusing to overwrite existing entity ${input.id}`);
    }
    const codec = new JsonRecordCodec();
    const { metadata } = codec.parse(input.record);
    this.entities.set(input.id, {
      id: input.id,
      title: String(metadata.title ?? ""),
      aliases: Array.isArray(metadata.aliases)
        ? metadata.aliases.map(String)
        : [],
      record: input.record,
    });
  }

  async saveAsset(input: SaveAssetInput): Promise<{ ref: string }> {
    this.guard(`saveAsset:${input.entityId}:${input.role}`);
    const ref = `images/${input.entityId}_${input.role}`;
    this.assets.set(ref, {
      bytes: input.bytes,
      mimeType: input.mimeType,
      originalName: input.originalName,
    });
    this.entityAssets.set(input.entityId, [
      ...(this.entityAssets.get(input.entityId) ?? []),
      ref,
    ]);
    return { ref };
  }

  async saveStatSheetTemplate(template: StatSheetTemplate): Promise<void> {
    this.guard(`saveStatSheetTemplate:${template.id}`);
    this.schemaTemplates.set(template.id, template);
  }

  async savePresentationTemplate(
    template: PresentationTemplate,
  ): Promise<void> {
    this.guard(`savePresentationTemplate:${template.id}`);
    this.presentationTemplates.set(template.id, template);
  }

  async deleteEntity(id: string): Promise<void> {
    this.entities.delete(id);
  }

  async deleteEntityAssets(entityId: string): Promise<void> {
    for (const ref of this.entityAssets.get(entityId) ?? [])
      this.assets.delete(ref);
    this.entityAssets.delete(entityId);
  }

  async deleteStatSheetTemplate(id: string): Promise<void> {
    this.schemaTemplates.delete(id);
  }

  async deletePresentationTemplate(id: string): Promise<void> {
    this.presentationTemplates.delete(id);
  }

  /** Comparable snapshot, for asserting a vault was left untouched. */
  snapshot(): string {
    return JSON.stringify({
      entities: [...this.entities.entries()].sort(),
      assets: [...this.assets.keys()].sort(),
      schemaTemplates: [...this.schemaTemplates.entries()].sort(),
      presentationTemplates: [...this.presentationTemplates.entries()].sort(),
    });
  }
}

export function blobOf(text: string): Blob {
  return new Blob([text], { type: "text/plain" });
}
