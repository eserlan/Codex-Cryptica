import type { AdventureSession } from "@codex/adventure-engine";
import {
  loadDiagnosticBaseline,
  type DiagnosticStorage,
} from "./adventure-diagnostic-baseline";
import {
  adventureDiagnosticJson,
  adventureDiagnosticDeltaJson,
  type AdventureDiagnosticOptions,
} from "./adventure-diagnostic-snapshot";
import type { DiagnosticBaseline } from "./adventure-diagnostic-state";

export {
  adventureReviewJson,
  adventureReviewMarkdown,
} from "./adventure-review-formats";
export { adventureDiagnosticJson, adventureDiagnosticDeltaJson };
export { saveDiagnosticBaseline } from "./adventure-diagnostic-baseline";
export type {
  AdventureDiagnosticOptions,
  DiagnosticStorage,
  DiagnosticBaseline,
};
export type { TurnRejectionDiagnostic } from "./adventure-diagnostic-snapshot";

/** Read a previously saved diagnostic baseline for `sessionId`, if valid. */
export function readDiagnosticBaseline(
  sessionId: string,
  storage: DiagnosticStorage | null | undefined,
): DiagnosticBaseline | null {
  return loadDiagnosticBaseline(sessionId, storage);
}

/**
 * Copy-ready diagnostic JSON: emits a delta from the last successful copy when
 * a valid baseline exists for the same session (unless `forceFull` is set).
 */
export function copyDiagnosticSnapshot(
  session: AdventureSession,
  storage: DiagnosticStorage | null | undefined,
  options: AdventureDiagnosticOptions & { forceFull?: boolean } = {},
): {
  text: string;
  isDelta: boolean;
  fromTurnCount: number;
  toTurnCount: number;
} {
  const baseline = options.forceFull
    ? null
    : readDiagnosticBaseline(session.id, storage);
  const canDelta =
    baseline !== null &&
    session.turns.length >= baseline.turnCount &&
    session.revision >= baseline.revision;
  const text = canDelta
    ? adventureDiagnosticDeltaJson(session, baseline, options)
    : adventureDiagnosticJson(session, options);

  return {
    text,
    isDelta: canDelta,
    fromTurnCount: canDelta ? baseline.turnCount : 0,
    toTurnCount: session.turns.length,
  };
}
