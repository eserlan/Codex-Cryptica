import type { HelpStatus } from "#lib/stores/help-assistant/help-assistant.svelte.js";

export type CifMood =
  | "idle"
  | "curious"
  | "thinking"
  | "explaining"
  | "delighted"
  | "confused"
  /** Only the flying pointer uses this; `cifMood` never returns it. */
  | "pointing";

/** How long Cif beams after an answer arrives, before settling to explaining. */
export const DELIGHT_MS = 1600;

/**
 * Cif's pose follows what the assistant is actually doing, never a random
 * flourish: waiting to be asked, looking something up, answering, or unable
 * to help. Moods are decoration only; the panel text says the same thing.
 */
export function cifMood(state: {
  status: HelpStatus;
  messageCount: number;
  /** True for a moment after an answer arrives. */
  delighted?: boolean;
}): CifMood {
  switch (state.status) {
    case "pending":
      return "thinking";
    case "answered":
      return state.delighted ? "delighted" : "explaining";
    case "no-match":
    case "out-of-scope":
    case "fallback":
      return "confused";
    case "idle":
      return state.messageCount === 0 ? "curious" : "idle";
  }
}
