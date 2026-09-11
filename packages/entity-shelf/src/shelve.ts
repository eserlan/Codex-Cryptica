import type { PresentationTemplate, StatSheetTemplate } from "schema";
import type {
  Clock,
  IdFactory,
  RecordCodec,
  ShelfStore,
  VaultReader,
} from "./ports";
import type {
  ProgressFn,
  ShelfAsset,
  ShelfAssetRole,
  ShelfEntry,
  ShelfGroup,
} from "./types";

export interface ShelveDeps {
  store: ShelfStore;
  reader: VaultReader;
  codec: RecordCodec;
  clock: Clock;
  ids: IdFactory;
}

export interface ShelveInput {
  vaultId: string;
  vaultName: string;
  entityIds: string[];
}

/** Where each asset role's path lives in the entity's frontmatter. */
interface AssetReference {
  role: ShelfAssetRole;
  path: string;
}

/**
 * Reads the three asset references an entity can carry.
 *
 * Sound bite audio is the one that gets forgotten: it sits at a vault-relative
 * path inside `soundBite.audioFile` rather than alongside `image` and
 * `thumbnail`, so an entity shelved without it arrives looking perfectly
 * correct and fails only when someone presses play.
 */
function assetReferences(metadata: Record<string, unknown>): AssetReference[] {
  const refs: AssetReference[] = [];

  if (typeof metadata.image === "string" && metadata.image) {
    refs.push({ role: "image", path: metadata.image });
  }
  if (typeof metadata.thumbnail === "string" && metadata.thumbnail) {
    refs.push({ role: "thumbnail", path: metadata.thumbnail });
  }

  const soundBite = metadata.soundBite as { audioFile?: unknown } | undefined;
  if (
    soundBite &&
    typeof soundBite.audioFile === "string" &&
    soundBite.audioFile
  ) {
    refs.push({ role: "soundBite", path: soundBite.audioFile });
  }

  return refs;
}

function statSheetOf(metadata: Record<string, unknown>) {
  const sheet = metadata.statSheet as
    { templateId?: unknown; presentationTemplateId?: unknown } | undefined;
  return {
    templateId: typeof sheet?.templateId === "string" ? sheet.templateId : null,
    presentationTemplateId:
      typeof sheet?.presentationTemplateId === "string"
        ? sheet.presentationTemplateId
        : null,
  };
}

/**
 * Vault-scoped bookkeeping does not travel; it is reapplied on import (I3).
 * Schema templates carry no `vaultId` in their type — it is bolted on at
 * storage time — so it is dropped outright; presentation templates declare a
 * nullable one, so it is nulled rather than removed.
 */
function stripSchemaVaultId(template: StatSheetTemplate): StatSheetTemplate {
  const { vaultId: _vaultId, ...rest } = template as StatSheetTemplate & {
    vaultId?: unknown;
  };
  return rest as StatSheetTemplate;
}

function clearPresentationVaultId(
  template: PresentationTemplate,
): PresentationTemplate {
  return { ...template, vaultId: null };
}

/**
 * Snapshots the titles of everything the entity points at.
 *
 * Connections and `parent` store a source-vault id and nothing more, so
 * without this the destination has no name to match on and every reference
 * leaving the shelved set would be unresolvable however hard import tried.
 */
function snapshotReferencedTitles(
  metadata: Record<string, unknown>,
  vaultEntities: Map<string, { title: string; aliases: string[] }>,
): Record<string, { title: string; aliases: string[] }> {
  const refs = new Set<string>();

  const connections = Array.isArray(metadata.connections)
    ? metadata.connections
    : [];
  for (const connection of connections) {
    const target = (connection as { target?: unknown }).target;
    if (typeof target === "string" && target) refs.add(target);
  }
  if (typeof metadata.parent === "string" && metadata.parent)
    refs.add(metadata.parent);

  const snapshot: Record<string, { title: string; aliases: string[] }> = {};
  for (const ref of refs) {
    const found = vaultEntities.get(ref);
    if (found) snapshot[ref] = { title: found.title, aliases: found.aliases };
  }
  return snapshot;
}

