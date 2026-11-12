import type { ResolvedSourceExcerpt } from "@codex/adventure-engine";
import { entityContentHash } from "@codex/oracle-engine";
import type {
  AdventureInteraction,
  AdventurePrompt,
} from "./adventure-generation.types";

export function adventureSourceHash(source: ResolvedSourceExcerpt): string {
  return entityContentHash(JSON.stringify(source));
}

function buildSourceEntries(prompt: AdventurePrompt) {
  const seen = new Set<string>();
  return [...prompt.anchors, ...prompt.relevant].flatMap((source) => {
    if (seen.has(source.recordId)) return [];
    seen.add(source.recordId);
    const snippet = JSON.stringify(source);
    return [
      {
        id: source.recordId,
        snippet,
        hash: entityContentHash(snippet),
      },
    ];
  });
}

/** Only changes to the state snapshot are sent while provider history is valid.
 * A null represents removal of an optional top-level field. */
function stateDelta(
  previous: Record<string, unknown>,
  current: Record<string, unknown>,
): Record<string, unknown> {
  const delta: Record<string, unknown> = {};
  for (const key of new Set([
    ...Object.keys(previous),
    ...Object.keys(current),
  ])) {
    if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
      delta[key] = key in current ? current[key] : null;
    }
  }
  return delta;
}

export function buildAdventureInteractionInput(
  prompt: AdventurePrompt,
  interaction: AdventureInteraction,
  responseRepair?: string,
): {
  input: string;
  state: Record<string, unknown>;
  sourceEntries: Array<{ id: string; snippet: string; hash: string }>;
} {
  const sourceEntries = buildSourceEntries(prompt);
  const payload = JSON.parse(prompt.serialized) as Record<string, unknown>;
  const state = JSON.parse(prompt.state) as Record<string, unknown>;
  if (interaction.previousInteractionId && interaction.stateSnapshot) {
    const partition = interaction.tracker.partition(sourceEntries);
    const changed = new Set(partition.newOrChanged.map((entry) => entry.id));
    payload.anchors = prompt.anchors.filter((s) => changed.has(s.recordId));
    payload.relevant = prompt.relevant.filter((s) => changed.has(s.recordId));
    payload.retainedSourceIds = partition.unchanged.map((s) => s.id);
    payload.stateDelta = stateDelta(interaction.stateSnapshot, state);
    delete payload.state;
    // Earlier dialogue is already retained by the provider; on an expired
    // ID, resetting the interaction resends the bounded local transcript.
    delete payload.transcript;
  }
  if (responseRepair) payload.responseRepair = responseRepair;
  return { input: JSON.stringify(payload), state, sourceEntries };
}
