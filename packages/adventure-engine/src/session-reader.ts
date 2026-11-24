import type { AdventureSession } from "./types";
import {
  adventureSessionSchema,
  CURRENT_ADVENTURE_SCHEMA_VERSION,
} from "./session-schema";
import {
  isSessionDocument,
  migrateAdventureSession,
} from "./session-migration";
import { validateScenarioIdentitySpace } from "./scenario-identity";
import {
  MAX_DURABLE_STATE_CHARS,
  validateDurableStateBudget,
} from "./session-budget";

export function parseAdventureSession(input: unknown): AdventureSession {
  const parsed = readValidatedSession(input);
  assertStateBudget(parsed);
  return parsed;
}

function readValidatedSession(input: unknown): AdventureSession {
  const parsed = adventureSessionSchema.parse(migrateAdventureSession(input));
  validateScenarioIdentitySpace(parsed as AdventureSession);
  return parsed as AdventureSession;
}

function assertStateBudget(parsed: AdventureSession): void {
  if (!validateDurableStateBudget(parsed)) {
    throw new Error("state-budget-exceeded");
  }
}

export type AdventureSessionReadResult =
  | { mode: "writable"; session: AdventureSession }
  | {
      mode: "legacy-read-only-recovery";
      session: AdventureSession;
      exportDocument: unknown;
      reason: "migration-budget-exceeded";
    };

/** Keep valid legacy bytes inspectable if only additive v3 metadata breaks the state ceiling. */
export function parseAdventureSessionForRecovery(
  input: unknown,
): AdventureSessionReadResult {
  try {
    return { mode: "writable", session: parseAdventureSession(input) };
  } catch (cause) {
    if (!isRecoverableBudgetFailure(input, cause)) throw cause;
    const parsed = readValidatedSession(input);
    assertLegacyStateBudget(parsed, input as Record<string, unknown>, cause);
    return {
      mode: "legacy-read-only-recovery",
      session: parsed,
      exportDocument: structuredClone(input),
      reason: "migration-budget-exceeded",
    };
  }
}

function isRecoverableBudgetFailure(input: unknown, cause: unknown): boolean {
  const version = isSessionDocument(input) ? input.schemaVersion : undefined;
  if (!(cause instanceof Error) || cause.message !== "state-budget-exceeded")
    return false;
  return (
    typeof version === "number" &&
    !(version >= CURRENT_ADVENTURE_SCHEMA_VERSION)
  );
}

function assertLegacyStateBudget(
  parsed: AdventureSession,
  original: Record<string, unknown>,
  cause: unknown,
): void {
  const legacyStateLength = JSON.stringify({
    visibleState: parsed.visibleState,
    hiddenState: parsed.hiddenState,
    provisionalFacts: parsed.provisionalFacts,
    scenarioState: original.scenarioState,
    worldEntry: parsed.worldEntry,
    worldTime: parsed.worldTime,
  }).length;
  if (legacyStateLength > MAX_DURABLE_STATE_CHARS) throw cause;
}
