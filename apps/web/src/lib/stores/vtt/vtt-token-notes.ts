import type {
  Token,
  TokenCreationInput,
  TokenStateUpdateInput,
} from "../../../types/vtt";
import { isNoteCollapsed, NOTE_COLLAPSED_SCALE } from "map-engine";

/** Sticky-note amber distinguishes GM annotations from character tokens. */
export const NOTE_DEFAULT_COLOR = "#f5b942";

export function collapsedNoteSize(gridSize: number) {
  return Math.max(16, Math.round((gridSize || 50) * NOTE_COLLAPSED_SCALE));
}

export function noteDefaults(input: TokenCreationInput, gridSize: number) {
  const expandedSize = Math.round(Math.max(30, gridSize || 50) * 1.5);
  // An explicitly sized note lands open; otherwise it starts as a marker.
  const landsCollapsed = input.width === undefined;
  const size = landsCollapsed ? collapsedNoteSize(gridSize) : expandedSize;
  return {
    width: input.width ?? size,
    height: input.height ?? size,
    noteBody: input.noteBody ?? "",
    noteCollapsedFrom:
      input.noteCollapsedFrom ??
      (landsCollapsed
        ? { width: expandedSize, height: expandedSize }
        : undefined),
  };
}

export function noteCollapseUpdate(
  token: Token | undefined,
  gridSize: number,
): TokenStateUpdateInput | null {
  if (!token || token.kind !== "note") return null;
  if (isNoteCollapsed(token)) {
    const restored = token.noteCollapsedFrom!;
    return {
      width: restored.width,
      height: restored.height,
      noteCollapsedFrom: undefined,
    };
  }
  const size = collapsedNoteSize(gridSize);
  return {
    width: size,
    height: size,
    noteCollapsedFrom: { width: token.width, height: token.height },
  };
}
