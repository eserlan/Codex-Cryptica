import type {
  CCImportPackage,
  EntityDraft,
  RelationshipDraft,
} from "./package";
import { htmlToMarkdown } from "../utils";

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
  const firstPage = exportData.pages[0]?.page;
  const campaignIdMatch = firstPage?.uri?.match(/\/campaign\/(\d+)/);
  const campaignId = campaignIdMatch ? campaignIdMatch[1] : "unknown-campaign";

  const sourceLabel = `Scabard Campaign ${campaignId}`;

  const entityDrafts: EntityDraft[] = [];
  const relationshipDrafts: RelationshipDraft[] = [];

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

  for (const wrapper of exportData.pages) {
    const page = wrapper.page;
    if (!page || typeof page !== "object") continue;

    const conceptStr = page.concept ?? wrapper.concept ?? "Note";
    const conceptStrLower = conceptStr.toLowerCase();

    // Skip internal structural / metadata page types
    if (
      ["ccategory", "category", "folder", "attribute"].includes(conceptStrLower)
    ) {
      continue;
    }

    const sourceId = (wrapper.id ?? page.id).toString();
    const resolvedType = mapConceptType(conceptStr);

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
    if (page.isSecret !== undefined) {
      metadata.isSecret = page.isSecret;
    }

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
      metadata,
    };

    entityDrafts.push(draft);
    draftsMap.set(sourceId, draft);
  }

  // Map relationships
  for (const conn of conns) {
    const relationshipType = conn.relationship || "RELATED_TO";
    const relationshipTypeUpper = relationshipType.toUpperCase();

    // Map internal classification relationships to entity tags/labels
    if (
      relationshipTypeUpper.endsWith("_CATEGORY_OF") ||
      relationshipTypeUpper === "CATEGORY_OF" ||
      relationshipTypeUpper === "CONCEPT_OF" ||
      relationshipTypeUpper === "ALIGNMENT_OF"
    ) {
      // Direction 1: Target is the entity, Source is the classification name
      const targetDraft = draftsMap.get(conn.toid.toString());
      if (targetDraft) {
        const labelName = conn.from;
        if (
          labelName &&
          !isStandardMetadataName(labelName) &&
          !targetDraft.tags.includes(labelName)
        ) {
          targetDraft.tags.push(labelName);
        }
      }

      // Direction 2: Source is the entity, Target is the classification name
      const sourceDraft = draftsMap.get(conn.fromid.toString());
      if (sourceDraft) {
        const labelName = conn.to;
        if (
          labelName &&
          !isStandardMetadataName(labelName) &&
          !sourceDraft.tags.includes(labelName)
        ) {
          sourceDraft.tags.push(labelName);
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
      ].includes(relationshipTypeUpper)
    ) {
      continue;
    }

    relationshipDrafts.push({
      fromRef: conn.fromid.toString(),
      toRef: conn.toid.toString(),
      type: toSnakeCase(relationshipType),
      label: toTitleCase(relationshipType),
    });
  }

  return {
    version: "1.0",
    sourceSystem: "scabard",
    sourceLabel,
    entityDrafts,
    relationshipDrafts,
    assetDrafts: [],
    warnings: [],
  };
}
