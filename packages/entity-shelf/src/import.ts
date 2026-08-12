import type { PresentationTemplate, StatSheetTemplate } from "schema";
import type {
  Clock,
  IdFactory,
  RecordCodec,
  ShelfStore,
  VaultReader,
  VaultWriter,
} from "./ports";
import { resolveReference, type BatchMember } from "./connections";
import { decideTemplate } from "./templates";
import { mintUniqueId, resolveTitle } from "./titles";
import type {
  ConnectionResolution,
  ImportJournal,
  ImportOutcome,
  ImportPlan,
  ParentResolution,
  ProgressFn,
  ShelfEntry,
  TemplateDecision,
  TitleAssignment,
} from "./types";

export interface ImportDeps {
  store: ShelfStore;
  reader: VaultReader;
  writer: VaultWriter;
  codec: RecordCodec;
  clock: Clock;
  ids: IdFactory;
}

export interface PlanImportInput {
  entryIds: string[];
  targetVaultId: string;
}

/** Template ids this import will create, and what the entries should point at. */
interface TemplateWritePlan {
  schema: Map<string, StatSheetTemplate>;
  presentation: Map<string, PresentationTemplate>;
  /** Original template id -> id to reference in the imported record. */
  remap: Map<string, string>;
  reused: string[];
}

function connectionsOf(metadata: Record<string, unknown>) {
  return Array.isArray(metadata.connections)
    ? (metadata.connections as Array<Record<string, unknown>>)
    : [];
}

/**
 * Builds the whole import up front — titles, identifiers, template decisions,
 * connection and parent resolutions — so the write phase runs unattended.
 *
 * Nothing here writes. Everything requiring the author's judgement surfaces as
 * an unresolved template decision, which is what keeps a dialog out of the
 * journalled section: a prompt opening mid-write could be left hanging by a
 * closed tab, stranding a journal behind it (FR-016a).
 */
export async function planImport(
  deps: ImportDeps,
  input: PlanImportInput,
): Promise<ImportPlan> {
  const entries: ShelfEntry[] = [];
  for (const entryId of input.entryIds) {
    const entry = await deps.store.getEntry(entryId);
    if (!entry) {
      throw new Error(
        "That entry is no longer on the Shelf — it may have been removed in another tab.",
      );
    }
    entries.push(entry);
  }

  const existing = await deps.reader.listEntities();
  const takenTitles = existing.map((entity) => entity.title);
  const takenIds = new Set(existing.map((entity) => entity.id));

  const titleAssignments: TitleAssignment[] = [];
  const mintedIds: Record<string, string> = {};
  for (const entry of entries) {
    const { finalTitle, renamed } = resolveTitle(entry.title, takenTitles);
    takenTitles.push(finalTitle);

    const mintedId = mintUniqueId(finalTitle, takenIds);
    takenIds.add(mintedId);

    mintedIds[entry.id] = mintedId;
    titleAssignments.push({
      entryId: entry.id,
      originalTitle: entry.title,
      finalTitle,
      renamed,
    });
  }

  // One decision per template, however many entries depend on it (FR-016a).
  const templateDecisions: TemplateDecision[] = [];
  const seenTemplates = new Set<string>();
  for (const entry of entries) {
    if (
      entry.statSheetTemplate &&
      !seenTemplates.has(entry.statSheetTemplate.id)
    ) {
      seenTemplates.add(entry.statSheetTemplate.id);
      templateDecisions.push(
        decideTemplate({
          flavour: "schema",
          incoming: entry.statSheetTemplate,
          existing: await deps.reader.readStatSheetTemplate(
            entry.statSheetTemplate.id,
          ),
        }),
      );
    }
    if (
      entry.presentationTemplate &&
      !seenTemplates.has(entry.presentationTemplate.id)
    ) {
      seenTemplates.add(entry.presentationTemplate.id);
      templateDecisions.push(
        decideTemplate({
          flavour: "presentation",
          incoming: entry.presentationTemplate,
          existing: await deps.reader.readPresentationTemplate(
            entry.presentationTemplate.id,
          ),
        }),
      );
    }
  }

  const batch: BatchMember[] = entries.map((entry) => ({
    entryId: entry.id,
    sourceEntityId: entry.sourceEntityId,
    mintedId: mintedIds[entry.id],
  }));

  const connectionResolutions: ConnectionResolution[] = [];
  const parentResolutions: ParentResolution[] = [];
  for (const entry of entries) {
    const { metadata } = deps.codec.parse(entry.entityRecord);

    for (const connection of connectionsOf(metadata)) {
      const target = String(connection.target ?? "");
      if (!target) continue;
      const { resolvedId, reason } = resolveReference({
        ref: target,
        referencedTitles: entry.referencedTitles,
        batch,
        existing,
      });
      connectionResolutions.push({
        entryId: entry.id,
        targetRef: target,
        type: String(connection.type ?? "related_to"),
        label:
          typeof connection.label === "string" ? connection.label : undefined,
        resolvedTargetId: resolvedId,
        reason,
      });
    }

    if (typeof metadata.parent === "string" && metadata.parent) {
      const { resolvedId, reason } = resolveReference({
        ref: metadata.parent,
        referencedTitles: entry.referencedTitles,
        batch,
        existing,
      });
      parentResolutions.push({
        entryId: entry.id,
        parentRef: metadata.parent,
        resolvedParentId: resolvedId,
        reason,
      });
    }
  }

  return {
    importId: deps.ids.next(),
    targetVaultId: input.targetVaultId,
    entries,
    mintedIds,
    titleAssignments,
    templateDecisions,
    connectionResolutions,
    parentResolutions,
  };
}

