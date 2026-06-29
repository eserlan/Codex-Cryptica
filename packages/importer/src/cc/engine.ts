const randomUUID = () => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
import type { CCImportPackage, ImportWarning } from "./package";
import { validatePackage } from "./validate";
import {
  mapDraftToType,
  mapDraftToFields,
  DEFAULT_MAPPING_RULES,
  DEFAULT_MAX_ASSET_BYTES,
  DEFAULT_ACCEPTED_VERSIONS,
  type MappingRuleSet,
} from "./mapping";
import { buildEntitySourceRef } from "./source-ref";
import type {
  CCImportSession,
  PreviewItem,
  PreviewRelationship,
  PreviewAsset,
} from "./session";
import {
  createEmptyReport,
  type ImportReport,
  type CommitFailure,
} from "./report";
import type { VaultWriter, NewEntityInput, AssociatedDraft } from "./ports";

export interface ImportEngineOptions {
  mappingRules?: MappingRuleSet;
  maxAssetBytes?: number;
  acceptedVersions?: string[];
}

export interface ImportEngineDeps {
  writer: VaultWriter;
}

export class ImportEngine {
  private writer: VaultWriter;
  private options: Required<ImportEngineOptions>;

  constructor(deps: ImportEngineDeps, options: ImportEngineOptions = {}) {
    this.writer = deps.writer;
    this.options = {
      mappingRules: options.mappingRules ?? DEFAULT_MAPPING_RULES,
      maxAssetBytes: options.maxAssetBytes ?? DEFAULT_MAX_ASSET_BYTES,
      acceptedVersions: options.acceptedVersions ?? DEFAULT_ACCEPTED_VERSIONS,
    };
  }

  parsePackage(input: unknown) {
    return validatePackage(input, {
      acceptedVersions: this.options.acceptedVersions,
    });
  }

  async prepare(pkg: CCImportPackage): Promise<CCImportSession> {
    // Single validation call; threads acceptedVersions so per-engine version overrides work.
    const validation = this.parsePackage(pkg);
    if (!validation.ok) {
      throw new Error(
        `Invalid package: ${validation.errors.map((e) => e.message).join("; ")}`,
      );
    }

    const warnings: ImportWarning[] = [
      ...(validation.warnings ?? []),
      ...pkg.warnings,
    ];

    const associatedDrafts = pkg.entityDrafts.map((draft) => ({
      sourceRef: buildEntitySourceRef(pkg.sourceSystem, draft),
      title: draft.title,
    }));

    this.writer.associateDrafts?.(associatedDrafts);

    // Build PreviewItems
    const items: PreviewItem[] = [];
    for (const draft of pkg.entityDrafts) {
      const { resolvedType, typeFallback } = mapDraftToType(
        draft,
        this.options.mappingRules,
      );
      const sourceRef = buildEntitySourceRef(pkg.sourceSystem, draft);
      const existing = await this.writer.findBySourceRef(sourceRef);
      items.push({
        draft,
        resolvedType,
        typeFallback,
        sourceRef,
        match: existing ? { entityId: existing.id } : null,
        decision: "include",
        matchDecision: existing ? "skip" : undefined,
      });
    }

    // Build PreviewRelationships (pre-resolution pass; full resolution at commit)
    const relationships: PreviewRelationship[] = pkg.relationshipDrafts.map(
      (rd) => ({
        draft: rd,
        status: "unresolved" as const,
      }),
    );

    // Asset eligibility pre-check
    const assets: PreviewAsset[] = pkg.assetDrafts.map((ad) => {
      if (!ad.bytes) {
        return { draft: ad, eligible: false, skipReason: "No bytes provided" };
      }
      const size =
        ad.bytes instanceof Blob ? ad.bytes.size : ad.bytes.byteLength;
      if (size > this.options.maxAssetBytes) {
        return {
          draft: ad,
          eligible: false,
          skipReason: `Asset exceeds size limit (${size} bytes)`,
        };
      }
      return { draft: ad, eligible: true };
    });

    return {
      id: randomUUID(),
      sourceSystem: pkg.sourceSystem,
      sourceLabel: pkg.sourceLabel,
      items,
      relationships,
      assets,
      warnings,
    };
  }

