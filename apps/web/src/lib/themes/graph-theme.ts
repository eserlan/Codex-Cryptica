import type { Category } from "schema";

export const BASE_STYLE = [
  {
    selector: "node",
    style: {
      "background-color": "#022c22", // Very dark green
      "border-width": 1,
      "border-color": "#15803d", // Green-700
      width: 32,
      height: 32,
      shape: "round-rectangle",
      label: "data(label)",
      color: "#86efac", // Green-300
      "font-family": "Inter, sans-serif",
      "font-size": 10,
      "text-valign": "bottom",
      "text-margin-y": 8,
      "text-max-width": 80,
      "text-wrap": "wrap",
    },
  },
  {
    selector: "node[image]",
    style: {
      "background-image": "data(image)",
      "background-fit": "cover",
      "background-clip": "node",
      width: 48,
      height: 48,
      "border-width": 2,
      "border-color": "#4ade80", // Brighter border for images
    },
  },
  {
    selector: "node:selected",
    style: {
      "background-color": "#14532d", // Green-900
      "border-color": "#4ade80", // Green-400
      "border-width": 2,
      color: "#fff",
      "text-outline-color": "#000",
      "text-outline-width": 2,
      "overlay-color": "#22d3ee",
      "overlay-padding": 8,
      "overlay-opacity": 0.3,
    },
  },
  {
    selector: ".selected-source",
    style: {
      "border-width": 2,
      "border-color": "#facc15", // Yellow for source
      "background-color": "#422006",
    },
  },
  {
    selector: "edge",
    style: {
      width: 1,
      "line-color": "#14532d",
      "target-arrow-color": "#14532d",
      "curve-style": "bezier",
      "target-arrow-shape": "triangle",
      "arrow-scale": 0.6,
      opacity: 0.6,
      label: "data(label)",
      "text-rotation": "autorotate",
      "font-size": 8,
      "font-family": "Inter, sans-serif",
      color: "#86efac",
      "text-background-color": "#000",
      "text-background-opacity": 0.8,
      "text-background-padding": "2px",
      "text-margin-y": -8,
    },
  },
  {
    selector: "edge:selected",
    style: {
      "line-color": "#4ade80",
      "target-arrow-color": "#4ade80",
      width: 2,
      opacity: 1,
    },
  },
] as any[];

export const getTypeStyles = (categories: Category[]) => {
  return categories.map((cat) => ({
    selector: `node[type="${cat.id}"]`,
    style: {
      "border-color": cat.color,
      "border-width": 3,
    },
  }));
};

// Kept for backward compatibility if needed, but we should move to dynamic
export const SCIFI_GREEN_STYLE = [
  ...BASE_STYLE,
  {
    selector: 'node[type="npc"]',
    style: { "border-color": "#60a5fa", "border-width": 3 },
  },
  {
    selector: 'node[type="location"]',
    style: { "border-color": "#4ade80", "border-width": 3 },
  },
  {
    selector: 'node[type="item"]',
    style: { "border-color": "#facc15", "border-width": 3 },
  },
  {
    selector: 'node[type="event"]',
    style: { "border-color": "#e879f9", "border-width": 3 },
  },
  {
    selector: 'node[type="faction"]',
    style: { "border-color": "#fb923c", "border-width": 3 },
  },
];