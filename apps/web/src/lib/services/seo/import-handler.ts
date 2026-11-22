import { z } from "zod";
import { vault } from "#lib/stores/vault.svelte.js";
import { vaultRegistry } from "#lib/stores/vault-registry.svelte.js";
import { browserStorage, type StorageLike } from "#lib/utils/runtime-deps.js";
import { dataUrlToFile } from "#lib/utils/svg-export.js";
import {
  entityMapLinkingService,
  type EntityMapLinkingService,
} from "#lib/services/entity-map-linking.js";

export const ImportDraftSchema = z.object({
  type: z.enum([
    "character",
    "creature",
    "location",
    "item",
    "event",
    "faction",
    "quest",
    "species",
    "note",
  ]),
  /** Vault entity sub-kind (e.g. "language" on notes), used by vault scans. */
  kind: z.string().optional(),
  title: z.string().min(1),
  content: z.string().default(""),
  lore: z.string().optional(),
  labels: z.array(z.string()).default(["imported-draft"]),
  status: z.enum(["active", "draft"]).default("active"),
  references: z.array(z.string()).optional(),
  relationships: z
    .array(
      z.object({
        title: z.string().min(1),
        type: z.string().optional(),
        label: z.string().optional(),
      }),
    )
    .optional(),
  parentReference: z.string().optional(),
  assets: z
    .array(
      z.object({
        originalName: z.string().min(1),
        mimeType: z.string().min(1),
        dataUrl: z.string().startsWith("data:"),
      }),
    )
    .optional(),
  discoverySource: z.string().optional(),
  systemId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  /**
   * A rasterized diagram (e.g. the star-system generator's orbital diagram)
   * as a `data:image/png` URL, linked to the created entity's Map tab on
   * import (#1935 follow-up). localStorage can only hold strings, hence the
   * data-URL encoding rather than passing a Blob/File directly.
   */
  mapImageDataUrl: z.string().startsWith("data:image/").optional(),
});

export type ImportDraft = z.infer<typeof ImportDraftSchema>;

export type PendingImportResult =
  | { status: "none" }
  | {
      status: "imported";
      rootId: string;
      count: number;
      vaultName: string;
      rootTitle: string;
    }
  | { status: "invalid" }
  | { status: "failed"; message: string };

const PENDING_KEY = "__codex_pending_import";
const PROGRESS_KEY = "__codex_pending_import_progress";

interface ImportProgress {
  fingerprint: string;
  vaultId: string;
  created: Record<number, { id: string; title: string }>;
}

type VaultEntity = (typeof vault.allEntities)[number];

/** Collision-resistant identity without copying the payload into progress. */
async function fingerprintOf(payload: string): Promise<string> {
  const bytes = new TextEncoder().encode(payload);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

const importMarker = (fingerprint: string, index: number) =>
  `__codex_pending_import:${fingerprint}:${index}`;

/**
 * Picks the batch root: the draft without a `parentReference` that links to
 * the most other batch drafts (earliest wins ties).
 */
function pickRootIndex(drafts: ImportDraft[]): number {
  if (drafts.length === 1) return 0;
  const titles = new Map<string, number>();
  drafts.forEach((d, i) => titles.set(d.title.toLowerCase(), i));
  const linked = drafts.map(() => new Set<number>());
  drafts.forEach((draft, i) => {
    const link = (title: string | undefined) => {
      const target = title ? titles.get(title.toLowerCase()) : undefined;
      if (target !== undefined && target !== i) linked[i].add(target);
    };
    draft.relationships?.forEach((r) => link(r.title));
    draft.references?.forEach(link);
    for (const match of draft.content.matchAll(/\[\[([^\]]+)\]\]/g)) {
      link(match[1]);
    }
    if (draft.parentReference) {
      const parent = titles.get(draft.parentReference.toLowerCase());
      if (parent !== undefined && parent !== i) linked[parent].add(i);
    }
  });
  let best = -1;
  let bestCount = -1;
  drafts.forEach((draft, i) => {
    if (draft.parentReference) return;
    if (linked[i].size > bestCount) {
      best = i;
      bestCount = linked[i].size;
    }
  });
  return best === -1 ? 0 : best;
}

