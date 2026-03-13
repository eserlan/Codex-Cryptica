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

  return [...baseStyle, ...filteringStyles, ...labelOverrides];
};
