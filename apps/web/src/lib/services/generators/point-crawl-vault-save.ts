import {
  buildPointCrawlSaveDrafts,
  type PointCrawlNetwork,
  type PointCrawlSaveOptions,
} from "generator-engine";

export interface PointCrawlVaultGateway {
  createEntity: (
    type: string,
    title: string,
    data: {
      kind?: string;
      content?: string;
      lore?: string;
      labels?: string[];
      status?: "active" | "draft";
    },
  ) => Promise<string | { id: string }>;
  addConnection: (
    sourceId: string,
    targetId: string,
    relationship: string,
    label?: string,
  ) => Promise<unknown>;
}

export interface PointCrawlVaultSaveResult {
  overviewNoteId: string;
  locationEntityIds: Record<string, string>;
}

/**
 * Persists a generated Point Crawl into the campaign vault as:
 * 1. One `Location` entity per selected point (with `## Routes & Exits` in lore)
 * 2. One master overview `Note` entity (`kind: "point-crawl"`)
 * 3. Automatic graph connections (`route` edges with concise labels between
 *    selected locations, plus `contains` edges from the overview Note).
 */
// fallow-ignore-next-line complexity
export async function savePointCrawlToVault(
  crawl: PointCrawlNetwork,
  vault: PointCrawlVaultGateway,
  options: PointCrawlSaveOptions & {
    overviewTitle?: string;
    overviewLabels?: string[];
    sourceEntityId?: string;
    createSourceRelationship?: boolean;
  } = {},
): Promise<PointCrawlVaultSaveResult> {
  const drafts = buildPointCrawlSaveDrafts(crawl, options);
  const locationDrafts = drafts.slice(0, -1);
  const overviewDraft = drafts[drafts.length - 1];

  const locationEntityIds: Record<string, string> = {};
  const entityIdByTitle = new Map<string, string>();

  // 1. Create each selected Location entity
  const selectedSet = options.selectedNodeIds
    ? new Set(options.selectedNodeIds)
    : null;
  const selectedNodes = selectedSet
    ? crawl.nodes.filter((n) => selectedSet.has(n.id))
    : crawl.nodes;

  for (let i = 0; i < locationDrafts.length; i++) {
    const draft = locationDrafts[i];
    const node = selectedNodes[i];
    const created = await vault.createEntity(draft.type, draft.title, {
      content: draft.content,
      lore: draft.lore,
      labels: draft.labels,
      status: draft.status ?? "active",
    });
    const createdId = typeof created === "string" ? created : created.id;
    if (node) {
      locationEntityIds[node.id] = createdId;
    }
    entityIdByTitle.set(draft.title.trim().toLowerCase(), createdId);
  }

  // 2. Create the master overview Note entity
  const overviewTitle = options.overviewTitle?.trim() || overviewDraft.title;
  const overviewLabels = options.overviewLabels?.length
    ? options.overviewLabels
    : overviewDraft.labels;

  const createdOverview = await vault.createEntity(
    overviewDraft.type,
    overviewTitle,
    {
      kind: overviewDraft.kind ?? "point-crawl",
      content: overviewDraft.content,
      lore: overviewDraft.lore,
      labels: overviewLabels,
      status: overviewDraft.status ?? "active",
    },
  );
  const overviewId =
    typeof createdOverview === "string" ? createdOverview : createdOverview.id;

  // 3. Wire route connections between saved locations
  for (const draft of locationDrafts) {
    const fromId = entityIdByTitle.get(draft.title.trim().toLowerCase());
    if (!fromId || !draft.relationships?.length) continue;
    for (const rel of draft.relationships) {
      const toId = entityIdByTitle.get(rel.title.trim().toLowerCase());
      if (!toId || toId === fromId) continue;
      try {
        await vault.addConnection(fromId, toId, rel.type || "route", rel.label);
      } catch {
        // Best-effort if duplicate edge exists
      }
    }
  }

  // 4. Wire `contains` connections from overview Note to each Location
  for (const locId of Object.values(locationEntityIds)) {
    try {
      await vault.addConnection(overviewId, locId, "contains");
    } catch {
      // Best-effort
    }
  }

  // 5. Optional contextual link to sourceEntityId
  if (
    options.createSourceRelationship &&
    options.sourceEntityId &&
    options.sourceEntityId !== overviewId
  ) {
    try {
      await vault.addConnection(options.sourceEntityId, overviewId, "related");
    } catch {
      // Best-effort
    }
  }

  return {
    overviewNoteId: overviewId,
    locationEntityIds,
  };
}