interface ConnectionSpec {
  targetId: string;
  type: string;
  label: string;
}

/** Relationships, explicit references and [[wiki links]] of one draft. */
function collectConnections(
  draft: ImportDraft,
  sourceId: string,
  titleToId: Map<string, string>,
): Iterable<ConnectionSpec> {
  const found = new Map<string, ConnectionSpec>();
  const queue = (title: string, type: string, label: string) => {
    const targetId = titleToId.get(title.toLowerCase());
    if (!targetId || targetId === sourceId) return;
    found.set(`${targetId}|${type}|${label}`, { targetId, type, label });
  };
  for (const r of draft.relationships ?? []) {
    queue(r.title, r.type ?? "references", r.label ?? r.title);
  }
  for (const ref of draft.references ?? []) queue(ref, "references", ref);
  for (const match of draft.content.matchAll(/\[\[([^\]]+)\]\]/g)) {
    queue(match[1], "references", match[1]);
  }
  return found.values();
}

export class SeoImportService {
  private inFlight: Promise<PendingImportResult> | null = null;

  constructor(
    private vaultStore = vault,
    private registryStore = vaultRegistry,
    private storage: StorageLike = browserStorage,
    private mapLinker: EntityMapLinkingService = entityMapLinkingService,
    private win: any = typeof window !== "undefined" ? window : undefined,
    private doc: any = typeof document !== "undefined" ? document : undefined,
  ) {}

  /** Removes the pending draft and its progress record. */
  discardPendingImport(): void {
    this.storage?.removeItem(PENDING_KEY);
    this.storage?.removeItem(PROGRESS_KEY);
  }

