import { isCueLine, isSourceIdMarker } from "./pdf-cues";
import type { VisualLine } from "./pdf-text-lines";

const ATX_HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*$/;
export function computeBodyFontSize(lines: VisualLine[]): number {
  const counts = new Map<number, number>();
  for (const line of lines) {
    const rounded = Math.round(line.fontSize * 2) / 2;
    counts.set(rounded, (counts.get(rounded) ?? 0) + line.text.length);
  }
  let bestSize = 10;
  let bestWeight = -1;
  for (const [size, weight] of counts) {
    if (weight > bestWeight) {
      bestWeight = weight;
      bestSize = size;
    }
  }
  return bestSize;
}

export function detectHeadingLevelMap(
  lines: VisualLine[],
  bodyFontSize: number,
): Map<number, number> {
  const headingSizes = new Set<number>();
  for (const line of lines) {
    if (ATX_HEADING_RE.test(line.text)) continue;
    if (isCueLine(line.text) || isSourceIdMarker(line.text)) continue;
    const rounded = Math.round(line.fontSize * 2) / 2;
    if (
      (rounded >= bodyFontSize * 1.15 || rounded - bodyFontSize >= 1.5) &&
      line.text.length <= 120
    ) {
      headingSizes.add(rounded);
    }
  }

  const sortedDesc = [...headingSizes].sort((a, b) => b - a);
  const levelMap = new Map<number, number>();
  sortedDesc.forEach((size, index) => {
    levelMap.set(size, Math.min(6, index + 1));
  });
  return levelMap;
}

export function classifyHeading(
  line: VisualLine,
  levelMap: Map<number, number>,
): { level: number; title: string } | null {
  const atx = line.text.match(ATX_HEADING_RE);
  if (atx) {
    return { level: atx[1].length, title: atx[2].trim() };
  }
  if (isCueLine(line.text) || isSourceIdMarker(line.text)) {
    return null;
  }
  const rounded = Math.round(line.fontSize * 2) / 2;
  const inferredLevel = levelMap.get(rounded);
  if (inferredLevel !== undefined && line.text.length <= 120) {
    return { level: inferredLevel, title: line.text };
  }
  return null;
}
