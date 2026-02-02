import type { Entity, TemporalMetadata, Category, StylingTemplate } from "schema";
import { CONNECTION_COLORS } from "./defaults";

export interface GraphNode {
  group: "nodes";
  data: {
    id: string;
    label: string;
    type: string;
    weight: number;
    image?: string;
    thumbnail?: string;
    date?: TemporalMetadata;
    start_date?: TemporalMetadata;
    end_date?: TemporalMetadata;
    dateLabel?: string;
  };
  position?: { x: number; y: number };
}

export interface GraphEdge {
  group: "edges";
  data: {
    id: string;
    source: string;
    target: string;
    label?: string;
    connectionType: string;
    strength?: number;
  };
}

export type GraphElement = GraphNode | GraphEdge;

const formatDate = (date?: TemporalMetadata) => {
  if (!date || date.year === undefined) return "";
  if (date.label) return date.label;

  const y = String(date.year);
  const m = date.month !== undefined ? String(date.month).padStart(2, "0") : "";
  const d = date.day !== undefined ? String(date.day).padStart(2, "0") : "";

  let str = y;
  if (m) {
    str += `-${m}`;
    if (d) str += `-${d}`;
  }
  return str;
};

export class GraphTransformer {
  static entitiesToElements(entities: Entity[]): GraphElement[] {
    // Create a Set of valid entity IDs for O(1) lookups
    const validIds = new Set(entities.map((e) => e.id));

    return entities.flatMap((entity) => {
      const elements: GraphElement[] = [];

      const dateLabel = formatDate(entity.date || entity.start_date || entity.end_date);

      // Create Node
      const nodeData: GraphNode["data"] = {
        id: entity.id,
        label: entity.title,
        type: entity.type,
        weight: entity.connections?.length || 0,
        date: entity.date,
        start_date: entity.start_date,
        end_date: entity.end_date,
        dateLabel,
      };
      if (entity.image) nodeData.image = entity.image;
      if (entity.thumbnail) nodeData.thumbnail = entity.thumbnail;

      elements.push({
        group: "nodes",
        data: nodeData,
        position: entity.metadata?.coordinates,
      });

      // Create Edges
      for (const conn of entity.connections || []) {
        // Skip edges to non-existent targets
        if (!validIds.has(conn.target)) continue;

        // Construct a unique edge ID: source-target-type
        const edgeId = `${entity.id}-${conn.target}-${conn.type}`;

        elements.push({
          group: "edges",
          data: {
            id: edgeId,
            source: entity.id,
            target: conn.target,
            label: conn.label || conn.type,
            connectionType: conn.type,
            strength: conn.strength,
          },
        });
      }

      return elements;
    });
  }
}

/**
 * Cytoscape's internal style parser can be sensitive to complex font-family strings
 * (e.g. comma-separated fallbacks or quotes). This helper sanitizes the string
 * to provide a single, clean font name.
 */
const sanitizeFontForCytoscape = (fontFamily?: string): string => {
  if (!fontFamily) return "sans-serif";
  // Take the first font in the list, trim extra whitespace
  const firstFont = fontFamily.split(",")[0].trim();
  return firstFont || "sans-serif";
};

export const getGraphStyle = (template: StylingTemplate, categories: Category[]): any[] => {
  const { tokens, graph } = template;

  const baseStyle = [
    {
      selector: "node",
      style: {
        "background-color": tokens.background,
        "border-width": graph.nodeBorderWidth,
        "border-color": tokens.primary,
        width: 32,
        height: 32,
        shape: graph.nodeShape,
        label: "data(label)",
        color: tokens.text,
        "font-family": sanitizeFontForCytoscape(tokens.fontBody),
        "font-size": 10,
        "text-valign": "bottom",
        "text-margin-y": 8,
        "text-max-width": 80,
        "text-wrap": "wrap",
        "transition-property": "opacity",
        "transition-duration": 200,
      },
    },
    {
      selector: "node[resolvedImage]",
      style: {
        "background-fit": "cover",
        "background-clip": "node",
        "background-image": "data(resolvedImage)",
        width: "data(width)",
        height: "data(height)",
        "border-width": graph.nodeBorderWidth + 1,
        "border-color": tokens.primary,
      },
    },
    {
      selector: "node:selected",
      style: {
        "background-color": tokens.surface,
        "border-color": tokens.primary,
        "border-width": graph.nodeBorderWidth + 1,
        color: "#fff",
        "text-outline-color": "#000",
        "text-outline-width": 2,
        "overlay-color": tokens.primary,
        "overlay-padding": 8,
        "overlay-opacity": 0.3,
      },
    },
    {
      selector: ".selected-source",
      style: {
        "border-width": graph.nodeBorderWidth + 1,
        "border-color": "#facc15", // Keep yellow for functional clarity
        "background-color": tokens.surface,
      },
    },
    {
      selector: "edge",
      style: {
        width: 1,
        "line-color": graph.edgeColor,
        "line-style": graph.edgeStyle,
        "target-arrow-color": graph.edgeColor,
        "curve-style": "bezier",
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.6,
        opacity: 0.6,
        label: "data(label)",
        "text-rotation": "autorotate",
        "font-size": 8,
        "font-family": sanitizeFontForCytoscape(tokens.fontBody),
        color: tokens.text,
        "text-background-color": tokens.background,
        "text-background-opacity": 0.8,
        "text-background-padding": "2px",
        "text-margin-y": -8,
        "transition-property": "opacity",
        "transition-duration": 200,
      },
    },
    {
      selector: `edge[connectionType="friendly"]`,
      style: {
        "line-color": CONNECTION_COLORS.friendly,
        "target-arrow-color": CONNECTION_COLORS.friendly,
      },
    },
    {
      selector: `edge[connectionType="enemy"]`,
      style: {
        "line-color": CONNECTION_COLORS.enemy,
        "target-arrow-color": CONNECTION_COLORS.enemy,
      },
    },
    {
      selector: `edge[connectionType="neutral"]`,
      style: {
        "line-color": CONNECTION_COLORS.neutral,
        "target-arrow-color": CONNECTION_COLORS.neutral,
      },
    },
    {
      selector: "edge:selected",
      style: {
        "line-color": tokens.primary,
        "target-arrow-color": tokens.primary,
        width: 2,
        opacity: 1,
      },
    },
    {
      selector: ".dimmed",
      style: {
        opacity: 0.35,
        events: "no",
      },
    },
    {
      selector: ".neighborhood",
      style: {
        opacity: 1,
        "z-index": 100,
      },
    },
  ];

  const categoryStyles = categories.map((cat) => ({
    selector: `node[type="${cat.id}"]`,
    style: {
      "border-color": cat.color,
      "border-width": graph.nodeBorderWidth + 2,
    },
  }));

  return [...baseStyle, ...categoryStyles];
};