  /**
   * Imports the pending draft from storage, if any. A failure keeps the
   * draft so it can be retried; calls made while one runs share its promise.
   */
  checkAndHandlePendingImport(): Promise<PendingImportResult> {
    this.inFlight ??= this.run().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private readProgress(): ImportProgress | null {
    try {
      const raw = this.storage.getItem(PROGRESS_KEY);
      return raw ? (JSON.parse(raw) as ImportProgress) : null;
    } catch {
      return null;
    }
  }

  private async run(): Promise<PendingImportResult> {
    if (!this.win || !this.storage) {
      return { status: "none" };
    }

    this.cleanAddressBar();

    const payload = this.storage.getItem(PENDING_KEY);
    if (!payload) {
      return { status: "none" };
    }

    const drafts = this.parseDrafts(payload);
    if (!drafts) {
      this.discardPendingImport();
      return { status: "invalid" };
    }

    try {
      await this.ensureVault();
      return await this.importDrafts(drafts, payload);
    } catch (err) {
      console.error("Failed to import pending SEO draft:", err);
      return {
        status: "failed",
        message: err instanceof Error ? err.message : "Import failed",
      };
    }
  }

  /** Removes UTM query parameters from the address bar if present. */
  private cleanAddressBar(): void {
    if (this.win.history && this.win.location.search.includes("utm_source")) {
      const cleanUrl = this.win.location.pathname + this.win.location.hash;
      this.win.history.replaceState({}, this.doc?.title || "", cleanUrl);
    }
  }

  private async loadProgress(payload: string): Promise<ImportProgress> {
    const fingerprint = await fingerprintOf(payload);
    const vaultId = this.vaultStore.activeVaultId ?? "";
    const saved = this.readProgress();
    return saved?.fingerprint === fingerprint && saved.vaultId === vaultId
      ? { ...saved, created: saved.created ?? {} }
      : { fingerprint, vaultId, created: {} };
  }

  private async importDrafts(
    drafts: ImportDraft[],
    payload: string,
  ): Promise<PendingImportResult> {
    const progress = await this.loadProgress(payload);
    // title → entityId map for wiring [[wiki links]] after creation
    const titleToId = new Map<string, string>();
    const allEntities = this.vaultStore.allEntities;
    const titles = new Set(
      allEntities.map((entity) => entity.title.toLowerCase()),
    );
    const entitiesByImportMarker = this.findImportedEntities(
      allEntities,
      progress.fingerprint,
    );

    // Keep only batch identity in localStorage. Entity markers are the durable
    // per-entry journal, so checkpoints never rewrite a growing progress blob.
    this.saveProgress(progress);

    for (const [index, draft] of drafts.entries()) {
      const created = await this.importDraft(
        draft,
        index,
        progress,
        titles,
        entitiesByImportMarker,
      );
      titleToId.set(created.title.toLowerCase(), created.id);
      // Also index by original draft title in case it was de-duped
      titleToId.set(draft.title.toLowerCase(), created.id);
    }

    await this.wireDrafts(drafts, titleToId);

    const root = progress.created[pickRootIndex(drafts)];
    // Consume the retry payload before removing its per-entity recovery
    // markers. A marker update can mutate memory and then fail to persist; if
    // the payload remained, a same-tab retry could no longer find that entry.
    this.discardPendingImport();
    try {
      await this.removeImportMarkers(progress);
    } catch (err) {
      // The import is complete. Marker cleanup is best-effort and must not
      // make the consumed batch replayable.
      console.error("Failed to clean up imported entity markers:", err);
    }
    this.vaultStore.selectedEntityId = root.id;

    return {
      status: "imported",
      rootId: root.id,
      count: drafts.length,
      vaultName: this.registryStore.vaultName,
      rootTitle: root.title,
    };
  }

  private findImportedEntities(
    entities: VaultEntity[],
    fingerprint: string,
  ): Map<string, VaultEntity> {
    const prefix = `__codex_pending_import:${fingerprint}:`;
    const imported = new Map<string, VaultEntity>();
    for (const entity of entities) {
      for (const label of entity.labels ?? []) {
        if (label.startsWith(prefix)) imported.set(label, entity);
      }
    }
    return imported;
  }

  private async importDraft(
    draft: ImportDraft,
    index: number,
    progress: ImportProgress,
    titles: Set<string>,
    entitiesByImportMarker: Map<string, VaultEntity>,
  ): Promise<{ id: string; title: string }> {
    const resumed = progress.created[index];
    if (resumed && this.vaultStore.entities?.[resumed.id]) return resumed;

    const marker = importMarker(progress.fingerprint, index);
    const recovered = entitiesByImportMarker.get(marker);
    const created = recovered
      ? { id: recovered.id, title: recovered.title }
      : await this.createDraft(draft, marker, titles);

    progress.created[index] = created;
    titles.add(created.title.toLowerCase());
    if (!recovered) {
      await this.linkAttachments(draft, created.title, created.id);
    }
    return created;
  }

  private parseDrafts(payload: string): ImportDraft[] | null {
    try {
      const rawData = JSON.parse(payload);
      const drafts = Array.isArray(rawData)
        ? z.array(ImportDraftSchema).parse(rawData)
        : [ImportDraftSchema.parse(rawData)];
      return drafts.length > 0 ? drafts : null;
    } catch (err) {
      console.error("Failed to parse pending SEO draft:", err);
      return null;
    }
  }

  private async ensureVault(): Promise<void> {
    if (!this.vaultStore.isInitialized) {
      await this.vaultStore.init();
    }
    if (this.vaultStore.activeVaultId) return;
    await this.registryStore.init();
    if (this.registryStore.availableVaults.length === 0) {
      const newVaultId = await this.registryStore.createVault("My Codex Vault");
      await this.vaultStore.switchVault(newVaultId);
    } else {
      await this.vaultStore.switchVault(
        this.registryStore.availableVaults[0].id,
      );
    }
  }

  private saveProgress(progress: ImportProgress): void {
    const serialized = JSON.stringify({
      fingerprint: progress.fingerprint,
      vaultId: progress.vaultId,
    });
    this.storage.setItem(PROGRESS_KEY, serialized);
    if (this.storage.getItem(PROGRESS_KEY) !== serialized) {
      throw new Error("Import progress could not be saved. Please retry.");
    }
  }

  private uniqueTitle(base: string, titles: Set<string>): string {
    const taken = (title: string) => titles.has(title.toLowerCase());
    let title = base;
    let counter = 1;
    while (taken(title)) {
      title = `${base} (Imported${counter > 1 ? ` ${counter}` : ""})`;
      counter++;
    }
    return title;
  }

  private async createDraft(
    draft: ImportDraft,
    marker: string,
    titles: Set<string>,
  ): Promise<{ id: string; title: string }> {
    const title = this.uniqueTitle(draft.title, titles);
    const id = await this.vaultStore.createEntity(draft.type, title, {
      content: draft.content.replace(
        /!\[([^\]]*)\]\(\s*(?:https?:)?\/\/[^)]+\)/gi,
        "$1",
      ),
      lore: draft.lore || "",
      labels: [...draft.labels, marker],
      status: draft.status,
      ...(draft.kind ? { kind: draft.kind } : {}),
      ...(draft.discoverySource
        ? { discoverySource: draft.discoverySource }
        : {}),
      systemId: draft.systemId,
      ...(draft.metadata ? { metadata: draft.metadata } : {}),
    });
    return { id, title };
  }

  private async removeImportMarkers(progress: ImportProgress): Promise<void> {
    if (typeof this.vaultStore.updateEntity !== "function") return;
    for (const [index, created] of Object.entries(progress.created)) {
      const entity = this.vaultStore.entities?.[created.id];
      const marker = importMarker(progress.fingerprint, Number(index));
      if (!entity?.labels?.includes(marker)) continue;
      await this.vaultStore.updateEntity(created.id, {
        labels: entity.labels.filter((label: string) => label !== marker),
      });
    }
  }

  /** Best-effort: the entity itself already imported successfully. */
  private async linkAttachments(
    draft: ImportDraft,
    title: string,
    entityId: string,
  ): Promise<void> {
    if (draft.mapImageDataUrl) {
      try {
        const file = dataUrlToFile(draft.mapImageDataUrl, `${title}.png`);
        await this.mapLinker.linkImageToEntity(file, `${title} Map`, entityId);
      } catch (err) {
        console.error("Failed to link generated map image:", err);
      }
    }
    if (
      !draft.assets ||
      typeof this.vaultStore.saveImageToVault !== "function"
    ) {
      return;
    }
    for (const asset of draft.assets) {
      try {
        const file = dataUrlToFile(asset.dataUrl, asset.originalName);
        await this.vaultStore.saveImageToVault(
          file,
          entityId,
          asset.originalName,
        );
      } catch (err) {
        console.error("Failed to save imported Kanka asset:", err);
      }
    }
  }

  /** Sets parents and connections; safe to re-run without duplicating links. */
  private async wireDrafts(
    drafts: ImportDraft[],
    titleToId: Map<string, string>,
  ): Promise<void> {
    for (const draft of drafts) {
      const sourceId = titleToId.get(draft.title.toLowerCase());
      if (!sourceId) continue;
      await this.setParent(draft, sourceId, titleToId);
    }
    for (const draft of drafts) {
      const sourceId = titleToId.get(draft.title.toLowerCase());
      if (!sourceId) continue;
      await this.addConnections(
        sourceId,
        collectConnections(draft, sourceId, titleToId),
      );
    }
  }

  private async setParent(
    draft: ImportDraft,
    sourceId: string,
    titleToId: Map<string, string>,
  ): Promise<void> {
    if (
      !draft.parentReference ||
      typeof this.vaultStore.updateEntity !== "function"
    ) {
      return;
    }
    const parentId = titleToId.get(draft.parentReference.toLowerCase());
    if (!parentId || sourceId === parentId) return;
    try {
      await this.vaultStore.updateEntity(sourceId, { parent: parentId });
    } catch {
      // Non-fatal: the entity itself already imported successfully.
    }
  }

  private async addConnections(
    sourceId: string,
    connections: Iterable<ConnectionSpec>,
  ): Promise<void> {
    for (const connection of connections) {
      const existing = this.vaultStore.entities?.[sourceId]?.connections;
      if (
        existing?.some(
          (c) =>
            c.target === connection.targetId &&
            c.type === connection.type &&
            c.label === connection.label,
        )
      ) {
        continue;
      }
      try {
        await this.vaultStore.addConnection(
          sourceId,
          connection.targetId,
          connection.type,
          connection.label,
        );
      } catch {
        // Non-fatal: link wiring is best-effort
      }
    }
  }
}

export const seoImportService = new SeoImportService();
