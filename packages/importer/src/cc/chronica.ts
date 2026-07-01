import type {
  CCImportPackage,
  EntityDraft,
  ImportWarning,
  RelationshipDraft,
} from "./package";
import { htmlToMarkdown } from "../utils";

export interface ChronicaExportDocument {
  fileName?: string;
  json: unknown;
}

export interface ChronicaExportSummary {
  campaignId: string;
  campaignName: string;
  domains: string[];
  fileName?: string;
}

export interface ChronicaExportGroup {
  campaignId: string;
  campaignName: string;
  documents: ChronicaExportDocument[];
  summaries: ChronicaExportSummary[];
}

export interface ChronicaExportGroupResult {
  groups: ChronicaExportGroup[];
}

interface ChronicaRecord {
  domain: string;
  id: string;
  sourceId: string;
  sourcePath: string;
  sourceType: string;
  title: string;
  content: string;
  lore?: string;
  metadata?: Record<string, unknown>;
  referenceTargets: string[];
}

export interface ChronicaCampaignSource {
  campaignId: string;
  campaignName: string;
  metadata: Record<string, unknown>;
  records: ChronicaRecord[];
  warnings: ImportWarning[];
}

type ChronicaCampaignObject = Record<string, unknown> & {
  id?: unknown;
  name?: unknown;
};

const CAMPAIGN_METADATA_KEYS = new Set([
  "id",
  "name",
  "about",
  "created_at",
  "updated_at",
  "gm_secrets",
  "game_system",
  "party_wealth",
  "players_count",
]);

const IMPORTABLE_DOMAINS = new Set([
  "characters",
  "places",
  "quests",
  "adventure_notes",
  "encounters",
  "entities",
  "entity_folders",
  "kinships",
  "kinship_folders",
  "maps",
]);

const NON_ENTITY_WARNING_DOMAINS = new Set(["stat_groups", "stats"]);

const getCampaignObject = (input: unknown): ChronicaCampaignObject | null => {
  if (!input || typeof input !== "object") return null;
  const root = input as Record<string, unknown>;
  if (!("campaign" in root) || !("export_created_at" in root)) return null;
  if (!root.campaign || typeof root.campaign !== "object") return null;
  return root.campaign as ChronicaCampaignObject;
};

const asArray = <T>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
};

const contentFromRecord = (
  record: Record<string, unknown>,
  keys: string[],
): string => {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return htmlToMarkdown(value);
  }
  return "";
};

const loreFromRecord = (
  record: Record<string, unknown>,
  keys: string[],
): string | undefined => {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return htmlToMarkdown(value);
  }
  return undefined;
};

const makeSourceId = (campaignId: string, domain: string, id: string) =>
  `${campaignId}:${domain}:${id}`;

const makeSourcePath = (campaignId: string, domain: string, id: string) =>
  `/chronica/${campaignId}/${domain}/${id}`;

const normalizeMetadata = (
  record: Record<string, unknown>,
  base: Record<string, unknown>,
) => {
  const metadata = { ...base };
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    metadata[key] = value;
  }
  return metadata;
};

const collectReferenceTargets = (record: Record<string, unknown>): string[] => {
  const refs: string[] = [];
  const mapping: Array<[string, string]> = [
    ["place_id", "places"],
    ["character_id", "characters"],
    ["character_alt_id", "characters"],
    ["kinship_id", "kinships"],
    ["quest_id", "quests"],
    ["entity_id", "entities"],
  ];

  for (const [key, domain] of mapping) {
    const id = asString(record[key]);
    if (!id) continue;
    refs.push(`${domain}:${id}`);
  }

  return refs;
};

const makeDraftFromRecord = (
  campaignId: string,
  domain: string,
  record: Record<string, unknown>,
  options: {
    sourceType: string;
    titleKeys: string[];
    contentKeys: string[];
    loreKeys?: string[];
    metadata?: Record<string, unknown>;
  },
): ChronicaRecord | null => {
  const id = asString(record.id);
  if (!id) return null;

  const title =
    options.titleKeys.map((key) => asString(record[key])).find(Boolean) ??
    `${domain}:${id}`;

  return {
    domain,
    id,
    sourceId: makeSourceId(campaignId, domain, id),
    sourcePath: makeSourcePath(campaignId, domain, id),
    sourceType: options.sourceType,
    title,
    content: contentFromRecord(record, options.contentKeys),
    lore: options.loreKeys
      ? loreFromRecord(record, options.loreKeys)
      : undefined,
    metadata: normalizeMetadata(record, options.metadata ?? {}),
    referenceTargets: collectReferenceTargets(record),
  };
};

