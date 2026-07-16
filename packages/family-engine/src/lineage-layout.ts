import type { Lineage, LineageEdge } from "./lineage";

export interface PositionedCard {
  id: string;
  x: number;
  y: number;
}

export interface PositionedEdge {
  edge: LineageEdge;
  points: Array<{ x: number; y: number }>;
}

export interface CollapsedIndicator {
  branchRootId: string;
  x: number;
  y: number;
  hiddenCount: number;
}

export interface PositionedLineage {
  cards: PositionedCard[];
  edges: PositionedEdge[];
  collapsedIndicators: CollapsedIndicator[];
  bounds: { width: number; height: number };
}

export interface LayoutLineageOptions {
  cardWidth?: number;
  cardHeight?: number;
  hGap?: number;
  vGap?: number;
}

interface Unit {
  id: string;
  generation: number;
  memberIds: string[];
  childUnitIds: string[];
  x: number;
  width: number;
}

/**
 * Deterministic genealogy layout: one row per generation, partners kept
 * adjacent as a unit, children centred under their parent unit's midpoint,
 * bottom-up subtree widths then top-down positioning (simplified tidy-tree —
 * no contour threading, since family units rarely interleave at this scale).
 */
export function layoutLineage(
  lineage: Lineage,
  options: LayoutLineageOptions = {},
): PositionedLineage {
  const cardWidth = options.cardWidth ?? 112;
  const cardHeight = options.cardHeight ?? 96;
  const hGap = options.hGap ?? 16;
  const vGap = options.vGap ?? 48;

  // 1. Group members into partner units, preserving generation-row order
  // (partners are inserted immediately after the member they belong to, so
  // insertion order already keeps them adjacent).
  const unitOf = new Map<string, string>();
  const units = new Map<string, Unit>();
  const partnerOf = new Map<string, Set<string>>();
  for (const edge of lineage.edges) {
    if (edge.type !== "partner") continue;
    if (!partnerOf.has(edge.from)) partnerOf.set(edge.from, new Set());
    if (!partnerOf.has(edge.to)) partnerOf.set(edge.to, new Set());
    partnerOf.get(edge.from)!.add(edge.to);
    partnerOf.get(edge.to)!.add(edge.from);
  }

  for (const [generation, ids] of lineage.generations) {
    for (const id of ids) {
      if (unitOf.has(id)) continue;
      const memberIds = [id];
      unitOf.set(id, id);
      for (const partnerId of partnerOf.get(id) ?? []) {
        if (unitOf.has(partnerId)) continue;
        memberIds.push(partnerId);
        unitOf.set(partnerId, id);
      }
      units.set(id, {
        id,
        generation,
        memberIds,
        childUnitIds: [],
        x: 0,
        width: 0,
      });
    }
  }

  // 2. Parent -> child UNIT edges (deduped, in discovery order) from
  // parent-child member edges, primary (non-secondary) only.
  const childUnitSeen = new Map<string, Set<string>>();
  for (const edge of lineage.edges) {
    if (edge.type !== "parent-child" || edge.secondary) continue;
    const parentUnitId = unitOf.get(edge.from);
    const childUnitId = unitOf.get(edge.to);
    if (!parentUnitId || !childUnitId || parentUnitId === childUnitId) continue;
    const parentUnit = units.get(parentUnitId)!;
    if (!childUnitSeen.has(parentUnitId))
      childUnitSeen.set(parentUnitId, new Set());
    const seen = childUnitSeen.get(parentUnitId)!;
    if (seen.has(childUnitId)) continue;
    seen.add(childUnitId);
    parentUnit.childUnitIds.push(childUnitId);
  }

  // 3. Bottom-up subtree widths (memoised; the unit graph is acyclic since
  // generations strictly increase along parent-child edges).
  const widthCache = new Map<string, number>();
  function subtreeWidth(unitId: string): number {
    const cached = widthCache.get(unitId);
    if (cached !== undefined) return cached;
    const unit = units.get(unitId)!;
    const ownWidth =
      unit.memberIds.length * cardWidth + (unit.memberIds.length - 1) * hGap;
    let childrenWidth = 0;
    unit.childUnitIds.forEach((childId, i) => {
      if (i > 0) childrenWidth += hGap;
      childrenWidth += subtreeWidth(childId);
    });
    const width = Math.max(ownWidth, childrenWidth);
    unit.width = width;
    widthCache.set(unitId, width);
    return width;
  }
  for (const unitId of units.keys()) subtreeWidth(unitId);

  // 4. Top-down positioning. Roots = units with no unit that lists them as a
  // child (topmost ancestors, plus any generation-0+ unit not reached via a
  // parent-child edge, e.g. a lineage with no recorded ancestors at all).
  const hasParent = new Set<string>();
  for (const unit of units.values()) {
    for (const childId of unit.childUnitIds) hasParent.add(childId);
  }
  const roots = [...units.keys()].filter((id) => !hasParent.has(id));

  function positionSubtree(unitId: string, centerX: number) {
    const unit = units.get(unitId)!;
    unit.x = centerX - unit.width / 2;

    const totalChildrenWidth = unit.childUnitIds.reduce(
      (sum, id, i) => sum + subtreeWidth(id) + (i > 0 ? hGap : 0),
      0,
    );
    let cursor = centerX - totalChildrenWidth / 2;
    for (const childId of unit.childUnitIds) {
      const w = subtreeWidth(childId);
      positionSubtree(childId, cursor + w / 2);
      cursor += w + hGap;
    }
  }

  let cursor = 0;
  for (const rootId of roots) {
    const w = subtreeWidth(rootId);
    positionSubtree(rootId, cursor + w / 2);
    cursor += w + hGap * 2;
  }

  // 5. Emit card positions from unit positions.
  const cards: PositionedCard[] = [];
  const minGeneration = Math.min(...[...lineage.generations.keys()], 0);
  for (const unit of units.values()) {
    const y = (unit.generation - minGeneration) * (cardHeight + vGap);
    unit.memberIds.forEach((id, i) => {
      cards.push({ id, x: unit.x + i * (cardWidth + hGap), y });
    });
  }
  const cardById = new Map(cards.map((c) => [c.id, c]));

  // 6. Edge polylines: straight elbow from the bottom-center of the parent to
  // the top-center of the child (partners: a straight line between centres).
  const edges: PositionedEdge[] = [];
  for (const edge of lineage.edges) {
    const from = cardById.get(edge.from);
    const to = cardById.get(edge.to);
    if (!from || !to) continue;
    if (edge.type === "partner") {
      edges.push({
        edge,
        points: [
          { x: from.x + cardWidth, y: from.y + cardHeight / 2 },
          { x: to.x, y: to.y + cardHeight / 2 },
        ],
      });
    } else {
      const fromCenterX = from.x + cardWidth / 2;
      const toCenterX = to.x + cardWidth / 2;
      const midY = from.y + cardHeight + vGap / 2;
      edges.push({
        edge,
        points: [
          { x: fromCenterX, y: from.y + cardHeight },
          { x: fromCenterX, y: midY },
          { x: toCenterX, y: midY },
          { x: toCenterX, y: to.y },
        ],
      });
    }
  }

  // 7. Collapsed indicators: one per branch root not currently expanded
  // (a branch is expanded iff it has member ids recorded for it).
  const collapsedIndicators: CollapsedIndicator[] = [];
  for (const [branchRootId, branch] of lineage.siblingBranches) {
    if (branch.memberIds.length > 0) continue; // expanded; nothing to indicate
    const card = cardById.get(branchRootId);
    if (!card) continue;
    collapsedIndicators.push({
      branchRootId,
      x: card.x + cardWidth / 2,
      y: card.y + cardHeight,
      hiddenCount: branch.hiddenCount,
    });
  }

  const maxX = Math.max(0, ...cards.map((c) => c.x + cardWidth));
  const minX = Math.min(0, ...cards.map((c) => c.x));
  const maxY = Math.max(0, ...cards.map((c) => c.y + cardHeight));
  const bounds = { width: maxX - minX, height: maxY };

  return { cards, edges, collapsedIndicators, bounds };
}
