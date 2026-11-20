import { toKebabCase, type RawSection } from "./parser";
import {
  classifyHeading,
  computeBodyFontSize,
  detectHeadingLevelMap,
} from "./pdf-headings";
import { normalizeSectionLines } from "./pdf-cues";
import type { VisualLine } from "./pdf-text-lines";
import type { AmbiguityRecord } from "./schema";

function deriveFallbackTitle(fileName: string): string {
  const base = fileName
    .trim()
    .replace(/^.*[/\\]/, "")
    .replace(/\.pdf$/i, "")
    .trim();
  return base || "Imported Adventure";
}

interface GroupedPdfSection {
  level: number;
  title: string;
  visualLines: VisualLine[];
  lineNumber: number;
  pageNumber: number;
  pageEnd: number;
}

function groupLinesByHeading(
  allLines: VisualLine[],
  headingLevelMap: Map<number, number>,
): { preambleLines: VisualLine[]; grouped: GroupedPdfSection[] } {
  const preambleLines: VisualLine[] = [];
  const grouped: GroupedPdfSection[] = [];

  for (let idx = 0; idx < allLines.length; idx++) {
    const line = allLines[idx];
    const heading = classifyHeading(line, headingLevelMap);
    if (heading) {
      grouped.push({
        level: heading.level,
        title: heading.title,
        visualLines: [],
        lineNumber: idx + 1,
        pageNumber: line.pageNumber,
        pageEnd: line.pageNumber,
      });
      continue;
    }

    const current = grouped[grouped.length - 1];
    if (current) {
      current.visualLines.push(line);
      current.pageEnd = Math.max(current.pageEnd, line.pageNumber);
    } else {
      preambleLines.push(line);
    }
  }

  return { preambleLines, grouped };
}

function buildFallbackRawSection(
  allLines: VisualLine[],
  fileName: string,
): { rawSections: RawSection[]; ambiguities: AmbiguityRecord[] } {
  const fallbackTitle = deriveFallbackTitle(fileName);
  const firstPage = allLines[0]?.pageNumber ?? 1;
  const lastPage = allLines[allLines.length - 1]?.pageNumber ?? firstPage;
  return {
    ambiguities: [
      {
        id: "amb-missing-heading-pdf",
        code: "MISSING_HEADING",
        message:
          "No section headings were detected in this PDF; all extracted text was placed in a single fallback section.",
        sourceId: toKebabCase(fallbackTitle),
        provenance: "unresolved",
      },
    ],
    rawSections: [
      {
        level: 1,
        title: fallbackTitle,
        lines: normalizeSectionLines(allLines),
        lineNumber: 1,
        pageNumber: firstPage,
        ...(lastPage > firstPage ? { pageEnd: lastPage } : {}),
        forceUnresolvedProvenance: true,
      },
    ],
  };
}

export function buildRawSectionsFromLines(
  allLines: VisualLine[],
  fileName: string,
): { rawSections: RawSection[]; ambiguities: AmbiguityRecord[] } {
  const bodyFontSize = computeBodyFontSize(allLines);
  const headingLevelMap = detectHeadingLevelMap(allLines, bodyFontSize);
  const { preambleLines, grouped } = groupLinesByHeading(
    allLines,
    headingLevelMap,
  );

  if (grouped.length === 0) {
    return buildFallbackRawSection(allLines, fileName);
  }

  const ambiguities: AmbiguityRecord[] = [];
  const preambleText = preambleLines
    .map((l) => l.text)
    .join(" ")
    .trim();
  const preambleSections: RawSection[] = [];
  if (preambleText.length > 0) {
    ambiguities.push({
      id: "amb-unanchored-preamble",
      code: "UNANCHORED_PREAMBLE",
      message:
        "Document contains text before the first heading; it was preserved in an unresolved introductory section.",
      context: preambleText.slice(0, 200),
      provenance: "unresolved",
    });
    const firstPage = preambleLines[0]?.pageNumber ?? 1;
    const lastPage =
      preambleLines[preambleLines.length - 1]?.pageNumber ?? firstPage;
    preambleSections.push({
      level: 1,
      title: "Introduction",
      lines: normalizeSectionLines(preambleLines),
      lineNumber: 1,
      pageNumber: firstPage,
      ...(lastPage > firstPage ? { pageEnd: lastPage } : {}),
      forceUnresolvedProvenance: true,
    });
  }

  return {
    ambiguities,
    rawSections: [
      ...preambleSections,
      ...grouped.map((section) => ({
        level: section.level,
        title: section.title,
        lines: normalizeSectionLines(section.visualLines),
        lineNumber: section.lineNumber,
        pageNumber: section.pageNumber,
        ...(section.pageEnd > section.pageNumber
          ? { pageEnd: section.pageEnd }
          : {}),
      })),
    ],
  };
}
