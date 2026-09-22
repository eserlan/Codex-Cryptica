import { isModeId, type ModeId } from "generator-engine";
import type { IdeaDeveloperStore } from "$lib/stores/idea-developer.svelte";

/**
 * Reads where a visitor came from when they follow a "Develop your idea" link
 * (#3228). Only a plain slug and two enumerated values are accepted, so no
 * free text (and never any idea text) can travel in the link or reach analytics.
 */
export type ArrivalSourceKind = "answer" | "tools" | "other";

export interface Arrival {
  sourceKind: ArrivalSourceKind;
  sourceId: string;
  suggestedMode?: ModeId;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LENGTH = 120;

function sourceKindOf(value: string | null): ArrivalSourceKind {
  return value === "answer" || value === "tools" ? value : "other";
}

export function parseArrival(search: string | URLSearchParams): Arrival | null {
  const params =
    typeof search === "string" ? new URLSearchParams(search) : search;
  const source = params.get("source");
  if (!source || source.length > MAX_SLUG_LENGTH || !SLUG.test(source)) {
    return null;
  }
  const mode = params.get("mode");
  return {
    sourceKind: sourceKindOf(params.get("from")),
    sourceId: source,
    ...(mode && isModeId(mode) ? { suggestedMode: mode } : {}),
  };
}

/**
 * Preselects the suggested mode and focuses the input, for a fresh visit only.
 * A conversation already in progress in this tab is left alone.
 */
export function applyArrival(
  arrival: Arrival | null,
  store: Pick<IdeaDeveloperStore, "status" | "setMode">,
  focusInput: () => void,
): void {
  if (!arrival || store.status === "active") return;
  if (arrival.suggestedMode) store.setMode(arrival.suggestedMode);
  focusInput();
}
