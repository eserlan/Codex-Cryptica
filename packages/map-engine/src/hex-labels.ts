import type { HexCoord, HexOrientation } from "./hex";

export type HexLabelStyle =
  "none" | "off" | "numeric" | "alphanumeric" | "axial";

export interface HexLabelConfig {
  /**
   * The style to use when displaying hex coordinates:
   * - "none" / "off": No coordinate label
   * - "alphanumeric": Lettered columns and numbered rows (e.g. "A01", "B03")
   * - "numeric": Default two-component numeric format (e.g. "01.04")
   * - "axial": Raw axial coordinates (e.g. "(1, 4)")
   */
  style: HexLabelStyle;
  /** Starting column letter for alphanumeric mode (e.g. "A"). Default: "A". */
  startCol?: string;
  /** Alias for startCol. */
  startColumn?: string;
  /** Starting row number for alphanumeric mode (e.g. 1). Default: 1. */
  startRow?: number;
  /** Zero-padding digits for row number (e.g. 2 for "01", 1 for "1"). Default: 2. */
  rowPadding?: number;
  /** Optional separator between column and row (e.g. "" for "A01", "-" for "A-01", "." for "A.01"). Default: "". */
  separator?: string;
  /** Invert row numbering direction (positive row goes up/north instead of down/south). Default: false. */
  invertRow?: boolean;
  /** Axial q coordinate of the origin hex corresponding to startCol/startRow. Default: 0. */
  originQ?: number;
  /** Axial r coordinate of the origin hex corresponding to startCol/startRow. Default: 0. */
  originR?: number;
}

/**
 * Convert 0-based column index to spreadsheet-style letters:
 * 0 -> "A", 25 -> "Z", 26 -> "AA", 27 -> "AB", etc.
 */
export function indexToColumnLetters(index: number): string {
  if (!Number.isSafeInteger(index) || index < 0) return "";
  let letters = "";
  let n = index;
  while (n >= 0) {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26) - 1;
  }
  return letters;
}

/**
 * Convert spreadsheet-style column letters back to 0-based index:
 * "A" -> 0, "Z" -> 25, "AA" -> 26, "AB" -> 27, etc.
 */
export function columnLettersToIndex(letters: string): number {
  const upper = letters.toUpperCase().trim();
  if (!upper) return 0;
  let result = 0;
  for (let i = 0; i < upper.length; i++) {
    const code = upper.charCodeAt(i);
    if (code < 65 || code > 90) continue;
    result = result * 26 + (code - 64);
  }
  return Math.max(0, result - 1);
}

/**
 * Convert axial coordinate (q, r) to grid offset (col, row).
 */
export function axialToOffset(
  hex: HexCoord,
  orientation: HexOrientation,
): { col: number; row: number } {
  if (orientation === "pointy") {
    // odd-r offset coordinates
    return {
      col: hex.q + Math.floor(hex.r / 2),
      row: hex.r,
    };
  } else {
    // odd-q offset coordinates
    return {
      col: hex.q,
      row: hex.r + Math.floor(hex.q / 2),
    };
  }
}

/**
 * Convert grid offset (col, row) to axial coordinate (q, r).
 */
export function offsetToAxial(
  col: number,
  row: number,
  orientation: HexOrientation,
): HexCoord {
  if (orientation === "pointy") {
    return {
      q: col - Math.floor(row / 2),
      r: row,
    };
  } else {
    return {
      q: col,
      r: row - Math.floor(col / 2),
    };
  }
}

/**
 * Format a component integer for legacy numeric style ("01", "-02", "12").
 */
function formatNumericComponent(val: number): string {
  const sign = val < 0 ? "-" : "";
  const abs = Math.abs(val);
  const padded = abs < 10 ? `0${abs}` : `${abs}`;
  return `${sign}${padded}`;
}

/**
 * Format alphanumeric style (e.g. "A01", "B03").
 */
// fallow-ignore-next-line complexity
function formatAlphanumericHex(
  hex: HexCoord,
  config: HexLabelConfig | undefined,
  orientation: HexOrientation,
): string {
  const requestedStartCol = config?.startCol ?? config?.startColumn;
  const startColLetters =
    typeof requestedStartCol === "string" &&
    /^[A-Za-z]{1,3}$/.test(requestedStartCol)
      ? requestedStartCol
      : "A";
  const startColIndex = columnLettersToIndex(startColLetters);
  const startRow = config?.startRow ?? 1;
  const requestedPadding = config?.rowPadding ?? 2;
  // Configs can come from persisted settings or session snapshots. Keep a bad
  // value from asking padStart to allocate an unbounded string during render.
  const rowPadding = Number.isFinite(requestedPadding)
    ? Math.min(32, Math.max(1, Math.trunc(requestedPadding)))
    : 2;
  const requestedSeparator = config?.separator;
  const separator =
    typeof requestedSeparator === "string" && requestedSeparator.length <= 1
      ? requestedSeparator
      : "";
  const invertRow = config?.invertRow ?? false;

  const originQ = config?.originQ ?? 0;
  const originR = config?.originR ?? 0;
  if (![hex.q, hex.r, originQ, originR, startRow].every(Number.isFinite)) {
    return "";
  }
  const originOffset = axialToOffset({ q: originQ, r: originR }, orientation);
  const targetOffset = axialToOffset(hex, orientation);

  const colDiff = targetOffset.col - originOffset.col;
  const rowDiffRaw = targetOffset.row - originOffset.row;
  const rowDiff = invertRow ? -rowDiffRaw : rowDiffRaw;

  const finalColIndex = startColIndex + colDiff;
  const finalRowNum = startRow + rowDiff;
  if (!Number.isSafeInteger(finalColIndex) || !Number.isFinite(finalRowNum)) {
    return "";
  }
  const colStr =
    finalColIndex >= 0
      ? indexToColumnLetters(finalColIndex)
      : `-${indexToColumnLetters(Math.abs(finalColIndex) - 1)}`;

  const rowStr =
    finalRowNum >= 0
      ? String(finalRowNum).padStart(rowPadding, "0")
      : `-${String(Math.abs(finalRowNum)).padStart(rowPadding, "0")}`;

  return `${colStr}${separator}${rowStr}`;
}

