import {
  ADVENTURE_IMPORT_VERSION,
  ADVENTURE_SOURCE_SCHEMA_VERSION,
  type AdventureImportError,
  type AdventureSourcePackage,
  type AmbiguityRecord,
  type ClueRecord,
  type EncounterRecord,
  type EndingRecord,
  type NpcRecord,
  type ParseAdventureResult,
  type Provenance,
  type SceneRecord,
  type SecretRecord,
  type SectionAnchor,
} from "./schema";

const SOURCE_ID_MARKER_RE = /^<!--\s*source-id:\s*([a-z0-9-]+)\s*-->$/;
const ATX_HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*$/;
const NO_SPACE_HEADING_RE = /^(#{1,6})([^\s#].*)$/;
const READ_ALOUD_RE = /^>\s*\*\*Read aloud:\*\*\s*(.+)$/;
const GM_ONLY_RE = /^>\s*\*\*GM only:\*\*\s*(.+)$/;
const BLOCKQUOTE_RE = /^>\s?(.*)$/;
// CommonMark HTML block types 1–6 may interrupt a paragraph; type 7 may not.
const MARKDOWN_BLOCK_START_RE =
  /^(?:#{1,6}(?:\s|$)|[-+*]\s+|1[.)]\s+|(?:`{3,}|~{3,})|(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$)/;
const COMMONMARK_HTML_BLOCK_START_RES = [
  /^<(?:script|pre|style|textarea)(?:[ \t>]|$)/i,
  /^(?:<!--|<\?|<!\[CDATA\[)/,
  /^<![A-Za-z]/,
  /^<\/?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:[ \t]|$|\/?>)/i,
] as const;
const SCENE_CONDITION_RE = /^-\s*\*\*Scene condition:\*\*\s*(.+)$/;
const ALT_SOLUTION_RE = /^-\s*\*\*By ([^:*]+):\*\*\s*(.+)$/i;
const MOTIVATION_RE = /\*\*Motivation:\*\*\s*([^\n]+)/g;
const SCENE_TITLE_RE = /^(?:Scene\s+\d+:|Optional Branch:)/i;
const OPTIONAL_BRANCH_RE = /^Optional Branch:/i;
const ENDING_TITLE_RE = /^Ending:\s*/i;

/** Maximum source size accepted for a single Markdown adventure import. */
export const MAX_ADVENTURE_MARKDOWN_BYTES = 2 * 1024 * 1024;

export interface RawSection {
  level: number;
  title: string;
  lines: string[];
  lineNumber: number;
  pageNumber?: number;
  pageEnd?: number;
  forceUnresolvedProvenance?: boolean;
}

interface FenceState {
  char: string | null;
  length: number;
  startLine: number;
}

interface SectionScanContent {
  explicitSourceId?: string;
  readAloud: string[];
  gmNotes: string[];
  conditions: string[];
  altSolutions: {
    method: string;
    description: string;
    socialBypassOfCombat?: boolean;
  }[];
  bodyLines: string[];
}

interface ParseAccumulator {
  allocatedSourceIds: Set<string>;
  reservedSourceIds: Set<string>;
  seenTitles: Map<string, string>;
  sections: SectionAnchor[];
  scenes: SceneRecord[];
  npcs: NpcRecord[];
  encounters: EncounterRecord[];
  secrets: SecretRecord[];
  endings: EndingRecord[];
  ambiguities: AmbiguityRecord[];
}

export function toKebabCase(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

function startsCommonMarkHtmlBlock(line: string): boolean {
  return COMMONMARK_HTML_BLOCK_START_RES.some((pattern) => pattern.test(line));
}

function isMarkdownBlockStart(line: string): boolean {
  return MARKDOWN_BLOCK_START_RE.test(line) || startsCommonMarkHtmlBlock(line);
}

function hasBinaryControlChars(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (
      code === 0 ||
      code === 127 ||
      (code < 32 && code !== 9 && code !== 10 && code !== 13)
    ) {
      return true;
    }
  }
  return false;
}

function exceedsMaxUtf8Bytes(text: string): boolean {
  if (text.length > MAX_ADVENTURE_MARKDOWN_BYTES) return true;
  return new TextEncoder().encode(text).byteLength > MAX_ADVENTURE_MARKDOWN_BYTES;
}

function inputTooLargeError(): AdventureImportError {
  return {
    code: "INPUT_TOO_LARGE",
    message: "Adventure Markdown files must be 2 MiB or smaller.",
  };
}

export async function computeSha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", copy);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function decodeStringInput(
  rawContent: string,
):
  | { ok: true; text: string; bytes: Uint8Array }
  | { ok: false; error: AdventureImportError } {
  if (exceedsMaxUtf8Bytes(rawContent)) {
    return { ok: false, error: inputTooLargeError() };
  }
  if (hasBinaryControlChars(rawContent)) {
    return {
      ok: false,
      error: {
        code: "BINARY_CONTENT",
        message: "Input appears to be binary data rather than Markdown text.",
      },
    };
  }
  if (rawContent.trim().length === 0) {
    return {
      ok: false,
      error: {
        code: "EMPTY_INPUT",
        message:
          "Input Markdown document is empty or contains only whitespace.",
      },
    };
  }
  return {
    ok: true,
    text: rawContent,
    bytes: new TextEncoder().encode(rawContent),
  };
}

function decodeBinaryInput(
  rawContent: Uint8Array,
):
  | { ok: true; text: string; bytes: Uint8Array }
  | { ok: false; error: AdventureImportError } {
  if (rawContent.byteLength > MAX_ADVENTURE_MARKDOWN_BYTES) {
    return { ok: false, error: inputTooLargeError() };
  }
  if (rawContent.byteLength === 0) {
    return {
      ok: false,
      error: { code: "EMPTY_INPUT", message: "Input file buffer is empty." },
    };
  }
  if (rawContent.includes(0)) {
    return {
      ok: false,
      error: {
        code: "BINARY_CONTENT",
        message: "Input buffer contains null bytes and is not valid Markdown.",
      },
    };
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(rawContent);
  } catch {
    return {
      ok: false,
      error: {
        code: "INVALID_UTF8",
        message: "Input buffer is not valid UTF-8 text.",
      },
    };
  }

  if (hasBinaryControlChars(text)) {
    return {
      ok: false,
      error: {
        code: "BINARY_CONTENT",
        message: "Input buffer contains binary control characters.",
      },
    };
  }
  if (text.trim().length === 0) {
    return {
      ok: false,
      error: {
        code: "EMPTY_INPUT",
        message:
          "Input Markdown document is empty or contains only whitespace.",
      },
    };
  }
  return { ok: true, text, bytes: rawContent };
}

function decodeInput(rawContent: string | Uint8Array) {
  return typeof rawContent === "string"
    ? decodeStringInput(rawContent)
    : decodeBinaryInput(rawContent);
}

function countTableColumns(line: string): number {
  const stripped = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return stripped.split("|").length;
}

function detectBrokenTables(
  lines: string[],
  ambiguities: AmbiguityRecord[],
): void {
  let i = 0;
  let tableIndex = 0;
  while (i < lines.length) {
    if (!lines[i].trimStart().startsWith("|")) {
      i++;
      continue;
    }
    const startLine = i + 1;
    const block: string[] = [];
    while (i < lines.length && lines[i].trimStart().startsWith("|")) {
      block.push(lines[i].trim());
      i++;
    }
    if (block.length < 2) continue;

    tableIndex++;
    const headerCols = countTableColumns(block[0]);
    const isBroken = block.some(
      (row) => !row.endsWith("|") || countTableColumns(row) !== headerCols,
    );
    if (isBroken) {
      ambiguities.push({
        id: `amb-table-${tableIndex}-${startLine}`,
        code: "MALFORMED_TABLE",
        message: `Broken Markdown table syntax starting at line ${startLine}.`,
        context: block.join("\n"),
        provenance: "unresolved",
      });
    }
  }
}

function updateFenceState(
  line: string,
  lineNumber: number,
  state: FenceState,
): boolean {
  const fenceMatch = line.match(/^(`{3,}|~{3,})/);
  if (!fenceMatch) return false;

  const marker = fenceMatch[1];
  if (!state.char) {
    state.char = marker[0];
    state.length = marker.length;
    state.startLine = lineNumber;
  } else if (marker[0] === state.char && marker.length >= state.length) {
    state.char = null;
    state.length = 0;
  }
  return true;
}

function matchHeading(
  line: string,
  lineNumber: number,
  prevLevel: number | null,
  ambiguities: AmbiguityRecord[],
): RawSection | null {
  const normalMatch = line.match(ATX_HEADING_RE);
  const noSpaceMatch = normalMatch ? null : line.match(NO_SPACE_HEADING_RE);
  const match = normalMatch ?? noSpaceMatch;
  if (!match) return null;

  const level = match[1].length;
  const title = match[2].trim();

  if (noSpaceMatch) {
    ambiguities.push({
      id: `amb-heading-nospace-${lineNumber}`,
      code: "MALFORMED_HEADING_NO_SPACE",
      message: `Heading at line ${lineNumber} is missing a space after '#' markers: "${line}".`,
      context: line,
      provenance: "unresolved",
    });
  }

  if (prevLevel !== null && level > prevLevel + 1) {
    ambiguities.push({
      id: `amb-heading-skip-${lineNumber}`,
      code: "SKIPPED_HEADING_LEVEL",
      message: `Heading "${title}" at line ${lineNumber} jumps from level ${prevLevel} to level ${level}.`,
      context: line,
      provenance: "unresolved",
    });
  }

  return { level, title, lines: [], lineNumber };
}

function scanSections(
  lines: string[],
  ambiguities: AmbiguityRecord[],
): { preamble: string[]; rawSections: RawSection[] } {
  const preamble: string[] = [];
  const rawSections: RawSection[] = [];
  const fence: FenceState = { char: null, length: 0, startLine: 0 };
  let current: RawSection | null = null;
  let prevLevel: number | null = null;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lineNumber = idx + 1;

    if (!updateFenceState(line, lineNumber, fence) && !fence.char) {
      const heading = matchHeading(line, lineNumber, prevLevel, ambiguities);
      if (heading) {
        prevLevel = heading.level;
        current = heading;
        rawSections.push(heading);
        continue;
      }
    }

    if (current) current.lines.push(line);
    else preamble.push(line);
  }

  if (fence.char) {
    ambiguities.push({
      id: `amb-unclosed-fence-${fence.startLine}`,
      code: "UNCLOSED_CODE_FENCE",
      message: `Unclosed code fence opened at line ${fence.startLine}.`,
      context: lines[fence.startLine - 1],
      provenance: "unresolved",
    });
  }

  return { preamble, rawSections };
}

function consumeGmOnlyBlockquote(
  line: string,
  content: SectionScanContent,
  active: boolean,
): { consumed: boolean; active: boolean } {
  const gmOnlyMatch = line.trim().match(GM_ONLY_RE);
  if (gmOnlyMatch) {
    content.gmNotes.push(gmOnlyMatch[1].trim());
    return { consumed: true, active: true };
  }

  if (active) {
    const blockquoteMatch = line.match(BLOCKQUOTE_RE);
    if (blockquoteMatch) {
      content.gmNotes.push(blockquoteMatch[1].trim());
      return { consumed: true, active: true };
    }

    const unquotedLine = line.replace(/^ {0,3}/, "");
    if (line.trim().length > 0 && !isMarkdownBlockStart(unquotedLine)) {
      content.gmNotes.push(line.trim());
      return { consumed: true, active: true };
    }
  }

  return { consumed: false, active: false };
}

function scanSectionLines(lines: string[]): SectionScanContent {
  const content: SectionScanContent = {
    readAloud: [],
    gmNotes: [],
    conditions: [],
    altSolutions: [],
    bodyLines: [],
  };
  let inGmOnlyBlockquote = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const markerMatch = !content.explicitSourceId
      ? trimmed.match(SOURCE_ID_MARKER_RE)
      : null;
    if (markerMatch) {
      content.explicitSourceId = markerMatch[1];
      continue;
    }

    const gmBlockquote = consumeGmOnlyBlockquote(
      line,
      content,
      inGmOnlyBlockquote,
    );
    inGmOnlyBlockquote = gmBlockquote.active;
    if (gmBlockquote.consumed) {
      continue;
    }

    const readAloudMatch = trimmed.match(READ_ALOUD_RE);
    if (readAloudMatch) {
      content.readAloud.push(readAloudMatch[1].trim());
      continue;
    }

    const condMatch = trimmed.match(SCENE_CONDITION_RE);
    if (condMatch) {
      content.conditions.push(condMatch[1].trim());
    }

    const altMatch = trimmed.match(ALT_SOLUTION_RE);
    if (altMatch) {
      const method = altMatch[1].trim().toLowerCase();
      content.altSolutions.push({
        method,
        description: altMatch[2].trim(),
        socialBypassOfCombat: method === "talk",
      });
    }

    content.bodyLines.push(line);
  }

  return content;
}

function resolveSectionIdentity(
  raw: RawSection,
  explicitSourceId: string | undefined,
  acc: ParseAccumulator,
  emitMissingSourceIdAmbiguity: boolean,
): { sourceId: string; provenance: Provenance } {
  const baseId = explicitSourceId ?? toKebabCase(raw.title);
  let sourceId = baseId;
  let provenance: Provenance = raw.forceUnresolvedProvenance
    ? "unresolved"
    : explicitSourceId
      ? "source-grounded"
      : "suggested";

  if (!explicitSourceId && emitMissingSourceIdAmbiguity) {
    acc.ambiguities.push({
      id: `amb-missing-source-id-${raw.lineNumber}`,
      code: "MISSING_SOURCE_ID",
      message: `Section "${raw.title}" at line ${raw.lineNumber} is missing a <!-- source-id: ... --> anchor comment.`,
      sourceId,
      provenance: "unresolved",
    });
  }

  const titleKey = raw.title.toLowerCase();
  const existingWithTitle = acc.seenTitles.get(titleKey);
  if (existingWithTitle) {
    provenance = "unresolved";
    acc.ambiguities.push({
      id: `amb-duplicate-heading-${raw.lineNumber}`,
      code: "DUPLICATE_HEADING",
      message: `Duplicate section heading "${raw.title}" at line ${raw.lineNumber} (already defined in "${existingWithTitle}").`,
      sourceId,
      provenance: "unresolved",
    });
  } else {
    acc.seenTitles.set(titleKey, sourceId);
  }

  if (acc.allocatedSourceIds.has(baseId)) {
    let suffix = 2;
    while (
      acc.allocatedSourceIds.has(`${baseId}-${suffix}`) ||
      acc.reservedSourceIds.has(`${baseId}-${suffix}`)
    ) {
      suffix++;
    }
    sourceId = `${baseId}-${suffix}`;
    provenance = "unresolved";
    acc.ambiguities.push({
      id: `amb-duplicate-source-id-${raw.lineNumber}`,
      code: "DUPLICATE_SOURCE_ID",
      message: `Duplicate source-id "${baseId}" at line ${raw.lineNumber}; disambiguated to "${sourceId}".`,
      sourceId,
      provenance: "unresolved",
    });
  }
  acc.allocatedSourceIds.add(sourceId);
  return { sourceId, provenance };
}

function recordNpcIfPresent(
  raw: RawSection,
  sourceId: string,
  body: string,
  provenance: Provenance,
  acc: ParseAccumulator,
): void {
  const motivations = [...body.matchAll(MOTIVATION_RE)].map((m) => m[1].trim());
  if (motivations.length === 1) {
    acc.npcs.push({
      name: raw.title,
      motivation: motivations[0],
      sourceId,
      provenance,
    });
    return;
  }
  if (motivations.length > 1) {
    acc.ambiguities.push({
      id: `amb-conflicting-motivation-${sourceId}`,
      code: "CONFLICTING_NPC_MOTIVATION",
      message: `Conflicting motivations found for "${raw.title}" in section "${sourceId}".`,
      sourceId,
      context: motivations.join(" | "),
      provenance: "unresolved",
    });
    acc.npcs.push({
      name: raw.title,
      motivation: motivations.join(" | "),
      sourceId,
      provenance: "unresolved",
    });
  }
}

function recordSectionAndSecrets(
  raw: RawSection,
  sourceId: string,
  provenance: Provenance,
  content: SectionScanContent,
  body: string,
  acc: ParseAccumulator,
): void {
  if (content.readAloud.length > 1) {
    acc.ambiguities.push({
      id: `amb-missing-heading-${sourceId}-${raw.lineNumber}`,
      code: "MISSING_HEADING",
      message: `Section "${raw.title}" (${sourceId}) contains ${content.readAloud.length} read-aloud blocks, indicating a missing section heading.`,
      sourceId,
      context: content.readAloud[1],
      provenance: "unresolved",
    });
  }

  const isGmOnlySection =
    content.gmNotes.length > 0 &&
    body.length === 0 &&
    content.readAloud.length === 0;

  acc.sections.push({
    sourceId,
    title: raw.title,
    level: raw.level,
    body,
    ...(content.readAloud.length > 0 ? { readAloud: content.readAloud } : {}),
    gmOnly: isGmOnlySection,
    ...(raw.pageNumber !== undefined ? { pageNumber: raw.pageNumber } : {}),
    ...(raw.pageNumber !== undefined &&
    raw.pageEnd !== undefined &&
    raw.pageEnd > raw.pageNumber
      ? { pageEnd: raw.pageEnd }
      : {}),
    provenance,
  });

  content.gmNotes.forEach((text, index) => {
    acc.secrets.push({
      id:
        content.gmNotes.length === 1
          ? `secret-${sourceId}`
          : `secret-${sourceId}-${index + 1}`,
      text,
      sourceId,
      gmOnly: true,
      provenance: "source-grounded",
    });
  });
}

function recordSceneAndEncounter(
  raw: RawSection,
  sourceId: string,
  provenance: Provenance,
  content: SectionScanContent,
  acc: ParseAccumulator,
): void {
  if (SCENE_TITLE_RE.test(raw.title)) {
    acc.scenes.push({
      sourceId,
      title: raw.title,
      conditions: content.conditions,
      ...(OPTIONAL_BRANCH_RE.test(raw.title) ? { optionalBranch: true } : {}),
      provenance,
    });
  }

  if (content.altSolutions.length > 0) {
    const proseLines = content.bodyLines.filter(
      (l) => !l.trim().startsWith("- **"),
    );
    acc.encounters.push({
      sourceId,
      title: raw.title,
      description: proseLines.join("\n").trim(),
      ...(content.conditions.length > 0
        ? { conditions: content.conditions }
        : {}),
      alternativeSolutions: content.altSolutions,
      provenance,
    });
  }
}

function processRawSection(
  raw: RawSection,
  acc: ParseAccumulator,
  emitMissingSourceIdAmbiguity: boolean,
): void {
  const content = scanSectionLines(raw.lines);
  const { sourceId, provenance } = resolveSectionIdentity(
    raw,
    content.explicitSourceId,
    acc,
    emitMissingSourceIdAmbiguity,
  );
  const body = content.bodyLines.join("\n").trim();

  recordSectionAndSecrets(raw, sourceId, provenance, content, body, acc);
  recordSceneAndEncounter(raw, sourceId, provenance, content, acc);
  recordNpcIfPresent(raw, sourceId, body, provenance, acc);

  if (ENDING_TITLE_RE.test(raw.title)) {
    const description = body || content.readAloud.join("\n");
    if (description.length > 0) {
      acc.endings.push({
        id: sourceId,
        title: raw.title,
        description,
        sourceId,
        provenance,
      });
    }
  }
}

function extractClues(sections: SectionAnchor[]): ClueRecord[] {
  const clues: ClueRecord[] = [];
  const primarySection = sections.find((s) =>
    /first way to learn/i.test(s.body),
  );
  if (!primarySection) return clues;

  const match = primarySection.body.match(
    /first way to learn\s+(?:that\s+)?([^.]+(?:\.[^.]+)?)\./i,
  );
  if (!match) return clues;

  const altRefMatch = primarySection.body.match(/\((Scene\s+\d+)\)/i);
  const altSection = altRefMatch
    ? sections.find((s) =>
        s.title.toLowerCase().startsWith(altRefMatch[1].toLowerCase()),
      )
    : undefined;
  const alternativeSourceId =
    altSection && altSection.sourceId !== primarySection.sourceId
      ? altSection.sourceId
      : undefined;

  clues.push({
    clue: match[1].trim(),
    primarySourceId: primarySection.sourceId,
    ...(alternativeSourceId ? { alternativeSourceId } : {}),
    provenance: "source-grounded",
  });

  return clues;
}

export interface BuildAdventurePackageOptions {
  fileName: string;
  documentHash: string;
  importMethod: "markdown" | "pdf";
  rawSections: RawSection[];
  ambiguities: AmbiguityRecord[];
  emitMissingSourceIdAmbiguity?: boolean;
}

export function buildAdventureSourcePackageFromSections(
  options: BuildAdventurePackageOptions,
): AdventureSourcePackage {
  const reservedSourceIds = new Set(
    options.rawSections.flatMap((section) => {
      for (const line of section.lines) {
        const markerMatch = line.trim().match(SOURCE_ID_MARKER_RE);
        if (markerMatch) return [markerMatch[1]];
      }
      return [];
    }),
  );
  const acc: ParseAccumulator = {
    allocatedSourceIds: new Set(),
    reservedSourceIds,
    seenTitles: new Map(),
    sections: [],
    scenes: [],
    npcs: [],
    encounters: [],
    secrets: [],
    endings: [],
    ambiguities: [...options.ambiguities],
  };

  const emitMissingSourceId = options.emitMissingSourceIdAmbiguity ?? true;
  for (const raw of options.rawSections) {
    processRawSection(raw, acc, emitMissingSourceId);
  }

  const titleSection = acc.sections.find((s) => s.level === 1);
  return {
    schemaVersion: ADVENTURE_SOURCE_SCHEMA_VERSION,
    status: "draft",
    documentHash: options.documentHash,
    sourceIdentity: {
      fileName: options.fileName.trim(),
      ...(titleSection ? { title: titleSection.title } : {}),
    },
    importMethod: options.importMethod,
    importVersion: ADVENTURE_IMPORT_VERSION,
    sections: acc.sections,
    scenes: acc.scenes,
    npcs: acc.npcs,
    clues: extractClues(acc.sections),
    encounters: acc.encounters,
    secrets: acc.secrets,
    endings: acc.endings,
    ambiguities: acc.ambiguities,
  };
}

export async function parseAdventureMarkdown(
  rawContent: string | Uint8Array,
  options: { fileName: string },
): Promise<ParseAdventureResult> {
  if (
    !options ||
    typeof options.fileName !== "string" ||
    options.fileName.trim().length === 0
  ) {
    return {
      ok: false,
      error: {
        code: "INVALID_OPTIONS",
        message: "A non-empty options.fileName is required.",
      },
    };
  }

  const decoded = decodeInput(rawContent);
  if (!decoded.ok) return decoded;

  const lines = decoded.text.replace(/\r\n?/g, "\n").split("\n");
  const ambiguities: AmbiguityRecord[] = [];
  const { preamble, rawSections } = scanSections(lines, ambiguities);
  detectBrokenTables(lines, ambiguities);

  if (rawSections.length === 0) {
    return {
      ok: false,
      error: {
        code: "NO_SECTIONS",
        message: "Document contains no Markdown headings or sections.",
      },
    };
  }

  const preambleText = preamble.join("\n").trim();
  if (preambleText.length > 0) {
    ambiguities.push({
      id: "amb-unanchored-preamble",
      code: "UNANCHORED_PREAMBLE",
      message: "Document contains text before the first Markdown heading.",
      context: preambleText.slice(0, 200),
      provenance: "unresolved",
    });
  }

  const documentHash = await computeSha256Hex(decoded.bytes);
  const pkg = buildAdventureSourcePackageFromSections({
    fileName: options.fileName,
    documentHash,
    importMethod: "markdown",
    rawSections,
    ambiguities,
    emitMissingSourceIdAmbiguity: true,
  });

  return { ok: true, package: pkg };
}