/**
 * Records the author's answer to one template conflict.
 *
 * "bring-in" does not replace the vault's existing template — see
 * `buildTemplateWritePlan` for why.
 */
export function chooseTemplate(
  plan: ImportPlan,
  templateId: string,
  choice: "keep-existing" | "bring-in",
): ImportPlan {
  return {
    ...plan,
    templateDecisions: plan.templateDecisions.map((decision) =>
      decision.templateId === templateId && decision.unresolved
        ? {
            ...decision,
            kind:
              choice === "keep-existing"
                ? "conflict-keep-existing"
                : "conflict-bring-in",
            unresolved: false,
          }
        : decision,
    ),
  };
}

/**
 * Works out which templates this import will create.
 *
 * When the author chooses to bring their own template in over a conflicting
 * one, it is written under a **fresh id** rather than replacing what the vault
 * already holds. Replacing would put a pre-existing record on the rollback
 * list, which is exactly what invariant J2 forbids: rollback would then delete
 * a template this import never created. A second template is the only reading
 * of "bring mine in" that keeps deletion safe.
 */
function buildTemplateWritePlan(
  plan: ImportPlan,
  takenSchemaIds: Set<string>,
  takenPresentationIds: Set<string>,
): TemplateWritePlan {
  const result: TemplateWritePlan = {
    schema: new Map(),
    presentation: new Map(),
    remap: new Map(),
    reused: [],
  };

  const decisionFor = (id: string) =>
    plan.templateDecisions.find((decision) => decision.templateId === id);

  for (const entry of plan.entries) {
    for (const template of [
      entry.statSheetTemplate,
      entry.presentationTemplate,
    ]) {
      if (!template) continue;
      const decision = decisionFor(template.id);
      if (!decision) continue;

      const isSchema = decision.flavour === "schema";
      const taken = isSchema ? takenSchemaIds : takenPresentationIds;

      if (
        decision.kind === "reuse-existing" ||
        decision.kind === "conflict-keep-existing"
      ) {
        if (!result.reused.includes(template.id))
          result.reused.push(template.id);
        continue;
      }

      const targetId =
        decision.kind === "conflict-bring-in"
          ? mintUniqueId(`${template.name} imported`, taken)
          : template.id;
      taken.add(targetId);
      result.remap.set(template.id, targetId);

      if (isSchema) {
        result.schema.set(targetId, {
          ...(template as StatSheetTemplate),
          id: targetId,
        });
      } else {
        result.presentation.set(targetId, {
          ...(template as PresentationTemplate),
          id: targetId,
          vaultId: plan.targetVaultId,
        });
      }
    }
  }

  // A presentation template must keep pointing at whichever schema template id
  // its entries ended up using.
  for (const [id, template] of result.presentation) {
    const remapped = result.remap.get(template.schemaTemplateId);
    if (remapped && remapped !== template.schemaTemplateId) {
      result.presentation.set(id, { ...template, schemaTemplateId: remapped });
    }
  }

  return result;
}

