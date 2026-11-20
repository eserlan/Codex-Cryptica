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

interface PdfSectionResult {
  rawSections: RawSection[];
  ambiguities: AmbiguityRecord[];
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

function sectionPageRange(
  pageNumber: number,
  pageEnd: number,
): { pageNumber: number; pageEnd?: number } {
  return { pageNumber, ...(pageEnd > pageNumber ? { pageEnd } : {}) };
}

function buildUnresolvedRawSection(
  lines: VisualLine[],
  title: string,
): RawSection {
  const firstPage = lines[0]?.pageNumber ?? 1;
  const lastPage = lines[lines.length - 1]?.pageNumber ?? firstPage;
  return {
    level: 1,
    title,
    lines: normalizeSectionLines(lines),
    lineNumber: 1,
    ...sectionPageRange(firstPage, lastPage),
    forceUnresolvedProvenance: true,
  };
}

function buildFallbackRawSection(
  allLines: VisualLine[],
  fileName: string,
): PdfSectionResult {
  const fallbackTitle = deriveFallbackTitle(fileName);
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
    rawSections: [buildUnresolvedRawSection(allLines, fallbackTitle)],
  };
}

function buildPreambleSection(preambleLines: VisualLine[]): PdfSectionResult {
  const preambleText = preambleLines
    .map((l) => l.text)
    .join(" ")
    .trim();
  if (preambleText.length === 0) return { rawSections: [], ambiguities: [] };

  return {
    ambiguities: [
      {
        id: "amb-unanchored-preamble",
        code: "UNANCHORED_PREAMBLE",
        message:
          "Document contains text before the first heading; it was preserved in an unresolved introductory section.",
        context: preambleText.slice(0, 200),
        provenance: "unresolved",
      },
    ],
    rawSections: [buildUnresolvedRawSection(preambleLines, "Introduction")],
  };
}

function toRawSection(section: GroupedPdfSection): RawSection {
  return {
    level: section.level,
    title: section.title,
    lines: normalizeSectionLines(section.visualLines),
    lineNumber: section.lineNumber,
    ...sectionPageRange(section.pageNumber, section.pageEnd),
  };
}

export function buildRawSectionsFromLines(
  allLines: VisualLine[],
  fileName: string,
): PdfSectionResult {
  const bodyFontSize = computeBodyFontSize(allLines);
  const headingLevelMap = detectHeadingLevelMap(allLines, bodyFontSize);
  const { preambleLines, grouped } = groupLinesByHeading(
    allLines,
    headingLevelMap,
  );

  if (grouped.length === 0) {
    return buildFallbackRawSection(allLines, fileName);
  }

  const preamble = buildPreambleSection(preambleLines);
  return {
    ambiguities: preamble.ambiguities,
    rawSections: [...preamble.rawSections, ...grouped.map(toRawSection)],
  };
}
