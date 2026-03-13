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
    image?: string;
    thumbnail?: string;
    labels?: string[];
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

    // Dynamically calculate spread based on entity count.
    // Larger vaults need more initial room.
    const spread = Math.max(2000, Math.sqrt(count) * 250);
    const halfSpread = spread / 2;

    // OPTIMIZATION: Use a loop instead of flatMap to avoid creating intermediate arrays
    // Performance: Imperative loop to avoid iterator allocation on hot path.
    // Length is accessed directly as modern engines optimize this and it avoids inconsistent local caching.
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (!entity.id) continue;

      const dateLabel = formatDate(
        entity.date || entity.start_date || entity.end_date,
      );

      // Visibility markers for Admin visual cues
      // OPTIMIZATION: Simple string comparisons are ~10x faster than Regex
      // We check for existence first to avoid '|| []' allocation.
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
      // _isHidden was unused and removed

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
      let hash = 0;
      if (!hasValidCoords) {
        const id = entity.id;
        const len = id.length;
        for (let j = 0; j < len; j++) {
          hash = (hash << 5) - hash + id.charCodeAt(j);
          hash |= 0; // Convert to 32bit integer
        }
      }

      elements.push({
        group: "nodes",
        data: nodeData,
        position: hasValidCoords
          ? coords
          : {
              x: (Math.abs(hash) % spread) - halfSpread,
              y: (Math.abs(hash * 13) % spread) - halfSpread,
            },
      });

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

export const getGraphStyle = (
  template: StylingTemplate,
  categories: Category[],
  showImages: boolean,
): any[] => {
  const { tokens, graph } = template;

  // Base styles (excluding revealed overrides which need to come last)
  const baseStyle: any[] = [
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
        "font-family": sanitizeFontForCytoscape(tokens.fontHeader),
        "font-size": 10,
        "text-valign": "bottom",
        "text-margin-y": 8,
        "text-max-width": 80,
        "text-wrap": "wrap",
        "transition-property": "opacity",
        "transition-duration": 200,
      },
    },
  ];

  if (showImages) {
    // PREDICTIVE SIZING: If a node HAS an image but it isn't resolved yet,
    // give it a 64x64 placeholder size. This ensures the initial FCOSE layout
    // leaves enough room for the image before it actually loads!
    baseStyle.push({
      selector: "node[image], node[thumbnail]",
      style: {
        width: 64,
        height: 64,
      },
    });

    baseStyle.push({
      selector: "node[resolvedImage]",
      style: {
        "background-fit": "cover",
        "background-clip": "node",
        "background-image": "data(resolvedImage)",
        "border-width": graph.nodeBorderWidth + 1,
        "border-color": tokens.primary,
      },
    });

    baseStyle.push({
      selector: "node[resolvedImage][width][height]",
      style: {
        width: "data(width)",
        height: "data(height)",
      },
    });
  }

  baseStyle.push(
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
        width: graph.edgeWidth ?? 1,
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
    {
      selector: ".secondary-neighborhood",
      style: {
        opacity: 0.6,
        "z-index": 50,
      },
    },
  );

  const categoryStyles = categories.map((cat) => ({
    selector: `node[type="${cat.id}"]`,
    style: {
      "border-color": cat.color,
      "border-width": graph.nodeBorderWidth + 2,
    },
  }));

  // Revealed styles come LAST to override category borders,
  const revealedStyles: any[] = [
    {
      selector: "node[isRevealed]",
      style: {
        "border-width": graph.nodeBorderWidth + 4,
        "background-clip": "none",
        "overlay-opacity": 0,
      },
    },
  ];

  if (showImages) {
    revealedStyles.push({
      selector: "node[isRevealed][resolvedImage]",
      style: {
        "background-image": "data(resolvedImage)",
        "background-clip": "node",
        "background-fit": "cover",
        "background-position-y": "50%",
        "border-width": graph.nodeBorderWidth + 4,
      },
    });
  }

  return [...baseStyle, ...categoryStyles, ...revealedStyles];
};
