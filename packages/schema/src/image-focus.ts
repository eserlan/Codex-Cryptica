/** Which part of a source image to keep in view when it's cropped to fit a
 * shape (a circular token, a circular graph node) that doesn't match the
 * image's own aspect ratio. Shared by anything that renders an entity's or
 * token's portrait cropped to a shape — the VTT map, the world graph, the
 * Connections tab diagram. */
export const IMAGE_FOCUS_VALUES = [
  "center",
  "top",
  "bottom",
  "left",
  "right",
] as const;

export type ImageFocus = (typeof IMAGE_FOCUS_VALUES)[number];

export function normalizeImageFocus(value: unknown): ImageFocus | undefined {
  return IMAGE_FOCUS_VALUES.includes(value as ImageFocus)
    ? (value as ImageFocus)
    : undefined;
}

/**
 * Cytoscape's `background-position-x`/`-y` percentages for a given focus —
 * the graph-rendering equivalent of the VTT canvas renderer's pixel-offset
 * cover-fit crop. Both read the same `ImageFocus` value; only the coordinate
 * system differs (CSS-style percentages here vs. raw pixels there).
 */
export function imageFocusBackgroundPosition(focus: ImageFocus | undefined): {
  x: string;
  y: string;
} {
  switch (focus) {
    case "top":
      return { x: "50%", y: "0%" };
    case "bottom":
      return { x: "50%", y: "100%" };
    case "left":
      return { x: "0%", y: "50%" };
    case "right":
      return { x: "100%", y: "50%" };
    default:
      return { x: "50%", y: "50%" };
  }
}