  async commit(
    session: CCImportSession,
    onProgress?: (
      stage: "entity" | "connection" | "asset",
      current: number,
      total: number,
    ) => void,
    signal?: AbortSignal,
  ): Promise<ImportReport> {
    const report = createEmptyReport(session.sourceSystem, session.sourceLabel);
    report.warnings = [...session.warnings];

    this.writer.associateDrafts?.(this._associatedDraftsFromSession(session));

    // Carry through type fallback warnings
    for (const item of session.items) {
      if (item.typeFallback) {
        report.typeFallbacks.push({
          sourceRef: item.sourceRef,
          sourceType: item.draft.sourceType,
        });
      }
    }

    // Track source-ref → committed id for connection resolution
    const committedIds = new Map<string, string>();
    const failures: CommitFailure[] = [];

    const totalEntities = session.items.filter(
      (item) => item.decision !== "ignore",
    ).length;
    let entityProgress = 0;

    const createSingleEntity = async (item: PreviewItem): Promise<void> => {
      const fields = mapDraftToFields(
        item.draft,
        item.resolvedType,
        item.sourceRef,
      );
      const input: NewEntityInput = {
        type: fields.type,
        title: fields.title,
        content: fields.content,
        lore: fields.lore,
        tags: fields.tags,
        labels: fields.labels,
        image: fields.image,
        thumbnail: fields.thumbnail,
        metadata: fields.metadata,
        parent: fields.parent,
        discoverySource: fields.discoverySource,
      };
      const { id } = await this.writer.createEntity(input);
      report.entitiesCreated++;
      committedIds.set(item.sourceRef, id);
      entityProgress++;
      onProgress?.("entity", entityProgress, totalEntities);
    };

    const creates: Array<{
      item: PreviewItem;
      ref: string;
      input: NewEntityInput;
    }> = [];

    // Phase 1: entities
    for (const item of session.items) {
      if (signal?.aborted) throw new Error("Import aborted");
      const ref =
        item.draft.sourceId ?? item.draft.sourcePath ?? item.sourceRef;

      if (item.decision === "ignore") {
        report.itemsSkipped++;
        continue;
      }

      if (item.match) {
        const decision = item.matchDecision ?? "skip";
        if (decision === "skip") {
          report.itemsSkipped++;
          // Still register the id so connections to this entity remain resolvable.
          committedIds.set(item.sourceRef, item.match.entityId);
          entityProgress++;
          onProgress?.("entity", entityProgress, totalEntities);
          continue;
        }
        if (decision === "update") {
          try {
            const fields = mapDraftToFields(
              item.draft,
              item.resolvedType,
              item.sourceRef,
            );
            const patch = {
              type: fields.type,
              title: fields.title,
              content: fields.content,
              lore: fields.lore,
              tags: fields.tags,
              labels: fields.labels,
              image: fields.image,
              thumbnail: fields.thumbnail,
              metadata: fields.metadata,
              parent: fields.parent,
            };
            await this.writer.updateEntity(item.match.entityId, patch);
            report.entitiesUpdated++;
            committedIds.set(item.sourceRef, item.match.entityId);
            entityProgress++;
            onProgress?.("entity", entityProgress, totalEntities);
          } catch (err) {
            failures.push({ ref, stage: "entity", message: String(err) });
            entityProgress++;
            onProgress?.("entity", entityProgress, totalEntities);
          }
          continue;
        }
        // "create" — fall through to create new
      }

      const fields = mapDraftToFields(
        item.draft,
        item.resolvedType,
        item.sourceRef,
      );
      creates.push({
        item,
        ref,
        input: {
          type: fields.type,
          title: fields.title,
          content: fields.content,
          lore: fields.lore,
          tags: fields.tags,
          labels: fields.labels,
          image: fields.image,
          thumbnail: fields.thumbnail,
          metadata: fields.metadata,
          parent: fields.parent,
          discoverySource: fields.discoverySource,
        },
      });
    }

    if (creates.length > 0) {
      if (this.writer.batchCreateEntities) {
        try {
          const results = await this.writer.batchCreateEntities(
            creates.map(({ input }) => input),
          );
          if (results.length !== creates.length) {
            throw new Error(
              `Batch create returned ${results.length} ids for ${creates.length} entities`,
            );
          }

          for (let index = 0; index < creates.length; index += 1) {
            const created = creates[index];
            const result = results[index];
            report.entitiesCreated++;
            committedIds.set(created.item.sourceRef, result.id);
            entityProgress++;
          }
          onProgress?.("entity", entityProgress, totalEntities);
        } catch (err) {
          for (const created of creates) {
            try {
              await createSingleEntity(created.item);
            } catch (singleErr) {
              failures.push({
                ref: created.ref,
                stage: "entity",
                message: String(singleErr ?? err),
              });
              entityProgress++;
              onProgress?.("entity", entityProgress, totalEntities);
            }
          }
        }
      } else {
        for (const created of creates) {
          try {
            await createSingleEntity(created.item);
          } catch (err) {
            failures.push({
              ref: created.ref,
              stage: "entity",
              message: String(err),
            });
            entityProgress++;
            onProgress?.("entity", entityProgress, totalEntities);
          }
        }
      }
    }

    // Phase 2: connections (after entities so targets exist)
    const totalConnections = session.relationships.length;
    let connectionProgress = 0;

    for (const rel of session.relationships) {
      if (signal?.aborted) throw new Error("Import aborted");
      const fromRef = await this._resolveRef(
        rel.draft.fromRef,
        committedIds,
        session,
      );
      const toRef = await this._resolveRef(
        rel.draft.toRef,
        committedIds,
        session,
      );

      if (!fromRef || !toRef) {
        const reason = !fromRef
          ? `fromRef "${rel.draft.fromRef}" could not be resolved`
          : `toRef "${rel.draft.toRef}" could not be resolved`;
        report.unresolvedReferences.push({
          fromRef: rel.draft.fromRef,
          toRef: rel.draft.toRef,
          type: rel.draft.type,
          reason,
        });
        connectionProgress++;
        onProgress?.("connection", connectionProgress, totalConnections);
        continue;
      }

      if (fromRef === toRef) {
        report.unresolvedReferences.push({
          fromRef: rel.draft.fromRef,
          toRef: rel.draft.toRef,
          type: rel.draft.type,
          reason: "Self-referential relationship",
        });
        connectionProgress++;
        onProgress?.("connection", connectionProgress, totalConnections);
        continue;
      }

      try {
        // fromRef and toRef are already vault entity ids (resolved by _resolveRef).
        await this.writer.appendConnection(fromRef, {
          target: toRef,
          type: rel.draft.type,
          label: rel.draft.label,
        });
        report.relationshipsCreated++;
      } catch (err) {
        failures.push({
          ref: rel.draft.fromRef,
          stage: "connection",
          message: String(err),
        });
      } finally {
        connectionProgress++;
        onProgress?.("connection", connectionProgress, totalConnections);
      }
    }

    // Phase 3: assets
    const totalAssets = session.assets.length;
    let assetProgress = 0;

    for (const pa of session.assets) {
      if (signal?.aborted) throw new Error("Import aborted");
      if (!pa.eligible || !pa.draft.bytes) {
        report.assetsSkipped.push({
          id: pa.draft.id,
          reason: pa.skipReason ?? "Not eligible",
        });
        assetProgress++;
        onProgress?.("asset", assetProgress, totalAssets);
        continue;
      }
      try {
        await this.writer.saveAsset({
          bytes: pa.draft.bytes,
          originalName: pa.draft.originalName,
          mimeType: pa.draft.mimeType,
        });
        report.assetsImported++;
      } catch (err) {
        failures.push({
          ref: pa.draft.id,
          stage: "asset",
          message: String(err),
        });
      } finally {
        assetProgress++;
        onProgress?.("asset", assetProgress, totalAssets);
      }
    }

    report.failures = failures;
    return report;
  }

  private _associatedDraftsFromSession(
    session: CCImportSession,
  ): AssociatedDraft[] {
    return session.items.map((item) => ({
      sourceRef: item.sourceRef,
      title: item.draft.title,
    }));
  }

  private async _resolveRef(
    ref: string,
    committedIds: Map<string, string>,
    session: CCImportSession,
  ): Promise<string | null> {
    const committedId = committedIds.get(ref);
    if (committedId) return committedId;

    // Try to find the source item in the session by raw id/path or full source ref.
    for (const item of session.items) {
      if (
        item.sourceRef === ref ||
        item.draft.sourceId === ref ||
        item.draft.sourcePath === ref
      ) {
        // Ignored items can't be relationship endpoints
        if (item.decision === "ignore") return null;
        return committedIds.get(item.sourceRef) ?? null;
      }
    }

    // Not in session: allow exact source-ref matches to already imported vault entities.
    const existing = await this.writer.findBySourceRef(ref);
    return existing?.id ?? null;
  }
}

export function createImportEngine(
  writer: VaultWriter,
  options?: ImportEngineOptions,
): ImportEngine {
  return new ImportEngine({ writer }, options);
}
