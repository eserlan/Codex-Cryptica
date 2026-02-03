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
