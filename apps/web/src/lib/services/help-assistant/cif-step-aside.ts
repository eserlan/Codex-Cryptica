import type { GuidanceAction, GuidanceStep } from "help-engine";
import type { HighlightRect } from "./help-highlight.svelte";

/** Room around the ring taken by its outline, glow and the label above it. */
const RING_PAD = 10;
const LABEL_ROOM = 32;

const opensDialog = (step: GuidanceStep): boolean =>
  step.type === "openHelp" ||
  step.type === "openGenerator" ||
  step.type === "openFeedback" ||
  (step.type === "openPanel" && step.panel.startsWith("settings-"));

const overlaps = (a: HighlightRect, b: HighlightRect): boolean =>
  a.left < b.left + b.width &&
  b.left < a.left + a.width &&
  a.top < b.top + b.height &&
  b.top < a.top + a.height;

/**
 * Whether the Cif panel should close after a guide has run. It stays open so
 * the user can keep asking while Cif points, and only steps aside when it
 * would be in the way:
 * - on a phone, where the panel takes most of the screen;
 * - when the guide opened a dialog (a help article, the generator, Settings,
 *   the report form),
 *   which takes over the screen and its focus;
 * - when the highlighted control, with its label, sits under the panel.
 */
export function shouldStepAside(input: {
  isMobile: boolean;
  action: GuidanceAction;
  /** Where the highlight landed, or null when the guide highlighted nothing. */
  highlight: HighlightRect | null;
  /** Where the docked panel is, or null when it is not on screen. */
  panel: HighlightRect | null;
}): boolean {
  const { isMobile, action, highlight, panel } = input;
  if (isMobile) return true;
  if (opensDialog(action) || (action.then && opensDialog(action.then))) {
    return true;
  }
  if (!highlight || !panel) return false;
  const ring = {
    top: highlight.top - RING_PAD - LABEL_ROOM,
    left: highlight.left - RING_PAD,
    width: highlight.width + RING_PAD * 2,
    height: highlight.height + RING_PAD * 2 + LABEL_ROOM,
  };
  return overlaps(ring, panel);
}