const walkFolderRecords = (
  campaignId: string,
  folders: unknown[],
  childKey: string,
  folderPath: string[],
  sourceType: string,
  domain: string,
): ChronicaRecord[] => {
  const records: ChronicaRecord[] = [];

  for (const folderValue of folders) {
    const folder = asRecord(folderValue);
    if (!folder) continue;

    const folderName = asString(folder.name) ?? "Folder";
    const nextPath = [...folderPath, folderName];

    for (const childValue of asArray(folder[childKey])) {
      const child = asRecord(childValue);
      if (!child) continue;

      const record = makeDraftFromRecord(campaignId, domain, child, {
        sourceType:
          childKey === "entities"
            ? asString(child.entity_type)?.toLowerCase() === "item"
              ? "item"
              : "note"
            : sourceType,
        titleKeys: ["name", "title"],
        contentKeys: ["description", "content", "notes", "about"],
        loreKeys: ["gm_secrets"],
        metadata: { folderLineage: nextPath },
      });
      if (record) records.push(record);
    }

    const nested = asArray(
      folder[childKey === "entities" ? "entity_folders" : "kinship_folders"],
    );
    if (nested.length > 0) {
      records.push(
        ...walkFolderRecords(
          campaignId,
          nested,
          childKey,
          nextPath,
          sourceType,
          domain,
        ),
      );
    }
  }

  return records;
};

export function detectChronicaExport(
  input: unknown,
): ChronicaExportSummary | null {
  const campaign = getCampaignObject(input);
  if (!campaign) return null;

  const campaignId = asString(campaign.id);
  const campaignName = asString(campaign.name);
  if (!campaignId || !campaignName) return null;

  const domains = Object.keys(campaign).filter((key) => {
    if (CAMPAIGN_METADATA_KEYS.has(key)) return false;
    const value = campaign[key];
    return Array.isArray(value) && value.length > 0;
  });

  return {
    campaignId,
    campaignName,
    domains,
  };
}

export function groupChronicaExports(
  documents: ChronicaExportDocument[],
): ChronicaExportGroupResult {
  const grouped = new Map<string, ChronicaExportGroup>();

  for (const document of documents) {
    const summary = detectChronicaExport(document.json);
    if (!summary) {
      throw new Error(
        `${document.fileName ?? "Chronica document"} is not a supported Chronica export`,
      );
    }

    if (!summary.domains.some((domain) => IMPORTABLE_DOMAINS.has(domain))) {
      throw new Error(
        `${document.fileName ?? "Chronica document"} does not contain any importable Chronica records`,
      );
    }

    const existing = grouped.get(summary.campaignId);
    if (!existing) {
      grouped.set(summary.campaignId, {
        campaignId: summary.campaignId,
        campaignName: summary.campaignName,
        documents: [document],
        summaries: [{ ...summary, fileName: document.fileName }],
      });
      continue;
    }

    existing.documents.push(document);
    existing.summaries.push({ ...summary, fileName: document.fileName });
  }

  if (grouped.size > 1) {
    throw new Error("Chronica imports cannot mix multiple campaigns");
  }

  return { groups: [...grouped.values()] };
}

