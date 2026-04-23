import type {
  Entity,
  TemporalMetadata,
  Category,
  StylingTemplate,
} from "schema";
import { CONNECTION_COLORS } from "./defaults";

export interface GraphNode {
  group: "nodes";
  data: {
    id: string;
    label: string;
    type: string;
    weight: number;
    status?: "active" | "draft";
    image?: string;
    thumbnail?: string;
    labels?: string[];
    date?: TemporalMetadata;
    start_date?: TemporalMetadata;
    end_date?: TemporalMetadata;
    dateLabel?: string;
    textureVariant?: number;
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

const incrementWeight = (weights: Map<string, number>, id: string) => {
  weights.set(id, (weights.get(id) ?? 0) + 1);
};

const formatDate = (date?: TemporalMetadata) => {
  if (!date || date.year === undefined) return "";
  if (date.label) return date.label;

  // Optimization: Manual string construction is faster than template literals or padStart
  // for this specific case in hot loops.
  const { year, month, day } = date;
  let str = "" + year;

  if (month !== undefined) {
    str += month < 10 ? "-0" + month : "-" + month;
    if (day !== undefined) {
      str += day < 10 ? "-0" + day : "-" + day;
    }
  }
  return str;
};

const EMPTY_LABELS: string[] = [];

const getTextureVariant = () => Math.floor(Math.random() * 4);

export class GraphTransformer {
  static entitiesToElements(
    entities: Entity[],
    validIds?: Set<string>,
  ): GraphElement[] {
    // Create a Set of valid entity IDs for O(1) lookups
    if (!validIds) {
      // OPTIMIZATION: Use a loop instead of map to avoid array allocation
      validIds = new Set<string>();
      const entityCount = entities.length;
      for (let i = 0; i < entityCount; i++) {
        validIds.add(entities[i].id);
      }
    }

    const elements: GraphElement[] = [];
    const count = entities.length;
    const weights = new Map<string, number>();

    // Precompute rendered degree so node sizing matches the graph after
    // connections to hidden or missing targets have been filtered out.
    for (let i = 0; i < count; i++) {
      const entity = entities[i];
      if (!entity.id) continue;

      const connections = entity.connections;
      if (!connections) continue;

      for (let j = 0; j < connections.length; j++) {
        const conn = connections[j];
        if (!validIds.has(conn.target)) continue;

        incrementWeight(weights, entity.id);
        incrementWeight(weights, conn.target);
      }
    }

    // phyllotaxis spiral distribution for unplaced nodes
    const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
    // Initial radius provides a decent base spread even for small graphs
    const spiralRadius = Math.max(1200, Math.sqrt(count) * 100);

    for (let i = 0; i < count; i++) {
      const entity = entities[i];
      if (!entity.id) continue;

      const dateLabel = formatDate(
        entity.date || entity.start_date || entity.end_date,
      );

      // Visibility markers for Admin visual cues
      let isRevealed = false;
      const tags = entity.tags;
      if (tags) {
        for (let j = 0; j < tags.length; j++) {
          const t = tags[j].toLowerCase();
          if (t === "revealed" || t === "visible") {
            isRevealed = true;
            break;
          }
        }
      }

      if (!isRevealed) {
        const labels = entity.labels;
        if (labels) {
          for (let k = 0; k < labels.length; k++) {
            const l = labels[k].toLowerCase();
            if (l === "revealed" || l === "visible") {
              isRevealed = true;
              break;
            }
          }
        }
      }

      // Create Node
      const nodeData: GraphNode["data"] = {
        id: entity.id,
        label: entity.title,
        type: entity.type,
        status: entity.status,
        weight: weights.get(entity.id) ?? 0,
        date: entity.date,
        start_date: entity.start_date,
        end_date: entity.end_date,
        dateLabel,
        labels: entity.labels ?? EMPTY_LABELS,
        textureVariant: getTextureVariant(),
      };
      if (entity.image) nodeData.image = entity.image;
      if (entity.thumbnail) nodeData.thumbnail = entity.thumbnail;
      if (isRevealed) (nodeData as any).isRevealed = true;

      const coords = entity.metadata?.coordinates;
      const hasValidCoords =
        coords &&
        typeof coords.x === "number" &&
        typeof coords.y === "number" &&
        Number.isFinite(coords.x) &&
        Number.isFinite(coords.y);

      // Assign a stable-ish random position based on ID if no coords exist.
      // Performance: Compute a simple hash in a single pass to avoid multiple split/reduce cycles.
      if (hasValidCoords) {
        elements.push({
          group: "nodes",
          data: nodeData,
          position: coords,
        });
      } else {
        const angle = i * GOLDEN_ANGLE;
        const distance = spiralRadius * Math.sqrt((i + 0.5) / count);
        // Mark as pending layout so it stays invisible until placed
        (nodeData as any).isPendingLayout = true;
        elements.push({
          group: "nodes",
          data: nodeData,
          position: {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
          },
        });
      }

      // Create Edges
      const connections = entity.connections;
      if (connections) {
        for (let l = 0; l < connections.length; l++) {
          const conn = connections[l];
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
      }
    }

    return elements;
  }
}

/**
 * Cytoscape's internal style parser can be sensitive to complex font-family strings
 * (e.g. comma-separated fallbacks or quotes). This helper sanitizes the string
 * to provide a single, clean font name.
 */
const sanitizeFontForCytoscape = (fontFamily?: string): string => {
  if (!fontFamily) return "sans-serif";
  // Take the first font in the list, trim extra whitespace and quotes (Cytoscape parser is sensitive)
  const firstFont = fontFamily.split(",")[0].trim().replace(/['"]/g, "");
  return firstFont || "sans-serif";
};

const getThemeTextureStyle = (texture?: string) => {
  if (!texture) return {};

  return {
    "background-image": `url('/themes/${texture}')`,
    "background-fit": "cover",
    "background-clip": "node",
    "background-image-crossorigin": "null",
    "background-repeat": "no-repeat",
  };
};

const getThemeTextureVariantStyles = (texture?: string) => {
  if (texture !== "blood.svg") return [];

  return [
    {
      selector: "node[textureVariant = 1]",
      style: {
        "background-image": "url('/themes/blood-90.svg')",
      },
    },
    {
      selector: "node[textureVariant = 2]",
      style: {
        "background-image": "url('/themes/blood-180.svg')",
      },
    },
    {
      selector: "node[textureVariant = 3]",
      style: {
        "background-image": "url('/themes/blood-270.svg')",
      },
    },
  ];
};

const getFantasyNodeStyle = (
  template: StylingTemplate,
): Record<string, string | number | number[]> => {
  if (template.id !== "fantasy") return {};

  const borderWidth = template.graph.nodeBorderWidth ?? 1;

  return {
    shape: "polygon",
    "shape-polygon-points": [
      -0.82, -0.68, 0, -0.96, 0.82, -0.68, 0.72, 0.26, 0, 0.98, -0.72, 0.26,
    ],
    "background-fit": "cover",
    "background-clip": "node",
    "background-opacity": 0.5,
    "border-width": borderWidth,
    "border-color": template.tokens.primary,
    "border-opacity": 0.68,
  };
};

const getFantasyEdgeStyle = (
  template: StylingTemplate,
): Record<string, string | number | number[]> => {
  if (template.id !== "fantasy") return {};

  return {
    width: (template.graph.edgeWidth ?? 1) + 1,
    "line-style": "dashed",
    "line-dash-pattern": [13, 4, 2, 5],
    "line-dash-offset": 2,
    "line-cap": "round",
    "arrow-scale": 0.45,
    opacity: 0.44,
    "underlay-color": template.tokens.background,
    "underlay-opacity": 0.18,
    "underlay-padding": 2,
    "text-background-opacity": 0.68,
  };
};

export const getGraphStyle = (
  template: StylingTemplate,
  categories: Category[],
  showImages: boolean,
): any[] => {
  const { tokens, graph } = template;

  const isFantasy = template.id === "fantasy";

  // Base styles (excluding revealed overrides which need to come last)
  const baseStyle: any[] = [
    {
      selector: "node",
      style: {
        // Force parchment-like background color for all nodes, matching theme surface/bg
        "background-color": tokens.surface || tokens.background,
        ...getThemeTextureStyle(tokens.texture),
        "border-width": graph.nodeBorderWidth + 2,
        "border-color": tokens.primary,
        width: 32,
        height: 32,
        shape: graph.nodeShape,
        label: "data(label)",
        color: tokens.text,
        "font-family": sanitizeFontForCytoscape(tokens.fontHeader),
        "font-size": 10,
        "min-zoomed-font-size": 8,
        "text-valign": "bottom",
        "text-margin-y": 8,
        "text-max-width": 80,
        "text-wrap": "wrap",
        opacity: 1,
        "text-opacity": 1,
        "transition-property": "opacity, text-opacity, width, height",
        "transition-duration": 200,
        ...getFantasyNodeStyle(template),
      },
    },
    ...getThemeTextureVariantStyles(tokens.texture),
    {
      selector: "node[weight <= 1]",
      style: {
        width: 48,
        height: 48,
      },
    },
    {
      selector: "node[weight >= 2][weight <= 5]",
      style: {
        width: 64,
        height: 64,
      },
    },
    {
      selector: "node[weight >= 6][weight <= 10]",
      style: {
        width: 96,
        height: 96,
      },
    },
    {
      selector: "node[weight >= 11]",
      style: {
        width: 128,
        height: 128,
      },
    },
  ];

  if (showImages) {
    baseStyle.push({
      selector:
        "node[resolvedImage][resolvedImage != 'none'], node[image][resolvedImage][resolvedImage != 'none'], node[thumbnail][resolvedImage][resolvedImage != 'none']",
      style: {
        "background-fit": "cover",
        "background-clip": "node",
        "background-image": "data(resolvedImage)",
        "background-image-crossorigin": "null",
        "background-opacity": 1,
        "border-width": isFantasy
          ? graph.nodeBorderWidth + 5
          : graph.nodeBorderWidth + 6,
        "border-color": tokens.primary,
      },
    });

    // Removed node[resolvedImage][width][height] override to ensure connectivity sizing is global
  }

  baseStyle.push(
    {
      selector: ".selected-source",
      style: {
        "border-width": graph.nodeBorderWidth + 4,
        "border-color": "#facc15", // Keep yellow for functional clarity
        "background-color": tokens.surface,
      },
    },
    {
      selector: "edge",
      style: {
        width: graph.edgeWidth ?? 1,
        "line-color": graph.edgeColor,
        "line-style": graph.edgeStyle,
        "target-arrow-color": graph.edgeColor,
        "curve-style": "bezier",
        "target-arrow-shape": "triangle",
        "arrow-scale": 0.6,
        opacity: 0.35,
        label: "data(label)",
        "text-rotation": "autorotate",
        "font-size": 8,
        "min-zoomed-font-size": 8,
        "font-family": sanitizeFontForCytoscape(tokens.fontBody),
        color: tokens.text,
        "text-background-color": tokens.background,
        "text-background-opacity": 0.8,
        "text-background-padding": "2px",
        "text-margin-y": -8,
        "transition-property": "opacity, text-opacity",
        "transition-duration": 200,
        ...getFantasyEdgeStyle(template),
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
      selector: ".dimmed",
      style: {
        opacity: 0.08,
        "text-opacity": 0.08,
        events: "no",
      },
    },
    {
      selector: ".neighborhood",
      style: {
        opacity: 0.75,
        "text-opacity": 0.75,
        "z-index": 100,
      },
    },
    {
      selector: ".secondary-neighborhood",
      style: {
        opacity: 0.5,
        "text-opacity": 0.5,
        "z-index": 50,
      },
    },
  );

  const categoryStyles = categories.map((cat) => ({
    selector: `node[type="${cat.id}"]`,
    style: {
      "border-color": cat.color,
      "border-width": isFantasy
        ? graph.nodeBorderWidth + 1
        : graph.nodeBorderWidth + 4,
      // For fantasy, we want the category color to overlay the parchment background
      "background-color": cat.color,
      "background-opacity": isFantasy ? 0.58 : 0.55,
    },
  }));

  // Image width override ensures that nodes with images have thick borders
  // even if category styles (which come before) set a thinner width.
  const imageWidthOverride = showImages
    ? [
        {
          selector:
            "node[resolvedImage][resolvedImage != 'none'], node[image][resolvedImage][resolvedImage != 'none'], node[thumbnail][resolvedImage][resolvedImage != 'none']",
          style: {
            "border-width": isFantasy
              ? graph.nodeBorderWidth + 5
              : graph.nodeBorderWidth + 8,
          },
        },
      ]
    : [];

  // Revealed styles come after category borders
  const revealedStyles: any[] = [
    // Reset opacity for image nodes — categoryStyles sets 0.4 which would bleed through portraits
    ...(showImages
      ? [
          {
            selector: "node[resolvedImage][resolvedImage != 'none']",
            style: { "background-opacity": 1 },
          },
        ]
      : []),
    {
      selector: "node[isRevealed]",
      style: {
        "border-width": isFantasy
          ? graph.nodeBorderWidth + 2
          : graph.nodeBorderWidth + 10,
        "background-clip": isFantasy ? "node" : "none",
        "overlay-opacity": 0,
      },
    },
  ];

  if (showImages) {
    revealedStyles.push({
      selector: "node[isRevealed][resolvedImage][resolvedImage != 'none']",
      style: {
        "background-image": "data(resolvedImage)",
        "background-clip": "node",
        "background-fit": "cover",
        "background-position-y": "50%",
        "border-width": isFantasy
          ? graph.nodeBorderWidth + 2
          : graph.nodeBorderWidth + 10,
      },
    });
  }

  // Selection styles MUST come last to ensure they override EVERYTHING
  // (category colors, revealed borders, and focus-mode opacities)
  const selectionStyles: any[] = [
    {
      selector: "node[isPendingLayout]",
      style: {
        opacity: 0,
        events: "no",
      },
    },
    {
      selector: ".pending-layout",
      style: {
        opacity: 0,
        events: "no",
      },
    },
    {
      selector: "node[status = 'draft']",
      style: {
        "border-style": isFantasy ? "dashed" : "solid",
        "border-dash-pattern": [4, 2],
        "underlay-color": "#2dd4bf", // Teal glow for AI discovery
        "underlay-padding": 12,
        "underlay-opacity": 0.25,
        "underlay-shape": isFantasy ? "polygon" : graph.nodeShape,
      },
    },
    {
      selector: "node:selected",
      style: {
        "background-color": tokens.surface,
        "background-opacity": 1,
        "border-color": tokens.primary,
        "border-width": graph.nodeBorderWidth + 4,
        color: "#fff",
        opacity: 1,
        "text-opacity": 1,
        "text-outline-color": "#000",
        "text-outline-width": 2,
        "underlay-color": tokens.primary,
        "underlay-padding": 8,
        "underlay-opacity": isFantasy ? 0 : 0.3,
        "underlay-shape": isFantasy ? "polygon" : graph.nodeShape,
        "z-index": 1000,
      },
    },
    {
      selector: "edge:selected",
      style: {
        "line-color": tokens.primary,
        "target-arrow-color": tokens.primary,
        width: 2,
        opacity: 1,
        "text-opacity": 1,
      },
    },
  ];

  return [
    ...baseStyle,
    ...categoryStyles,
    ...imageWidthOverride,
    ...revealedStyles,
    ...selectionStyles,
  ];
};
