import type {
  DirectorDeliveryReason,
  DirectorDeliveryTrace,
  PromptDirectorMeta,
  ResolvedSourceExcerpt,
} from "@codex/adventure-engine";
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

const DIRECTOR_KEY = "GM-ONLY director brief";

function omittedReason(
  meta: PromptDirectorMeta | undefined,
): DirectorDeliveryReason {
  if (!meta) return "unknown";
  if (!meta.enabled) return "disabled";
  return meta.omittedByBudget ? "budget" : "not-applicable";
}

function withMetaExtras(
  trace: DirectorDeliveryTrace,
  meta: PromptDirectorMeta | undefined,
): DirectorDeliveryTrace {
  if (!meta) return trace;
  return {
    ...trace,
    ...(meta.focusedScenarioId
      ? { focusedScenarioId: meta.focusedScenarioId }
      : {}),
    recoveryReason: meta.recoveryReason,
    ...(meta.requestedDevelopmentKind
      ? { requestedDevelopmentKind: meta.requestedDevelopmentKind }
      : {}),
  };
}

function traceDeliveredBrief(
  briefValue: unknown,
  meta: PromptDirectorMeta | undefined,
): DirectorDeliveryTrace {
  const deliveredChars = JSON.stringify(briefValue).length;
  const truncated = Boolean(meta?.truncatedByBudget);
  return withMetaExtras(
    {
      status: truncated ? "truncated" : "included",
      reason: truncated ? "budget" : "delivered",
      deliveredChars,
    },
    meta,
  );
}

/**
 * Classifies Director brief delivery from the actual outgoing request payload
 * (`state` or `stateDelta`), never inferring delivery from local construction.
 */
export function computeDirectorDeliveryTrace(
  prompt: AdventurePrompt,
  payload: Record<string, unknown>,
  fullState: Record<string, unknown>,
  isDelta: boolean,
): DirectorDeliveryTrace {
  const meta = prompt.directorMeta;
  if (isDelta) {
    const delta = payload.stateDelta as Record<string, unknown> | undefined;
    if (delta && DIRECTOR_KEY in delta) {
      const val = delta[DIRECTOR_KEY];
      return val !== null && val !== undefined
        ? traceDeliveredBrief(val, meta)
        : withMetaExtras(
            {
              status: "omitted",
              reason: omittedReason(meta),
              deliveredChars: 0,
            },
            meta,
          );
    }
    return DIRECTOR_KEY in fullState
      ? withMetaExtras(
          {
            status: "retained",
            reason: "retained-unchanged",
            deliveredChars: 0,
          },
          meta,
        )
      : withMetaExtras(
          { status: "omitted", reason: omittedReason(meta), deliveredChars: 0 },
          meta,
        );
  }
  const sentState = payload.state as Record<string, unknown> | undefined;
  const val = sentState?.[DIRECTOR_KEY];
  return val !== undefined && val !== null
    ? traceDeliveredBrief(val, meta)
    : withMetaExtras(
        { status: "omitted", reason: omittedReason(meta), deliveredChars: 0 },
        meta,
      );
}

export function buildAdventureInteractionInput(
  prompt: AdventurePrompt,
  interaction: AdventureInteraction,
  responseRepair?: string,
): {
  input: string;
  state: Record<string, unknown>;
  sourceEntries: Array<{ id: string; snippet: string; hash: string }>;
  directorDelivery: DirectorDeliveryTrace;
} {
  const sourceEntries = buildSourceEntries(prompt);
  const payload = JSON.parse(prompt.serialized) as Record<string, unknown>;
  const state = JSON.parse(prompt.state) as Record<string, unknown>;
  const isDelta = Boolean(
    interaction.previousInteractionId && interaction.stateSnapshot,
  );
  if (isDelta) {
    const partition = interaction.tracker.partition(sourceEntries);
    const changed = new Set(partition.newOrChanged.map((entry) => entry.id));
    payload.anchors = prompt.anchors.filter((s) => changed.has(s.recordId));
    payload.relevant = prompt.relevant.filter((s) => changed.has(s.recordId));
    payload.retainedSourceIds = partition.unchanged.map((s) => s.id);
    payload.stateDelta = stateDelta(interaction.stateSnapshot!, state);
    delete payload.state;
    // Earlier dialogue is already retained by the provider; on an expired
    // ID, resetting the interaction resends the bounded local transcript.
    delete payload.transcript;
  }
  if (responseRepair) payload.responseRepair = responseRepair;
  const directorDelivery = computeDirectorDeliveryTrace(
    prompt,
    payload,
    state,
    isDelta,
  );
  return {
    input: JSON.stringify(payload),
    state,
    sourceEntries,
    directorDelivery,
  };
}
