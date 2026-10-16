/**
 * Multi-entity Vault Save draft builder for the Point Crawl Generator
 * (#2479, 177-point-crawl-generator).
 *
 * Produces an array of `PointCrawlBatchSaveDraft` items suitable for both:
 * 1. Direct in-app campaign saving (`point-crawl-vault-save.ts`)
 * 2. Public `/generators/point-crawl` handoff via `__codex_pending_import`
 *
 * Ordering:
 * - First `0..N-1` entries: one `Location` entity per selected `PointCrawlNode`,
 *   with `## Routes & Exits` in `lore` and `route` relationships (using
 *   `formatRouteConnectionLabel(route)`) to other selected locations.
 * - Final entry (`[N]`): the master overview `Note` entity (`kind: "point-crawl"`)
 *   with `contains` relationships to all selected locations and optional
 *   `mapImageDataUrl` so `SeoImportService` automatically selects the overview
 *   note upon completion.
 */

import {
  formatRouteConnectionLabel,
  renderPointCrawlGmSheet,
  renderPointCrawlMarkdown,
  renderPointCrawlRouteSummary,
  ROLE_LABELS,
  type PointCrawlNetwork,
  type PointCrawlNode,
  type PointCrawlRoute,
} from "./point-crawl-state";

export interface PointCrawlBatchSaveRelationship {
  title: string;
  type: string;
  label: string;
}

export interface PointCrawlBatchSaveDraft {
  type: "location" | "note";
  kind?: string;
  title: string;
  summary: string;
  content: string;
  lore: string;
  labels: string[];
  status: "active" | "draft";
  relationships: PointCrawlBatchSaveRelationship[];
  mapImageDataUrl?: string;
  /** Original node ID when `type === "location"`, for in-app ID mapping. */
  sourceNodeId?: string;
}

export interface BuildPointCrawlSaveDraftsOptions {
  /** Node IDs to include as Location entities. Omit to save all nodes. */
  selectedNodeIds?: Iterable<string>;
  /** Optional PNG data URL of the point crawl graph to attach to the master Note. */
  mapImageDataUrl?: string;
  /** Entity status to assign (defaults to "active"). */
  status?: "active" | "draft";
}

function buildLocationContent(node: PointCrawlNode): string {
  const roleLabel = ROLE_LABELS[node.role] ?? node.role;
  return [
    `## Overview (${roleLabel})`,
    node.summary,
    "",
    "## Sights & Atmosphere",
    node.sensoryDescription,
    "",
    "## Why Visit",
    node.whyVisit,
  ]
    .join("\n")
    .trim();
}

function buildLocationLore(
  node: PointCrawlNode,
  incidentRoutes: PointCrawlRoute[],
  nodesById: ReadonlyMap<string, PointCrawlNode>,
): string {
  const lines: string[] = [
    "## Encounter & Complication",
    node.encounterOrHazard,
    "",
    "## Clues & Rewards",
    node.clueOrReward,
    "",
    "## Routes & Exits",
  ];

  if (incidentRoutes.length === 0) {
    lines.push("- No connected routes recorded in this save subset.");
  } else {
    for (const route of incidentRoutes) {
      lines.push(`- ${renderPointCrawlRouteSummary(route, nodesById)}`);
    }
  }

  return lines.join("\n").trim();
}

export function buildPointCrawlSaveDrafts(
  crawl: PointCrawlNetwork,
  options: BuildPointCrawlSaveDraftsOptions = {},
): PointCrawlBatchSaveDraft[] {
  const status = options.status ?? "active";
  const selectedSet = options.selectedNodeIds
    ? new Set(options.selectedNodeIds)
    : new Set(crawl.nodes.map((n) => n.id));

  const selectedNodes = crawl.nodes.filter((n) => selectedSet.has(n.id));
  const nodesById = new Map(crawl.nodes.map((n) => [n.id, n]));

  // Only routes where BOTH endpoints are in the selected subset
  const activeRoutes = crawl.routes.filter(
    (r) => selectedSet.has(r.fromNodeId) && selectedSet.has(r.toNodeId),
  );

  // Deduplicate titles if two nodes somehow share a name
  const usedTitles = new Set<string>();
  const uniqueTitleByNodeId = new Map<string, string>();
  for (const node of crawl.nodes) {
    let candidate = node.name.trim() || node.id;
    if (usedTitles.has(candidate.toLowerCase())) {
      candidate = `${candidate} (${node.id})`;
    }
    usedTitles.add(candidate.toLowerCase());
    uniqueTitleByNodeId.set(node.id, candidate);
  }

  const locationDrafts: PointCrawlBatchSaveDraft[] = selectedNodes.map(
    (node) => {
      const outgoingOrBidirectional = activeRoutes.filter(
        (r) =>
          r.fromNodeId === node.id ||
          (r.direction === "bidirectional" && r.toNodeId === node.id),
      );

      // Build `route` relationships originating from `fromNodeId === node.id`
      // so each route creates one clean relationship edge in the Vault graph
      const routeRelationships: PointCrawlBatchSaveRelationship[] = activeRoutes
        .filter((r) => r.fromNodeId === node.id)
        .map((route) => ({
          title:
            uniqueTitleByNodeId.get(route.toNodeId) ??
            nodesById.get(route.toNodeId)?.name ??
            route.toNodeId,
          type: "route",
          label: formatRouteConnectionLabel(route),
        }));

      const title = uniqueTitleByNodeId.get(node.id) ?? node.name;
      return {
        type: "location",
        title,
        summary: node.summary,
        content: buildLocationContent(node),
        lore: buildLocationLore(node, outgoingOrBidirectional, nodesById),
        labels: [
          "point-crawl",
          "point-crawl-location",
          `role:${node.role}`,
          ...(crawl.scale
            ? [crawl.scale.toLowerCase().replace(/\s+/g, "-")]
            : []),
        ],
        status,
        relationships: routeRelationships,
        sourceNodeId: node.id,
      };
    },
  );

  let masterTitle = crawl.title.trim() || "Point Crawl Network";
  if (usedTitles.has(masterTitle.toLowerCase())) {
    masterTitle = `${masterTitle} (Point Crawl Overview)`;
  }

  const filteredCrawl: PointCrawlNetwork = {
    ...crawl,
    pointCount: selectedNodes.length,
    nodes: selectedNodes,
    routes: activeRoutes,
  };

  const masterNoteDraft: PointCrawlBatchSaveDraft = {
    type: "note",
    kind: "point-crawl",
    title: masterTitle,
    summary: crawl.premise,
    content: renderPointCrawlMarkdown(filteredCrawl),
    lore: renderPointCrawlGmSheet(filteredCrawl),
    labels: [
      "point-crawl",
      "point-crawl-generator",
      crawl.scale.toLowerCase().replace(/\s+/g, "-"),
      "imported-draft",
    ],
    status,
    relationships: locationDrafts.map((loc, idx) => ({
      title: loc.title,
      type: "contains",
      label: `${ROLE_LABELS[selectedNodes[idx]?.role ?? "side"]} (#${idx + 1})`,
    })),
    ...(options.mapImageDataUrl
      ? { mapImageDataUrl: options.mapImageDataUrl }
      : {}),
  };

  return [...locationDrafts, masterNoteDraft];
}
