import type { HelpStatus } from "$lib/stores/help-assistant/help-assistant.svelte";

export type CifMood =
  "idle" | "curious" | "thinking" | "explaining" | "confused";

/**
 * Cif's pose follows what the assistant is actually doing, never a random
 * flourish: waiting to be asked, looking something up, answering, or unable
 * to help. Moods are decoration only; the panel text says the same thing.
 */
export function cifMood(state: {
  status: HelpStatus;
  messageCount: number;
}): CifMood {
  switch (state.status) {
    case "pending":
      return "thinking";
    case "answered":
      return "explaining";
    case "no-match":
    case "out-of-scope":
    case "fallback":
      return "confused";
    case "idle":
      return state.messageCount === 0 ? "curious" : "idle";
  }
}
