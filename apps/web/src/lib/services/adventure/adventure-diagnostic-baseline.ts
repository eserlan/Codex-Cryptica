import type { AdventureSession } from "@codex/adventure-engine";
import {
  diagnosticState,
  type DiagnosticBaseline,
} from "./adventure-diagnostic-state";
export interface DiagnosticStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

const DIAGNOSTIC_BASELINE_PREFIX = "codex-adventure-diagnostic-baseline:";

function baselineKey(sessionId: string): string {
  return DIAGNOSTIC_BASELINE_PREFIX + sessionId;
}

/** Read a previously saved diagnostic baseline for `sessionId`, if valid. */
export function loadDiagnosticBaseline(
  sessionId: string,
  storage: DiagnosticStorage | null | undefined,
): DiagnosticBaseline | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(baselineKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DiagnosticBaseline>;
    if (
      parsed.sessionId !== sessionId ||
      typeof parsed.revision !== "number" ||
      typeof parsed.turnCount !== "number" ||
      !parsed.state
    ) {
      return null;
    }
    return parsed as DiagnosticBaseline;
  } catch {
    return null;
  }
}

/** Advance the local delta cursor after the diagnostic text was copied. */
export function saveDiagnosticBaseline(
  session: AdventureSession,
  storage: DiagnosticStorage | null | undefined,
): void {
  if (!storage) return;
  try {
    storage.setItem(
      baselineKey(session.id),
      JSON.stringify({
        sessionId: session.id,
        revision: session.revision,
        turnCount: session.turns.length,
        state: structuredClone(diagnosticState(session)),
      }),
    );
  } catch {
    // Ignore storage quota / privacy-mode errors; clipboard copy still succeeds.
  }
}
