import type {
  CCImportPackage,
  EntityDraft,
  ImportWarning,
  RelationshipDraft,
} from "./package";
import { htmlToMarkdown } from "../utils";

export function isScabardExport(jsonObj: unknown): boolean {
  return (
    !!jsonObj &&
    typeof jsonObj === "object" &&
    Array.isArray((jsonObj as { pages?: unknown[] }).pages) &&
    Array.isArray((jsonObj as { conns?: unknown[] }).conns)
  );
}

// Types matching the verified Scabard JSON structure
export interface ScabardConnection {
  from: string;
  fromid: number;
  to: string;
  toid: number;
  relationship: string;
  r?: Record<string, any>;
}

export interface ScabardPageDetails {
  id: number;
  name: string;
  concept: string;
  description?: string;
  gmSecrets?: string;
  aliases?: string;
  imageURL?: string;
  largeImageURL?: string;
  isSecret?: boolean;
  uri?: string;
}

export interface ScabardPageWrapper {
  concept: string;
  id: number;
  isGoldStar: boolean;
  page: ScabardPageDetails;
  uri: string;
}

export interface ScabardCampaignExport {
  conns: ScabardConnection[];
  pages: ScabardPageWrapper[];
}

const isStandardMetadataName = (name: string): boolean => {
  const n = name.toLowerCase();
  return [
    "character",
    "place",
    "location",
    "group",
    "faction",
    "item",
    "event",
    "vehicle",
    "vehicle type",
    "note",
    "ccategory",
    "category",
    "folder",
    "attribute",
    "alignment",
  ].includes(n);
};

const SCABARD_ASSET_BASE_URL = "https://www.scabard.com";

const normalizeScabardImageUrl = (
  value: string | undefined,
): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^(data:|blob:|https?:\/\/)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) {
    return new URL(trimmed, SCABARD_ASSET_BASE_URL).toString();
  }
  return trimmed;
};

/**
 * Parses a Scabard Campaign Export JSON structure and converts it into a CCImportPackage.
 */
