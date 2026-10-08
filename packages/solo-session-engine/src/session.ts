import type { IdSource, ClockSource, SoloSession, SoloSetup } from "./types";

const MAX_SCENE = 80;
const MAX_ROLL = 64;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0;
const isNullableString = (v: unknown): v is string | null =>
  v === null || typeof v === "string";
const isTimestamp = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > 0;
const isSceneName = (v: unknown): v is string =>
  typeof v === "string" && v.length <= MAX_SCENE && v === v.trim();
const isRollOrNull = (v: unknown): v is string | null =>
  v === null || (typeof v === "string" && v.length <= MAX_ROLL);

/**
 * Checks a stored value. Anything malformed, or stored for another vault,
 * reads as no session. Never throws.
 */
export function parseSoloSession(
  raw: unknown,
  vaultId: string,
): SoloSession | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== 1 || raw.vaultId !== vaultId) return null;
  if (!isNonEmptyString(raw.id) || !isTimestamp(raw.startedAt)) return null;
  if (
    !isNullableString(raw.mapId) ||
    !isNullableString(raw.journalId) ||
    !isNullableString(raw.sceneSectionId)
  ) {
    return null;
  }
  if (!isSceneName(raw.sceneName) || !isRollOrNull(raw.lastRoll)) return null;

  return {
    version: 1,
    id: raw.id,
    vaultId,
    startedAt: raw.startedAt,
    mapId: raw.mapId,
    journalId: raw.journalId,
    sceneName: raw.sceneName,
    sceneSectionId: raw.sceneSectionId,
    lastRoll: raw.lastRoll,
  };
}

export function createSoloSession(
  vaultId: string,
  setup: SoloSetup,
  journalId: string | null,
  deps: { ids: IdSource; clock: ClockSource },
): SoloSession {
  return {
    version: 1,
    id: deps.ids.uuid(),
    vaultId,
    startedAt: deps.clock.now(),
    mapId: setup.mapId,
    journalId,
    sceneName: "",
    sceneSectionId: null,
    lastRoll: null,
  };
}

export function withScene(
  session: SoloSession,
  name: string,
  sectionId: string | null,
): SoloSession {
  return { ...session, sceneName: name, sceneSectionId: sectionId };
}

export function withLastRoll(
  session: SoloSession,
  expression: string,
): SoloSession {
  return { ...session, lastRoll: expression };
}
