import type { StylingTemplate } from "schema";
import type { Category } from "schema";
import { getGraphStyle as getBaseStyle } from "./transformer";

/**
 * Rendered elements (nodes + edges) above which style transitions are turned
 * off. Selecting a node dims every other element; with transitions on, each of
 * those becomes its own per-frame Cytoscape animation — about 1.7 s of main
 * thread for a 500-node focus view — for a 200 ms fade nobody can follow.
 */
export const MAX_TRANSITION_ELEMENTS = 400;

export const getGraphStyles = (
  theme: StylingTemplate,
  categories: Category[],
  showImages: boolean,
  timelineMode: boolean,
  showLabels: boolean,
  performanceMode = false,
  animateTransitions = true,
) => {
  const baseStyle = getBaseStyle(
    theme,
    categories,
    showImages && !performanceMode,
  );

  const chatIndicatorStyles = [
    {
      // Character nodes with guest chat enabled get a secondary-coloured ring
      // so hosts can see at a glance which NPCs are "talkable" by guests.
      selector: "node[type = 'character'][?isChatEnabled]",
      style: {
        "underlay-color": theme.tokens.secondary || "#6366f1",
        "underlay-padding": 5,
        "underlay-opacity": 0.35,
        "underlay-shape": "ellipse",
      },
    },
  ];

  const filteringStyles = [
    {
      selector: ".filtered-out",
      style: {
        display: "none",
      },
    },
    {
      selector: ".timeline-hidden",
      style: {
        display: "none",
      },
    },
    {
      selector: "node[status = 'draft']",
      style: {
        opacity: 0.4,
        "text-opacity": 0.4,
      },
    },
    {
      selector: "node[type = 'quicknote']",
      style: {
        "border-style": "dotted",
        "border-color": theme.tokens.accent || "#f59e0b",
        "border-width": 3,
        "background-color": theme.tokens.accent || "#f59e0b",
        "background-opacity": 0.15,
        "underlay-color": theme.tokens.accent || "#f59e0b",
        "underlay-padding": 8,
        "underlay-opacity": 0.15,
        "underlay-shape": "ellipse",
        opacity: 0.9,
        "text-opacity": 0.9,
      },
    },
    {
      selector: ".category-filtered-out",
      style: {
        display: "none",
      },
    },
  ];

  // Performance mode no longer blanks labels by itself: the level-of-detail
  // rules below already hide them when zoomed out, and Cytoscape skips any
  // label too small to read, so zooming in on a large vault can show names.
  const labelOverrides =
    timelineMode || !showLabels
      ? [
          {
            selector: "node",
            style: {
              label: "",
            },
          },
        ]
      : [];

  // Far from the graph, nodes are a few pixels wide: curves, arrowheads and
  // fades cannot be seen but each costs per element on every redraw. Straight
  // edges without arrows halved a full redraw of a 1,625-node vault.
  const lodStyles = [
    {
      selector: "node.lod-low, node.lod-medium",
      style: {
        label: "",
        "transition-duration": 0,
      },
    },
    {
      // Only the theme texture goes; entity images and silhouettes stay.
      selector:
        "node.lod-low[^resolvedImage], node.lod-low[resolvedImage = 'none']",
      style: {
        "background-image": "none",
      },
    },
    {
      selector: "edge.lod-medium",
      style: {
        label: "",
        "curve-style": "straight",
        "target-arrow-shape": "none",
        "transition-duration": 0,
      },
    },
    {
      selector: "edge.lod-low",
      style: {
        label: "",
        "curve-style": "haystack",
        "haystack-radius": 0,
        "target-arrow-shape": "none",
        "transition-duration": 0,
      },
    },
  ];

  const performanceStyles = performanceMode
    ? [
        {
          selector: "node",
          style: {
            "background-image": "none",
            "background-opacity": 0.72,
            "overlay-opacity": 0,
            "underlay-opacity": 0,
            "transition-duration": 0,
          },
        },
        {
          selector: "node[isImportant]",
          style: {
            "underlay-opacity": 0,
            "text-border-width": 0,
          },
        },
        {
          selector: "edge",
          style: {
            label: "",
            "curve-style": "haystack",
            "haystack-radius": 0.5,
            "target-arrow-shape": "none",
            "text-opacity": 0,
            "transition-duration": 0,
            opacity: 0.22,
          },
        },
        {
          selector: "node:selected, .neighborhood",
          style: {
            label: "data(label)",
            "text-opacity": 1,
          },
        },
      ]
    : [];

  const transitionStyles = animateTransitions
    ? []
    : [{ selector: "node, edge", style: { "transition-duration": 0 } }];

  return [
    ...baseStyle,
    ...chatIndicatorStyles,
    ...filteringStyles,
    ...labelOverrides,
    ...lodStyles,
    ...performanceStyles,
    ...transitionStyles,
  ];
};
