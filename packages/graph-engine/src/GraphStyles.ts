import type { StylingTemplate } from "schema";
import type { Category } from "schema";
import { getGraphStyle as getBaseStyle } from "./transformer";

export const getGraphStyles = (
  theme: StylingTemplate,
  categories: Category[],
  showImages: boolean,
  timelineMode: boolean,
  showLabels: boolean,
) => {
  const baseStyle = getBaseStyle(theme, categories, showImages);

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
      selector: ".category-filtered-out",
      style: {
        display: "none",
      },
    },
  ];

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
  ];

  return [...baseStyle, ...filteringStyles, ...labelOverrides, ...lodStyles];
};
