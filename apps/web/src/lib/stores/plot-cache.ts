// Session-scoped cache: entityId → last plot analysis result
export const plotCache = new Map<string, string>();

export function clearPlotCache() {
  plotCache.clear();
}