export function assembleChronicaCampaign(
  group: ChronicaExportGroup,
): ChronicaCampaignSource {
  const records: ChronicaRecord[] = [];
  const warnings: ImportWarning[] = [];
  const metadata: Record<string, unknown> = {};
  const dedupe = new Map<string, string>();

  for (const document of group.documents) {
    const campaign = getCampaignObject(document.json);
    if (!campaign) {
      throw new Error(
        `${document.fileName ?? "Chronica document"} is not a supported Chronica export`,
      );
    }

    const currentCampaignId = asString(campaign.id);
    if (currentCampaignId !== group.campaignId) {
      throw new Error("Chronica imports cannot mix multiple campaigns");
    }

    for (const key of CAMPAIGN_METADATA_KEYS) {
      if (campaign[key] !== undefined) metadata[key] = campaign[key];
    }

    for (const domain of NON_ENTITY_WARNING_DOMAINS) {
      const entries = asArray(campaign[domain]);
      if (entries.length > 0) {
        warnings.push({
          code: "CHRONICA_METADATA_ONLY_DOMAIN",
          message: `${domain} is preserved as metadata only in the first Chronica import pass`,
          ref: document.fileName,
        });
      }
    }

    const pushRecord = (record: ChronicaRecord | null) => {
      if (!record) return;
      const key = `${record.sourceType}:${record.sourceId}`;
      const serialized = JSON.stringify(record);
      const previous = dedupe.get(key);
      if (previous !== undefined) {
        if (previous !== serialized) {
          throw new Error(
            `Conflicting Chronica record detected for ${record.sourceId}`,
          );
        }
        return;
      }
      dedupe.set(key, serialized);
      records.push(record);
    };

    for (const value of asArray(campaign.characters)) {
      pushRecord(
        makeDraftFromRecord(
          group.campaignId,
          "characters",
          asRecord(value) ?? {},
          {
            sourceType: "character",
            titleKeys: ["name", "title"],
            contentKeys: ["description", "content", "notes", "about"],
            loreKeys: ["gm_secrets"],
          },
        ),
      );
    }

    for (const value of asArray(campaign.places)) {
      pushRecord(
        makeDraftFromRecord(group.campaignId, "places", asRecord(value) ?? {}, {
          sourceType: "place",
          titleKeys: ["name", "title"],
          contentKeys: ["description", "content", "notes", "about"],
          loreKeys: ["gm_secrets"],
        }),
      );
    }

    for (const value of asArray(campaign.quests)) {
      pushRecord(
        makeDraftFromRecord(group.campaignId, "quests", asRecord(value) ?? {}, {
          sourceType: "note",
          titleKeys: ["name", "title"],
          contentKeys: ["description", "content", "notes", "about"],
          loreKeys: ["gm_secrets"],
          metadata: { chronicaDomain: "quest" },
        }),
      );
    }

    for (const value of asArray(campaign.adventure_notes)) {
      pushRecord(
        makeDraftFromRecord(
          group.campaignId,
          "adventure_notes",
          asRecord(value) ?? {},
          {
            sourceType: "note",
            titleKeys: ["name", "title"],
            contentKeys: ["description", "content", "notes", "about"],
            loreKeys: ["gm_secrets"],
          },
        ),
      );
    }

    for (const value of asArray(campaign.encounters)) {
      pushRecord(
        makeDraftFromRecord(
          group.campaignId,
          "encounters",
          asRecord(value) ?? {},
          {
            sourceType: "event",
            titleKeys: ["name", "title"],
            contentKeys: ["description", "content", "notes", "about"],
            loreKeys: ["gm_secrets"],
          },
        ),
      );
    }

    for (const value of asArray(campaign.entities)) {
      const record = asRecord(value);
      if (!record) continue;
      const entityType = asString(record.entity_type)?.toLowerCase();
      pushRecord(
        makeDraftFromRecord(group.campaignId, "entities", record, {
          sourceType: entityType === "item" ? "item" : "note",
          titleKeys: ["name", "title"],
          contentKeys: ["description", "content", "notes", "about"],
          loreKeys: ["gm_secrets"],
          metadata: { chronicaEntityType: entityType ?? "unknown" },
        }),
      );
    }

    for (const record of walkFolderRecords(
      group.campaignId,
      asArray(campaign.entity_folders),
      "entities",
      [],
      "note",
      "entity_folders",
    )) {
      pushRecord(record);
    }

    for (const value of asArray(campaign.kinships)) {
      pushRecord(
        makeDraftFromRecord(
          group.campaignId,
          "kinships",
          asRecord(value) ?? {},
          {
            sourceType: "faction",
            titleKeys: ["name", "title"],
            contentKeys: ["description", "content", "notes", "about"],
            loreKeys: ["gm_secrets"],
          },
        ),
      );
    }

    for (const record of walkFolderRecords(
      group.campaignId,
      asArray(campaign.kinship_folders),
      "kinships",
      [],
      "faction",
      "kinship_folders",
    )) {
      pushRecord(record);
    }

    for (const value of asArray(campaign.maps)) {
      pushRecord(
        makeDraftFromRecord(group.campaignId, "maps", asRecord(value) ?? {}, {
          sourceType: "note",
          titleKeys: ["name", "title"],
          contentKeys: ["description", "content", "notes", "about"],
          loreKeys: ["gm_secrets"],
          metadata: { chronicaDomain: "map" },
        }),
      );
    }
  }

  return {
    campaignId: group.campaignId,
    campaignName: group.campaignName,
    metadata,
    records,
    warnings,
  };
}

export function parseChronicaExports(
  documents: ChronicaExportDocument[],
): CCImportPackage {
  const { groups } = groupChronicaExports(documents);
  const group = groups[0];
  if (!group) {
    throw new Error("No Chronica exports were provided");
  }

  const assembled = assembleChronicaCampaign(group);
  if (assembled.records.length === 0) {
    throw new Error(
      "Chronica selection does not contain any importable records",
    );
  }

  const entityDrafts: EntityDraft[] = assembled.records.map((record) => ({
    sourceId: record.sourceId,
    sourcePath: record.sourcePath,
    sourceType: record.sourceType,
    title: record.title,
    content: record.content,
    lore: record.lore,
    tags: [],
    metadata: record.metadata,
  }));

  const sourceRefIndex = new Map<string, string>();
  for (const draft of entityDrafts) {
    const refType = draft.sourceType ?? "note";
    const sourceId = draft.sourceId ?? "";
    const [, domain, id] = sourceId.split(":", 3);
    sourceRefIndex.set(`${domain}:${id}`, `chronica:${refType}:${sourceId}`);
  }

  const relationshipDrafts: RelationshipDraft[] = [];
  for (const record of assembled.records) {
    const fromRef = `chronica:${record.sourceType}:${record.sourceId}`;
    for (const target of record.referenceTargets) {
      const [targetDomain, targetId] = target.split(":", 2);
      const toRef =
        sourceRefIndex.get(`${targetDomain}:${targetId}`) ??
        `chronica:${target}`;
      relationshipDrafts.push({
        fromRef,
        toRef,
        type: "related_to",
      });
    }
  }

  return {
    version: "1.0",
    sourceSystem: "chronica",
    sourceLabel: `Chronica Campaign ${assembled.campaignName}`,
    entityDrafts,
    relationshipDrafts,
    assetDrafts: [],
    warnings: assembled.warnings,
  };
}
