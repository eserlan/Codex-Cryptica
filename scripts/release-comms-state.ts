import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import type {
  EvaluatorResult,
  ReleaseCommsHistoryEntry,
  ReleaseCommsState,
  ReleaseFeature,
  WriterResult,
} from "./release-comms-types.ts";

const EMPTY_STATE: ReleaseCommsState = {
  version: 1,
  lastEvaluatedSha: null,
  history: [],
};
const MAX_HISTORY = 50;

export function getReleaseCommsStatePath(): string {
  return (
    process.env.RELEASE_COMMS_STATE_FILE ??
    resolve(homedir(), ".local/state/codex-release-comms/state.json")
  );
}

export async function loadReleaseCommsState(
  path = getReleaseCommsStatePath(),
): Promise<ReleaseCommsState> {
  try {
    const parsed = JSON.parse(
      await readFile(path, "utf8"),
    ) as ReleaseCommsState;
    if (parsed.version === 1 && Array.isArray(parsed.history)) return parsed;
  } catch {
    // First run has no state file; corrupt state should not block evaluation.
  }
  return structuredClone(EMPTY_STATE);
}

export async function saveReleaseCommsState(
  state: ReleaseCommsState,
  path = getReleaseCommsStatePath(),
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await rename(temporaryPath, path);
}

export function recordEvaluation(
  state: ReleaseCommsState,
  entry: ReleaseCommsHistoryEntry,
): ReleaseCommsState {
  return {
    version: 1,
    lastEvaluatedSha: entry.sha,
    history: [entry, ...state.history].slice(0, MAX_HISTORY),
  };
}

/** Durable per-run log path, mirroring `getPrFixLogPath` in pr-check-fix.ts. */
export function getReleaseCommsLogPath(
  promoteRunId: string,
  logDir = resolve(homedir(), ".local/state/codex-release-comms"),
): string {
  const safeId = promoteRunId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return resolve(logDir, `eval-${safeId}.log`);
}

const VALID_IMPORTANCE_VALUES = new Set(["low", "medium", "high"]);

function isReleaseFeature(value: unknown): value is ReleaseFeature {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.name === "string" &&
    typeof record.why_users_care === "string" &&
    (record.bluesky_worthy === undefined ||
      typeof record.bluesky_worthy === "boolean")
  );
}

export function isEvaluatorResult(value: unknown): value is EvaluatorResult {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.postworthy === "boolean" &&
    typeof record.reason === "string" &&
    (record.importance === undefined ||
      VALID_IMPORTANCE_VALUES.has(record.importance as string)) &&
    (record.features === undefined ||
      (Array.isArray(record.features) &&
        record.features.every(isReleaseFeature))) &&
    (record.recommended_channels === undefined ||
      (Array.isArray(record.recommended_channels) &&
        record.recommended_channels.every(
          (channel) => typeof channel === "string",
        )))
  );
}

export function isWriterResult(value: unknown): value is WriterResult {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.bluesky) &&
    record.bluesky.every((post) => typeof post === "string") &&
    (record.discord === undefined || typeof record.discord === "string") &&
    typeof record.reddit === "string" &&
    typeof record.github_discussion === "string"
  );
}
