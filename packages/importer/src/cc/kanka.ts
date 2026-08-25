import { htmlToMarkdown } from "../utils";
import { sha256Hex } from "../cif/zip";
import type {
  AssetDraft,
  CCImportPackage,
  EntityDraft,
  ImportWarning,
  RelationshipDraft,
} from "./package";
import { CCImportPackageSchema } from "./package";
import { buildSourceRef } from "./source-ref";
import {
  asKankaString as asString,
  isKankaRecord as isRecord,
  parseKankaJson as parseJson,
  readKankaArchive,
  type KankaJsonRecord as JsonRecord,
} from "./kanka-archive";

interface ParsedKankaEntity {
  draft: EntityDraft;
  entityId: string;
  sourceRef: string;
  rawEntity: JsonRecord;
}

const KANKA_TYPE_MAP: Record<string, string> = {
  abilities: "note",
  ability: "note",
  calendars: "note",
  calendar: "note",
  characters: "character",
  character: "character",
  creatures: "creature",
  creature: "creature",
  events: "event",
  event: "event",
  families: "faction",
  family: "faction",
  items: "item",
  item: "item",
  journals: "note",
  journal: "note",
  locations: "location",
  location: "location",
  maps: "note",
  map: "note",
  notes: "note",
  note: "note",
  organisations: "faction",
  organisation: "faction",
  organizations: "faction",
  organization: "faction",
  quests: "quest",
  quest: "quest",
  races: "species",
  race: "species",
  timelines: "event",
  timeline: "event",
};

const NON_ENTITY_ROOTS = new Set(["gallery", "settings"]);
const RESERVED_MODEL_FIELDS = new Set([
  "id",
  "name",
  "entity",
  "created_at",
  "updated_at",
  "campaign_id",
  "is_private",
]);

function asRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function singularize(value: string): string {
  if (value.endsWith("ies")) return `${value.slice(0, -3)}y`;
  if (value.endsWith("s")) return value.slice(0, -1);
  return value;
}

function sourceTypeFor(root: string): { sourceType: string; known: boolean } {
  const normalized = root.toLowerCase();
  return KANKA_TYPE_MAP[normalized]
    ? { sourceType: KANKA_TYPE_MAP[normalized], known: true }
    : { sourceType: "note", known: false };
}

function metadataFields(model: JsonRecord): JsonRecord {
  const fields: JsonRecord = {};
  for (const [key, value] of Object.entries(model)) {
    if (RESERVED_MODEL_FIELDS.has(key) || value === null) continue;
    if (["string", "number", "boolean"].includes(typeof value)) {
      fields[key] = value;
    }
  }
  return fields;
}

function attributesFrom(entity: JsonRecord): JsonRecord {
  const attributes: JsonRecord = {};
  const raw = entity.entityAttributes;
  if (!Array.isArray(raw)) return attributes;
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const name = asString(item.name)?.trim();
    if (!name) continue;
    attributes[name] = item.value ?? "";
  }
  return attributes;
}

function mimeTypeFor(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();
  return (
    {
      avif: "image/avif",
      gif: "image/gif",
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      png: "image/png",
      svg: "image/svg+xml",
      webp: "image/webp",
      pdf: "application/pdf",
    }[extension ?? ""] ?? "application/octet-stream"
  );
}

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

/**
 * Converts an official Kanka JSON campaign export ZIP into the generic import
 * package. This adapter is deliberately mechanical: it performs no AI calls
 * and has no vault dependency.
 */
