import type { StylingTemplate } from "schema";
import type { Category } from "schema";
import { getGraphStyle as getBaseStyle } from "./transformer";

export const getGraphStyles = (
  theme: StylingTemplate,
  categories: Category[],
  showImages: boolean,
  timelineMode: boolean,
  showLabels: boolean,
  performanceMode = false,
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

  const labelOverrides =
    performanceMode || timelineMode || !showLabels
      ? [
          {
            selector: "node",
            style: {
              label: "",
            },
          },
        ]
      : [];

  const lodStyles = [
    {
      selector: "node.lod-low",
      style: {
        label: "",
        "background-image": "none",
      },
    },
    {
      selector: "node.lod-medium",
      style: {
        label: "",
      },
    },
    {
      selector: "edge.lod-low",
      style: {
        label: "",
        "curve-style": "straight",
      },
    },
    {
      selector: "edge.lod-medium",
      style: {
        label: "",
      },
    },
  ];

  const performanceStyles = performanceMode
    ? [
        {
          selector: "node",
          style: {
            label: "",
            "background-image": "none",
            "background-opacity": 0.72,
            "overlay-opacity": 0,
            "underlay-opacity": 0,
            "transition-duration": 0,
            "text-opacity": 0,
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

  return [
    ...baseStyle,
    ...chatIndicatorStyles,
    ...filteringStyles,
    ...labelOverrides,
    ...lodStyles,
    ...performanceStyles,
  ];
};