/** Rewrites one shelved record for its new home. */
function rebuildRecord(
  deps: ImportDeps,
  plan: ImportPlan,
  entry: ShelfEntry,
  entityId: string,
  assetRefs: Map<string, string>,
  templates: TemplateWritePlan,
): string {
  const { metadata, content } = deps.codec.parse(entry.entityRecord);
  const next: Record<string, unknown> = { ...metadata };

  next.id = entityId;
  next.title =
    plan.titleAssignments.find((a) => a.entryId === entry.id)?.finalTitle ??
    entry.title;

  const image = assetRefs.get("image");
  if (image) next.image = image;
  const thumbnail = assetRefs.get("thumbnail");
  if (thumbnail) next.thumbnail = thumbnail;
  const audio = assetRefs.get("soundBite");
  if (audio && next.soundBite && typeof next.soundBite === "object") {
    next.soundBite = { ...(next.soundBite as object), audioFile: audio };
  }

  next.connections = plan.connectionResolutions
    .filter((r) => r.entryId === entry.id && r.resolvedTargetId)
    .map((r) => ({
      target: r.resolvedTargetId as string,
      type: r.type,
      ...(r.label ? { label: r.label } : {}),
    }));

  const parent = plan.parentResolutions.find((r) => r.entryId === entry.id);
  if (parent) {
    if (parent.resolvedParentId) next.parent = parent.resolvedParentId;
    else delete next.parent;
  }

  const sheet = next.statSheet as Record<string, unknown> | undefined;
  if (sheet) {
    const nextSheet = { ...sheet };
    if (typeof sheet.templateId === "string") {
      nextSheet.templateId =
        templates.remap.get(sheet.templateId) ?? sheet.templateId;
    }
    if (typeof sheet.presentationTemplateId === "string") {
      nextSheet.presentationTemplateId =
        templates.remap.get(sheet.presentationTemplateId) ??
        sheet.presentationTemplateId;
    }
    next.statSheet = nextSheet;
  }

  return deps.codec.stringify(next, content);
}

async function rollback(
  writer: VaultWriter,
  journal: ImportJournal,
): Promise<void> {
  // Every delete is idempotent: the failure may have prevented some of these
  // from ever existing (invariant J3).
  for (const entityId of journal.entityIds) {
    await writer.deleteEntityAssets(entityId).catch(() => {});
    await writer.deleteEntity(entityId).catch(() => {});
  }
  for (const id of journal.schemaTemplateIds) {
    await writer.deleteStatSheetTemplate(id).catch(() => {});
  }
  for (const id of journal.presentationTemplateIds) {
    await writer.deletePresentationTemplate(id).catch(() => {});
  }
}

/**
 * Writes a resolved plan into the target vault, all or nothing.
 *
 * There is no transaction spanning IndexedDB and OPFS, so atomicity is a
 * journal plus compensating deletes. That is sound only because import never
 * overwrites (FR-013) and never reuses a title (FR-013a): everything the
 * journal lists was created by this import, so undoing it cannot destroy
 * anything the author had before (invariant J2, research R1).
 */
