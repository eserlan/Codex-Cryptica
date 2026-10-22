/**
 * The clue network of a staged mystery as a graph, plus a deterministic
 * column layout for drawing it. Spoiler-bearing: it shows which clues prove
 * which conclusion, so it is for the GM and never part of the player handout.
 */

import { list, record, text, type Obj } from "./mystery-obj";

export type MysteryGraphNodeKind = "person" | "place" | "clue" | "revelation";

export interface MysteryGraphNode {
  id: string;
  kind: MysteryGraphNodeKind;
  label: string;
  /** The culprit, or the location where the key item is now. */
  mark?: "culprit" | "key-item";
}

export interface MysteryGraphEdge {
  from: string;
  to: string;
  /** found: a clue is picked up at its source; leads: it points onward; supports: it backs a conclusion. */
  kind: "found" | "leads" | "supports";
}

export interface MysteryGraph {
  nodes: MysteryGraphNode[];
  edges: MysteryGraphEdge[];
}

const short = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

/** Build the graph from accepted stage data. Edges to unknown ids are dropped. */
export function buildMysteryGraph(
  foundation: Obj,
  cast: Obj,
  clues: Obj,
): MysteryGraph {
  const culpritId = text(foundation.perpetratorId);
  const itemPlace = text(cast.keyItemLocationId);
  const nodes: MysteryGraphNode[] = [
    ...list(cast.suspects).map((item): MysteryGraphNode => {
      const person = record(item);
      const id = text(person.id);
      return {
        id,
        kind: "person",
        label: text(person.name),
        ...(id === culpritId ? { mark: "culprit" as const } : {}),
      };
    }),
    ...list(cast.locations).map((item): MysteryGraphNode => {
      const place = record(item);
      const id = text(place.id);
      return {
        id,
        kind: "place",
        label: text(place.name),
        ...(id === itemPlace ? { mark: "key-item" as const } : {}),
      };
    }),
    ...list(clues.clues).map((item, index): MysteryGraphNode => {
      const clue = record(item);
      return {
        id: text(clue.id),
        kind: "clue",
        label: `Lead ${index + 1}: ${short(text(clue.observation), 44)}`,
      };
    }),
    ...list(foundation.revelations).map((item): MysteryGraphNode => {
      const rev = record(item);
      return {
        id: text(rev.id),
        kind: "revelation",
        label: short(text(rev.fact), 52),
      };
    }),
  ].filter((node) => node.id);
  const known = new Set(nodes.map((node) => node.id));
  const edges: MysteryGraphEdge[] = [];
  const add = (from: string, to: string, kind: MysteryGraphEdge["kind"]) => {
    if (known.has(from) && known.has(to) && from !== to)
      edges.push({ from, to, kind });
  };
  for (const item of list(clues.clues)) {
    const clue = record(item);
    const id = text(clue.id);
    add(text(clue.sourceId), id, "found");
    list(clue.leadsTo).forEach((target) => add(id, text(target), "leads"));
    list(clue.supports).forEach((target) => add(id, text(target), "supports"));
  }
  return { nodes, edges };
}

export interface MysteryGraphDiagramNode extends MysteryGraphNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MysteryGraphDiagramEdge extends MysteryGraphEdge {
  path: string;
}

export interface MysteryGraphDiagramLayout {
  width: number;
  height: number;
  nodes: MysteryGraphDiagramNode[];
  edges: MysteryGraphDiagramEdge[];
}

/** People and places share the first column so the whole graph stays narrow. */
const COLUMN_OF: Record<MysteryGraphNodeKind, number> = {
  person: 0,
  place: 0,
  clue: 1,
  revelation: 2,
};
const COLUMN_COUNT = 3;
const NODE_WIDTH = 190;
const NODE_HEIGHT = 40;
const COLUMN_GAP = 80;
const ROW_GAP = 16;
const PADDING = 24;

/** A curve between two boxes: across columns it leaves the facing sides; within a column it loops out to the right. */
function edgePath(
  from: MysteryGraphDiagramNode,
  to: MysteryGraphDiagramNode,
): string {
  const y1 = from.y + from.height / 2;
  const y2 = to.y + to.height / 2;
  if (from.x === to.x) {
    const x = from.x + from.width;
    const out = x + 36;
    return `M ${x} ${y1} C ${out} ${y1}, ${out} ${y2}, ${x} ${y2}`;
  }
  const forward = to.x > from.x;
  const x1 = forward ? from.x + from.width : from.x;
  const x2 = forward ? to.x : to.x + to.width;
  const bend = Math.max(40, Math.abs(x2 - x1) / 2) * (forward ? 1 : -1);
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
}

/** Sources, clues and conclusions in three columns, each as tall as it needs. */
export function buildMysteryGraphDiagram(
  graph: MysteryGraph,
): MysteryGraphDiagramLayout {
  const columns = Array.from({ length: COLUMN_COUNT }, (_, column) =>
    graph.nodes.filter((node) => COLUMN_OF[node.kind] === column),
  );
  const tallest = Math.max(1, ...columns.map((column) => column.length));
  const rowHeight = NODE_HEIGHT + ROW_GAP;
  const height = PADDING * 2 + tallest * rowHeight - ROW_GAP;
  const width =
    PADDING * 2 + COLUMN_COUNT * NODE_WIDTH + (COLUMN_COUNT - 1) * COLUMN_GAP;
  const nodes = columns.flatMap((column, columnIndex) => {
    const used = column.length * rowHeight - ROW_GAP;
    const top = PADDING + (height - PADDING * 2 - used) / 2;
    return column.map((node, row): MysteryGraphDiagramNode => ({
      ...node,
      x: PADDING + columnIndex * (NODE_WIDTH + COLUMN_GAP),
      y: top + row * rowHeight,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    }));
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const edges = graph.edges.flatMap((edge): MysteryGraphDiagramEdge[] => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) return [];
    return [{ ...edge, path: edgePath(from, to) }];
  });
  return { width, height, nodes, edges };
}