/**
 * Format a hex coordinate according to the provided label configuration.
 */
export function formatHexLabel(
  hex: HexCoord,
  config?: HexLabelConfig,
  orientation: HexOrientation = "pointy",
): string {
  const style = config?.style ?? "numeric";

  if (style === "none" || style === "off") {
    return "";
  }

  if (style === "axial") {
    return `(${hex.q}, ${hex.r})`;
  }

  if (style === "numeric") {
    return `${formatNumericComponent(hex.q)}.${formatNumericComponent(hex.r)}`;
  }

  if (style !== "alphanumeric") {
    return "";
  }

  return formatAlphanumericHex(hex, config, orientation);
}

const NUMERIC_LABEL = /^(-?\d+)\.(-?\d+)$/;
const AXIAL_LABEL = /^\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)$/;

/**
 * Parse a typed hex label (the inverse of `formatHexLabel`), e.g. "C04" or
 * "01.04". Returns null when the text is not a label for this grid.
 *
 * Every candidate is checked by formatting it again and comparing, so a label
 * only parses when it is exactly what `formatHexLabel` would show for that hex.
 * Case and surrounding spaces are ignored. With labels hidden ("none"/"off")
 * the default numeric format is accepted.
 */
export function parseHexLabel(
  text: string,
  config: HexLabelConfig | undefined,
  orientation: HexOrientation = "pointy",
): HexCoord | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const style = config?.style ?? "numeric";
  const candidate =
    style === "axial"
      ? parseAxialCandidate(trimmed)
      : style === "alphanumeric"
        ? parseAlphanumericCandidate(trimmed, config, orientation)
        : parseNumericCandidate(trimmed);
  if (!candidate) return null;

  const shown = formatHexLabel(
    candidate,
    labelConfigFor(style, config),
    orientation,
  );
  const normalise = (value: string) => value.replace(/\s+/g, "").toUpperCase();
  return normalise(shown) === normalise(trimmed) ? candidate : null;
}

function labelConfigFor(
  style: HexLabelStyle,
  config: HexLabelConfig | undefined,
): HexLabelConfig {
  // With labels hidden the typed text uses the default numeric format.
  return style === "none" || style === "off"
    ? { style: "numeric" }
    : (config ?? { style });
}

function parseNumericCandidate(text: string): HexCoord | null {
  const match = NUMERIC_LABEL.exec(text);
  return match ? { q: Number(match[1]), r: Number(match[2]) } : null;
}

function parseAxialCandidate(text: string): HexCoord | null {
  const match = AXIAL_LABEL.exec(text);
  return match ? { q: Number(match[1]), r: Number(match[2]) } : null;
}

function parseAlphanumericCandidate(
  text: string,
  config: HexLabelConfig | undefined,
  orientation: HexOrientation,
): HexCoord | null {
  const match = alphanumericPattern(config).exec(text);
  if (!match) return null;

  const letterIndex = columnLettersToIndex(match[2]);
  const finalColIndex = match[1] === "-" ? -(letterIndex + 1) : letterIndex;
  const finalRowNum = Number(match[3]);
  if (!Number.isSafeInteger(finalColIndex) || !Number.isFinite(finalRowNum)) {
    return null;
  }

  const origin = labelOrigin(config);
  const colDiff = finalColIndex - origin.startColIndex;
  const rowDiff = finalRowNum - origin.startRow;
  const rowDiffRaw = origin.invertRow ? -rowDiff : rowDiff;

  const originOffset = axialToOffset(
    { q: origin.originQ, r: origin.originR },
    orientation,
  );
  return offsetToAxial(
    originOffset.col + colDiff,
    originOffset.row + rowDiffRaw,
    orientation,
  );
}

/** The pattern a label in this grid's alphanumeric style must match. */
function alphanumericPattern(config: HexLabelConfig | undefined): RegExp {
  // Use the separator the labels are formatted with, so "-I-05" is column -I, row -05.
  const requestedSeparator = config?.separator;
  const separator =
    typeof requestedSeparator === "string" && requestedSeparator.length <= 1
      ? requestedSeparator
      : "";
  const escaped = separator.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
  return new RegExp(`^(-?)([A-Za-z]{1,3})${escaped}(-?\\d+)$`);
}

/** Where the grid's alphanumeric labels start, mirroring formatAlphanumericHex. */
function labelOrigin(config: HexLabelConfig | undefined) {
  return {
    startColIndex: startColumnIndex(config),
    startRow: config?.startRow ?? 1,
    invertRow: config?.invertRow ?? false,
    originQ: config?.originQ ?? 0,
    originR: config?.originR ?? 0,
  };
}

/** Column index of the first label column. Invalid letters fall back to "A". */
function startColumnIndex(config: HexLabelConfig | undefined): number {
  const requested = config?.startCol ?? config?.startColumn;
  const letters =
    typeof requested === "string" && /^[A-Za-z]{1,3}$/.test(requested)
      ? requested
      : "A";
  return columnLettersToIndex(letters);
}