export function parseScabardExport(
  jsonInput: string | object,
): CCImportPackage {
  let exportData: ScabardCampaignExport;
  if (typeof jsonInput === "string") {
    try {
      exportData = JSON.parse(jsonInput) as ScabardCampaignExport;
    } catch (err) {
      throw new Error(`Failed to parse Scabard export JSON: ${String(err)}`, {
        cause: err,
      });
    }
  } else {
    exportData = jsonInput as ScabardCampaignExport;
  }

  if (!exportData || typeof exportData !== "object") {
    throw new Error("Invalid Scabard export: input is not an object");
  }

  if (!Array.isArray(exportData.pages)) {
    throw new Error("Invalid Scabard export: missing 'pages' array");
  }

  const conns = Array.isArray(exportData.conns) ? exportData.conns : [];

  // Determine campaign name/id if possible, or fallback
  const firstWrapper = exportData.pages[0];
  const firstPage = firstWrapper?.page;
  const uriToMatch = firstPage?.uri || firstWrapper?.uri;
  const campaignIdMatch = uriToMatch?.match(/\/campaign\/(\d+)/);
  const campaignId = campaignIdMatch ? campaignIdMatch[1] : "unknown-campaign";

  const sourceLabel = `Scabard Campaign ${campaignId}`;

  const entityDrafts: EntityDraft[] = [];
  const relationshipDrafts: RelationshipDraft[] = [];
  const warnings: ImportWarning[] = [];

  // Map concept types
  const mapConceptType = (concept: string): string => {
    const c = concept.toLowerCase();
    switch (c) {
      case "character":
        return "Character";
      case "place":
        return "Location";
      case "group":
        return "Faction";
      case "item":
        return "Item";
      case "event":
        return "Event";
      case "vehicle":
      case "vehicle type":
        return "Item";
      case "note":
      case "ccategory":
      case "category":
      case "attribute":
      case "folder":
      default:
        return "Note";
    }
  };

  // Helper for Title Case
  const toTitleCase = (str: string): string => {
    return str
      .toLowerCase()
      .split(/[_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Helper for snake_case
  const toSnakeCase = (str: string): string => {
    return str
      .toUpperCase()
      .replace(/[\s-]+/g, "_")
      .toLowerCase();
  };

  const draftsMap = new Map<string, EntityDraft>();
  let metadataConnectionCount = 0;
  let labelConnectionCount = 0;
  let skippedStructuralConnectionCount = 0;
  let unresolvedEndpointConnectionCount = 0;

  // Pre-pass: Infer types from CATEGORY_OF and CONCEPT_OF connections where one side is a standard type name
  const inferredTypes = new Map<string, string>();

  const getStandardTypeFromCategoryName = (name: string): string | null => {
    const n = name.toLowerCase();
    if (n === "character") return "Character";
    if (n === "place" || n === "location") return "Location";
    if (n === "group" || n === "faction") return "Faction";
    if (n === "item" || n === "vehicle" || n === "vehicle type") return "Item";
    if (n === "event") return "Event";
    if (n === "note") return "Note";
    return null;
  };

  for (const conn of conns) {
    const relationshipType = conn.relationship || "RELATED_TO";
    const relationshipTypeUpper = relationshipType.toUpperCase();

    if (
      relationshipTypeUpper === "CATEGORY_OF" ||
      relationshipTypeUpper === "CONCEPT_OF" ||
      relationshipTypeUpper.endsWith("_CATEGORY_OF")
    ) {
      // Check Direction 1: conn.from is the category name, conn.toid is the target page
      const standardTypeFrom = getStandardTypeFromCategoryName(conn.from);
      if (standardTypeFrom) {
        inferredTypes.set(conn.toid.toString(), standardTypeFrom);
      }

      // Check Direction 2: conn.to is the category name, conn.fromid is the target page
      const standardTypeTo = getStandardTypeFromCategoryName(conn.to);
      if (standardTypeTo) {
        inferredTypes.set(conn.fromid.toString(), standardTypeTo);
      }
    }
  }

  const pageConcepts = new Map<string, string>();
  for (const wrapper of exportData.pages) {
    const page = wrapper.page;
    if (page) {
      const id = (wrapper.id ?? page.id).toString();
      pageConcepts.set(
        id,
        (page.concept ?? wrapper.concept ?? "Note").toLowerCase(),
      );
    }
  }

  for (const wrapper of exportData.pages) {
    const page = wrapper.page;
    if (!page || typeof page !== "object") continue;

    const sourceId = (wrapper.id ?? page.id).toString();
    const conceptStr = page.concept ?? wrapper.concept ?? "Note";
    const conceptStrLower = conceptStr.toLowerCase();

    const inferredType = inferredTypes.get(sourceId);

    // Skip internal structural / metadata page types unless type can be inferred
    if (
      !inferredType &&
      ["ccategory", "category", "folder", "attribute"].includes(conceptStrLower)
    ) {
      continue;
    }

    const resolvedType = inferredType || mapConceptType(conceptStr);

    // Convert HTML contents to Markdown
    const content = page.description ? htmlToMarkdown(page.description) : "";
    const lore = page.gmSecrets ? htmlToMarkdown(page.gmSecrets) : "";

    // Prepare metadata
    const metadata: Record<string, any> = {};
    if (page.aliases) {
      metadata.aliases = page.aliases
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (page.imageURL) {
      metadata.imageURL = page.imageURL;
    }
    if (page.largeImageURL) {
      metadata.largeImageURL = page.largeImageURL;
    }
    if (page.isSecret !== undefined) {
      metadata.isSecret = page.isSecret;
    }

    const thumbnail = normalizeScabardImageUrl(page.imageURL);
    const image = normalizeScabardImageUrl(page.largeImageURL) ?? thumbnail;

    // Build the draft
    const draft: EntityDraft = {
      sourceId,
      sourcePath:
        page.uri ||
        wrapper.uri ||
        `/campaign/${campaignId}/${conceptStr.toLowerCase()}/${sourceId}`,
      sourceType: resolvedType,
      title: page.name || `Unnamed ${conceptStr}`,
      content,
      lore: lore || undefined,
      tags: [],
      labels: [],
      image,
      thumbnail,
      metadata,
    };

    entityDrafts.push(draft);
    draftsMap.set(sourceId, draft);
  }

  // Map relationships
  const sourceRefForEndpoint = (sourceId: string): string => {
    const draft = draftsMap.get(sourceId);
    return draft
      ? `scabard:${draft.sourceType ?? "Note"}:${sourceId}`
      : sourceId;
  };

  const addLabel = (
    draft: EntityDraft,
    labelName: string | undefined,
  ): boolean => {
    if (!labelName || isStandardMetadataName(labelName)) {
      return false;
    }
    if (!draft.labels) {
      draft.labels = [];
    }
    if (!draft.labels.includes(labelName)) {
      draft.labels.push(labelName);
      return true;
    }
    return false;
  };

  // Track emitted relationships so duplicate Scabard connections (same
  // endpoints + type) collapse into a single draft instead of producing
  // redundant links and duplicate keys downstream.
  const seenRelationshipKeys = new Set<string>();

  for (const conn of conns) {
    const relationshipType = conn.relationship || "RELATED_TO";
    const relationshipTypeUpper = relationshipType.toUpperCase();
    // Map connections originating from/to classification category pages to entity labels.
    const fromId = conn.fromid.toString();
    const toId = conn.toid.toString();
    const fromConcept = pageConcepts.get(fromId);
    const toConcept = pageConcepts.get(toId);

    // Map internal classification relationships to entity labels.
    if (
      relationshipTypeUpper.endsWith("_CATEGORY_OF") ||
      relationshipTypeUpper === "CATEGORY_OF" ||
      relationshipTypeUpper === "CONCEPT_OF" ||
      relationshipTypeUpper === "ALIGNMENT_OF"
    ) {
      metadataConnectionCount++;
      // Direction 1: Target is the entity, Source is the classification name
      const targetDraft = draftsMap.get(conn.toid.toString());
      if (targetDraft) {
        if (addLabel(targetDraft, conn.from)) labelConnectionCount++;
      }

      // Direction 2: Source is the entity, Target is the classification name
      const sourceDraft = draftsMap.get(conn.fromid.toString());
      if (sourceDraft) {
        if (addLabel(sourceDraft, conn.to)) labelConnectionCount++;
      }
      continue;
    }

    // Map connections originating from/to classification category pages to entity labels.
    const isFromSkipped =
      fromConcept &&
      ["ccategory", "category", "folder", "attribute"].includes(fromConcept) &&
      !draftsMap.has(fromId);
    const isToSkipped =
      toConcept &&
      ["ccategory", "category", "folder", "attribute"].includes(toConcept) &&
      !draftsMap.has(toId);

    if (isFromSkipped || isToSkipped) {
      metadataConnectionCount++;
      if (isFromSkipped) {
        const targetDraft = draftsMap.get(toId);
        if (targetDraft) {
          if (addLabel(targetDraft, conn.from)) labelConnectionCount++;
        }
      }
      if (isToSkipped) {
        const sourceDraft = draftsMap.get(fromId);
        if (sourceDraft) {
          if (addLabel(sourceDraft, conn.to)) labelConnectionCount++;
        }
      }
      continue;
    }

    // Skip internal meta/schema relationships
    if (
      [
        "CONCEPT_OF",
        "CATEGORY_OF",
        "FOLDER_OF",
        "PARENT_FOLDER",
        "ATTRIBUTE_OF",
        "ALIGNMENT_OF",
        "CLONE_OF",
        "TEMPLATE_OF",
      ].includes(relationshipTypeUpper)
    ) {
      skippedStructuralConnectionCount++;
      continue;
    }

    const fromRef = sourceRefForEndpoint(fromId);
    const toRef = sourceRefForEndpoint(toId);
    const type = toSnakeCase(relationshipType);

    // Collapse duplicate connections (same endpoints + type) that some Scabard
    // exports contain; emitting them twice yields redundant links and breaks
    // keyed rendering in the import review UI.
    const relationshipKey = `${fromRef}:${toRef}:${type}`;
    if (seenRelationshipKeys.has(relationshipKey)) {
      continue;
    }
    seenRelationshipKeys.add(relationshipKey);

    if (!draftsMap.has(fromId) || !draftsMap.has(toId)) {
      unresolvedEndpointConnectionCount++;
    }

    relationshipDrafts.push({
      fromRef,
      toRef,
      type,
      label: toTitleCase(relationshipType),
    });
  }

  if (conns.length > 0) {
    warnings.push({
      code: "SCABARD_CONNECTION_SUMMARY",
      message: `Scabard export contained ${conns.length} connections: ${relationshipDrafts.length} imported as links, ${metadataConnectionCount} treated as classification metadata (${labelConnectionCount} labels added), ${skippedStructuralConnectionCount} skipped as structural metadata, and ${unresolvedEndpointConnectionCount} kept for unresolved reporting.`,
    });
  }

  return {
    version: "1.0",
    sourceSystem: "scabard",
    sourceLabel,
    entityDrafts,
    relationshipDrafts,
    assetDrafts: [],
    warnings,
  };
}