export async function executeImport(
  deps: ImportDeps,
  plan: ImportPlan,
  onProgress?: ProgressFn,
): Promise<ImportOutcome> {
  const unresolved = plan.templateDecisions.filter(
    (decision) => decision.unresolved,
  );
  if (unresolved.length > 0) {
    throw new Error(
      `Cannot import while ${unresolved.length} template conflict(s) remain unresolved.`,
    );
  }

  const existing = await deps.reader.listEntities();
  const takenSchemaIds = new Set<string>();
  const takenPresentationIds = new Set<string>();
  for (const entry of plan.entries) {
    if (entry.statSheetTemplate) takenSchemaIds.add(entry.statSheetTemplate.id);
    if (entry.presentationTemplate)
      takenPresentationIds.add(entry.presentationTemplate.id);
  }
  for (const entity of existing) takenSchemaIds.add(entity.id);

  const templates = buildTemplateWritePlan(
    plan,
    takenSchemaIds,
    takenPresentationIds,
  );

  const journal: ImportJournal = {
    importId: plan.importId,
    vaultId: plan.targetVaultId,
    startedAt: deps.clock.now(),
    entityIds: plan.entries.map((entry) => plan.mintedIds[entry.id]),
    schemaTemplateIds: [...templates.schema.keys()],
    presentationTemplateIds: [...templates.presentation.keys()],
  };
  await deps.store.writeJournal(journal);

  const created: ImportOutcome["created"] = [];

  try {
    for (const [index, entry] of plan.entries.entries()) {
      const entityId = plan.mintedIds[entry.id];

      const assetRefs = new Map<string, string>();
      for (const asset of entry.assets) {
        const { ref } = await deps.writer.saveAsset({
          entityId,
          role: asset.role,
          bytes: asset.bytes,
          mimeType: asset.mimeType,
          originalName: asset.originalName,
        });
        assetRefs.set(asset.role, ref);
      }

      const record = rebuildRecord(
        deps,
        plan,
        entry,
        entityId,
        assetRefs,
        templates,
      );
      await deps.writer.createEntity({ id: entityId, record });

      const title =
        plan.titleAssignments.find((a) => a.entryId === entry.id)?.finalTitle ??
        entry.title;
      created.push({ entityId, title });
      onProgress?.({
        completed: index + 1,
        total: plan.entries.length,
        label: title,
      });
    }

    for (const template of templates.schema.values()) {
      await deps.writer.saveStatSheetTemplate(template);
    }
    for (const template of templates.presentation.values()) {
      await deps.writer.savePresentationTemplate(template);
    }
  } catch (cause) {
    await rollback(deps.writer, journal);
    await deps.store.deleteJournal(journal.importId);
    throw new Error(
      "The import could not be completed, so nothing was added to this vault.",
      { cause },
    );
  }

  await deps.store.deleteJournal(journal.importId);

  return {
    created,
    renamed: plan.titleAssignments
      .filter((a) => a.renamed)
      .map((a) => ({ from: a.originalTitle, to: a.finalTitle })),
    templatesReused: templates.reused,
    templatesBroughtIn: [
      ...templates.schema.keys(),
      ...templates.presentation.keys(),
    ],
    templatesChosenBetween: plan.templateDecisions
      .filter(
        (d) =>
          d.kind === "conflict-keep-existing" || d.kind === "conflict-bring-in",
      )
      .map((d) => d.templateId),
    droppedConnections: plan.connectionResolutions.filter(
      (r) => !r.resolvedTargetId,
    ),
    droppedParents: plan.parentResolutions.filter((r) => !r.resolvedParentId),
  };
}

/**
 * Undoes any import that never finished — a crashed tab, a closed browser.
 *
 * Run at startup, before the shelf becomes usable, so a half-written import
 * from a previous session cannot be mistaken for real content.
 */
export async function recoverCrashedImports(
  deps: { store: ShelfStore },
  writerFor: (vaultId: string) => VaultWriter,
): Promise<void> {
  for (const journal of await deps.store.readJournals()) {
    await rollback(writerFor(journal.vaultId), journal);
    await deps.store.deleteJournal(journal.importId);
  }
}
