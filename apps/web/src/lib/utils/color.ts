/**
 * Checks if a CSS color string represents a transparent color.
 * Handles various formats returned by browsers and Cytoscape.
 */
export const isTransparent = (color: string): boolean => {
  if (!color || color === "transparent") return true;
  const normalized = color.replace(/\s+/g, "").toLowerCase();

  // rgba(r,g,b,0) or rgba(r,g,b,0.0)
  if (normalized.includes("rgba(")) {
    return normalized.endsWith(",0)") || normalized.endsWith(",0.0)");
  }

  return normalized === "transparent";
};

/**
 * Converts a hex color string to a comma-separated RGB string.
 * Supports both 3-digit (#abc) and 6-digit (#aabbcc) formats.
 * Example: "#4ade80" -> "74, 222, 128"
 */
export function hexToRgb(hex: string): string {
  let r = 0,
    g = 0,
    b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  return `${r}, ${g}, ${b}`;
}