export async function parseKankaExportZip(
  input: Blob | Uint8Array | ArrayBuffer,
): Promise<CCImportPackage> {
  const { files, kankaVersion } = await readKankaArchive(input);

  const campaignBytes = files.get("campaign.json");
  const campaign = campaignBytes
    ? parseJson(campaignBytes, "campaign.json")
    : {};
  const sourceLabel = asString(campaign.name)?.trim() || "Kanka Campaign";
  const warnings: ImportWarning[] = [];

  const galleryAssets = new Map<
    string,
    { path: string; bytes: Uint8Array; originalName: string }
  >();
  for (const [path, bytes] of files) {
    const match = path.match(/^gallery\/([^/]+)\.json$/i);
    if (!match) continue;
    const image = parseJson(bytes, path);
    if (image.is_folder === true || image.is_folder === 1) continue;
    const id = asString(image.id) ?? match[1];
    const extension = asString(image.ext)?.toLowerCase();
    if (!extension) continue;
    const assetPath = `gallery/${id}.${extension}`;
    const assetBytes = files.get(assetPath);
    if (!assetBytes) {
      warnings.push({
        code: "KANKA_GALLERY_ASSET_MISSING",
        message: `Gallery image metadata "${path}" references a missing file "${assetPath}".`,
        ref: id,
      });
      continue;
    }
    galleryAssets.set(id, {
      path: assetPath,
      bytes: assetBytes,
      originalName: basename(assetPath),
    });
  }

  const tagNames = new Map<string, string>();
  for (const [path, bytes] of files) {
    if (!/^tags\/[^/]+\.json$/i.test(path)) continue;
    const tag = parseJson(bytes, path);
    const id = asString(tag.id);
    const name = asString(tag.name)?.trim();
    if (id && name) tagNames.set(id, name);
  }

  const parsedEntities: ParsedKankaEntity[] = [];
  const byEntityId = new Map<string, ParsedKankaEntity>();
  for (const [path, bytes] of files) {
    const match = path.match(/^([^/]+)\/[^/]+\.json$/i);
    if (!match) continue;
    const root = match[1].toLowerCase();
    if (NON_ENTITY_ROOTS.has(root) || root === "tags") continue;

    const model = parseJson(bytes, path);
    const entity = asRecord(model.entity);
    const entityId = asString(entity.id);
    const title = asString(model.name)?.trim() || asString(entity.name)?.trim();
    if (!entityId || !title) {
      warnings.push({
        code: "KANKA_ENTITY_SKIPPED",
        message: `Skipped "${path}" because it has no entity ID or name.`,
        ref: path,
      });
      continue;
    }

    const { sourceType, known } = sourceTypeFor(root);
    const kankaType = singularize(root);
    if (!known) {
      warnings.push({
        code: "KANKA_UNKNOWN_TYPE",
        message: `Kanka type "${kankaType}" has no direct Codex type and was preserved as a note.`,
        ref: entityId,
      });
    }

    const labels: string[] = [];
    if (Array.isArray(entity.entityTags)) {
      for (const rawTag of entity.entityTags) {
        if (!isRecord(rawTag)) continue;
        const tagId = asString(rawTag.tag_id);
        const label = tagId ? tagNames.get(tagId) : undefined;
        if (label) labels.push(label);
        else if (tagId) {
          warnings.push({
            code: "KANKA_TAG_UNRESOLVED",
            message: `Could not resolve Kanka tag ${tagId} on "${title}".`,
            ref: tagId,
          });
        }
      }
    }

    const attributes = attributesFrom(entity);
    const fields = metadataFields(model);
    const sourceRef = buildSourceRef("kanka", sourceType, { id: entityId });
    const draft: EntityDraft = {
      sourceId: entityId,
      sourcePath: path,
      sourceType,
      title,
      content: htmlToMarkdown(asString(entity.entry) ?? ""),
      labels: [...new Set(labels)],
      metadata: {
        kankaType,
        kankaEntityId: Number.isNaN(Number(entityId))
          ? entityId
          : Number(entityId),
        ...(model.id === undefined
          ? {}
          : {
              kankaModelId: Number.isNaN(Number(model.id))
                ? model.id
                : Number(model.id),
            }),
        kankaVersion,
        ...(Object.keys(attributes).length > 0 ? { attributes } : {}),
        ...(Object.keys(fields).length > 0 ? { fields } : {}),
      },
    };
    const parsed = { draft, entityId, sourceRef, rawEntity: entity };
    parsedEntities.push(parsed);
    byEntityId.set(entityId, parsed);
  }

  const relationshipDrafts: RelationshipDraft[] = [];
  for (const parsed of parsedEntities) {
    const parentId = asString(parsed.rawEntity.parent_id);
    if (parentId) {
      const parent = byEntityId.get(parentId);
      if (parent) parsed.draft.parentRef = parent.sourceRef;
      else {
        warnings.push({
          code: "KANKA_PARENT_UNRESOLVED",
          message: `Could not resolve parent ${parentId} for "${parsed.draft.title}".`,
          ref: parentId,
        });
      }
    }

    const relationships = parsed.rawEntity.relationships;
    if (!Array.isArray(relationships)) continue;
    for (const rawRelationship of relationships) {
      if (!isRecord(rawRelationship)) continue;
      const targetId = asString(rawRelationship.target_id);
      const target = targetId ? byEntityId.get(targetId) : undefined;
      if (!targetId || !target) {
        warnings.push({
          code: "KANKA_UNRESOLVED_RELATIONSHIP",
          message: `Could not resolve a relationship from "${parsed.draft.title}" to Kanka entity ${targetId ?? "unknown"}.`,
          ref: targetId,
        });
        continue;
      }
      relationshipDrafts.push({
        fromRef: parsed.sourceRef,
        toRef: target.sourceRef,
        type: "related_to",
        label: asString(rawRelationship.relation)?.trim() || undefined,
      });
    }
  }

  const assetDrafts: AssetDraft[] = [];
  const linkedGalleryIds = new Set<string>();
  for (const parsed of parsedEntities) {
    const candidatePaths = new Set<string>();
    for (const key of ["image_path", "header_image"] as const) {
      const path = asString(parsed.rawEntity[key]);
      if (path) candidatePaths.add(path);
    }
    if (Array.isArray(parsed.rawEntity.assets)) {
      for (const rawAsset of parsed.rawEntity.assets) {
        if (!isRecord(rawAsset)) continue;
        const path = asString(asRecord(rawAsset.metadata).path);
        if (path) candidatePaths.add(path);
      }
    }

    for (const path of candidatePaths) {
      const bytes = files.get(path);
      if (!bytes) {
        warnings.push({
          code: "KANKA_ASSET_MISSING",
          message: `The asset "${path}" referenced by "${parsed.draft.title}" is missing from the ZIP.`,
          ref: parsed.entityId,
        });
        continue;
      }
      const contentHash = await sha256Hex(bytes);
      assetDrafts.push({
        id: `kanka:${parsed.entityId}:${contentHash}`,
        bytes,
        originalName: basename(path),
        mimeType: mimeTypeFor(path),
        placementRef: parsed.sourceRef,
        contentHash,
      });
    }

    for (const key of ["image_uuid", "header_uuid"] as const) {
      const galleryId = asString(parsed.rawEntity[key]);
      if (!galleryId) continue;
      const galleryAsset = galleryAssets.get(galleryId);
      if (!galleryAsset) {
        warnings.push({
          code: "KANKA_GALLERY_REFERENCE_UNRESOLVED",
          message: `The gallery image ${galleryId} referenced by "${parsed.draft.title}" could not be resolved.`,
          ref: parsed.entityId,
        });
        continue;
      }
      linkedGalleryIds.add(galleryId);
      const contentHash = await sha256Hex(galleryAsset.bytes);
      assetDrafts.push({
        id: `kanka:${parsed.entityId}:${galleryId}:${contentHash}`,
        bytes: galleryAsset.bytes,
        originalName: galleryAsset.originalName,
        mimeType: mimeTypeFor(galleryAsset.path),
        placementRef: parsed.sourceRef,
        contentHash,
      });
    }
  }

  for (const galleryId of galleryAssets.keys()) {
    if (linkedGalleryIds.has(galleryId)) continue;
    warnings.push({
      code: "KANKA_GALLERY_ASSET_UNLINKED",
      message: `Gallery image ${galleryId} is not linked to an imported entity, so it was left in the source ZIP.`,
      ref: galleryId,
    });
  }

  return CCImportPackageSchema.parse({
    version: "1.0",
    sourceSystem: "kanka",
    sourceLabel,
    entityDrafts: parsedEntities.map(({ draft }) => draft),
    relationshipDrafts,
    assetDrafts,
    warnings,
  });
}