async function buildEntry(
  deps: ShelveDeps,
  input: ShelveInput,
  entityId: string,
  groupId: string,
  vaultEntities: Map<string, { title: string; aliases: string[] }>,
): Promise<ShelfEntry> {
  const entityRecord = await deps.reader.readEntityRecord(entityId);
  const { metadata } = deps.codec.parse(entityRecord);

  const assets: ShelfAsset[] = [];
  for (const ref of assetReferences(metadata)) {
    const file = await deps.reader.readAsset(ref.path);
    // A source vault whose image has already gone is not a reason to refuse
    // the whole operation — shelve what is actually there.
    if (!file) continue;
    assets.push({
      role: ref.role,
      sourcePath: ref.path,
      bytes: file.bytes,
      mimeType: file.mimeType,
      originalName: file.originalName,
    });
  }

  const { templateId, presentationTemplateId } = statSheetOf(metadata);
  let statSheetTemplate: StatSheetTemplate | null = null;
  let presentationTemplate: PresentationTemplate | null = null;
  if (templateId) {
    const found = await deps.reader.readStatSheetTemplate(templateId);
    statSheetTemplate = found ? stripSchemaVaultId(found) : null;
  }
  if (presentationTemplateId) {
    const found = await deps.reader.readPresentationTemplate(
      presentationTemplateId,
    );
    presentationTemplate = found ? clearPresentationVaultId(found) : null;
  }

  const byteSize =
    entityRecord.length +
    assets.reduce((sum, asset) => sum + asset.bytes.size, 0);

  return {
    id: deps.ids.next(),
    groupId,
    entityRecord,
    sourceEntityId: entityId,
    sourceVaultId: input.vaultId,
    sourceVaultName: input.vaultName,
    title: String(metadata.title ?? entityId),
    type: String(metadata.type ?? "note"),
    shelvedAt: deps.clock.now(),
    assets,
    statSheetTemplate,
    presentationTemplate,
    referencedTitles: snapshotReferencedTitles(metadata, vaultEntities),
    byteSize,
  };
}

/**
 * Names the failure rather than guessing at it.
 *
 * An earlier version reported every failure as "there may not be enough
 * storage", which was wrong in the common case and actively unhelpful: it sent
 * people to clear space over a fault that had nothing to do with space, and
 * buried the real cause where nobody would look for it. Only a genuine quota
 * error earns the storage wording.
 */
function shelveFailureMessage(cause: unknown): string {
  const name = (cause as { name?: unknown } | null)?.name;
  const text = cause instanceof Error ? cause.message : String(cause);

  if (name === "QuotaExceededError" || /quota/i.test(text)) {
    return (
      "There is not enough storage left in this browser to put these entities " +
      "on the Shelf. Nothing was added — clearing Shelf entries you no longer " +
      "need will free space."
    );
  }

  return `Could not put these entities on the Shelf: ${text}. Nothing was added.`;
}

/**
 * Copies entities onto the shelf. Reads only — the source vault is never
 * written to (FR-010), which is what makes shelving safe to offer on a
 * right-click.
 *
 * If storage runs out part-way through, entries already written for this group
 * are removed before the error propagates, so an abandoned shelve leaves
 * nothing half-done behind (SC-007).
 */
export async function shelveEntities(
  deps: ShelveDeps,
  input: ShelveInput,
  onProgress?: ProgressFn,
): Promise<ShelfGroup> {
  const groupId = deps.ids.next();
  const shelvedAt = deps.clock.now();
  const written: ShelfEntry[] = [];

  // Read once for the whole batch: every entry snapshots reference titles
  // against the same view of the source vault.
  const vaultEntities = new Map(
    (await deps.reader.listEntities()).map((entity) => [
      entity.id,
      { title: entity.title, aliases: entity.aliases },
    ]),
  );

  try {
    for (const [index, entityId] of input.entityIds.entries()) {
      const entry = await buildEntry(
        deps,
        input,
        entityId,
        groupId,
        vaultEntities,
      );
      await deps.store.putEntry(entry);
      written.push(entry);
      onProgress?.({
        completed: index + 1,
        total: input.entityIds.length,
        label: entry.title,
      });
    }
  } catch (cause) {
    for (const entry of written) {
      await deps.store.removeEntry(entry.id).catch(() => {
        // Best effort: the original failure is the one worth reporting.
      });
    }
    throw new Error(shelveFailureMessage(cause), { cause });
  }

  return {
    id: groupId,
    shelvedAt,
    entries: written.map(
      ({
        entityRecord: _record,
        assets: _assets,
        statSheetTemplate: _schema,
        presentationTemplate: _presentation,
        referencedTitles: _referencedTitles,
        ...summary
      }) => summary,
    ),
  };
}
