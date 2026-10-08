import type {
  IdSource,
  ClockSource,
  SoloScene,
  SoloSession,
  SoloSetup,
} from "./types";

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
const MAX_PARTY = 12;
const MAX_SCENES = 100;
const isPartyIds = (v: unknown): v is string[] =>
  Array.isArray(v) &&
  v.length <= MAX_PARTY &&
  v.every((id) => typeof id === "string" && id.length > 0) &&
  new Set(v).size === v.length;

function parseScene(item: unknown): SoloScene | null {
  if (!isRecord(item)) return null;
  if (!isNonEmptyString(item.name) || !isSceneName(item.name)) return null;
  if (!isNullableString(item.sectionId)) return null;
  return { name: item.name, sectionId: item.sectionId };
}

function parseScenes(
  raw: unknown,
  sceneName: string,
  sectionId: string | null,
): SoloScene[] | null {
  if (raw === undefined) {
    return sceneName ? [{ name: sceneName, sectionId }] : [];
  }
  if (!Array.isArray(raw) || raw.length > MAX_SCENES) return null;
  const scenes = raw.map(parseScene);
  return scenes.every((scene): scene is SoloScene => scene !== null)
    ? scenes
    : null;
}

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
  // A Phase 1 record has no party: that reads as an empty one.
  const partyIds = raw.partyIds === undefined ? [] : raw.partyIds;
  if (!isPartyIds(partyIds)) return null;
  // A Phase 1 record has no scene list: its current scene becomes the only one.
  const scenes = parseScenes(raw.scenes, raw.sceneName, raw.sceneSectionId);
  if (!scenes) return null;

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
    partyIds,
    scenes,
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
    partyIds: [],
    scenes: [],
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

/** Sets the party: duplicates removed, at most 12 members, order kept. */
export function withParty(
  session: SoloSession,
  ids: readonly string[],
): SoloSession {
  const unique = [...new Set(ids)].slice(0, MAX_PARTY);
  return { ...session, partyIds: unique };
}

/** Adds a scene to the end of the list and makes it current. */
export function withSceneAdded(
  session: SoloSession,
  name: string,
  sectionId: string | null,
): SoloSession {
  const scenes = [...session.scenes, { name, sectionId }].slice(-MAX_SCENES);
  return { ...session, sceneName: name, sceneSectionId: sectionId, scenes };
}

/** Renames the current (last) scene, and the session's current name with it. */
export function withCurrentSceneRenamed(
  session: SoloSession,
  name: string,
): SoloSession {
  if (session.scenes.length === 0) return { ...session, sceneName: name };
  const last = session.scenes[session.scenes.length - 1];
  const scenes = [...session.scenes.slice(0, -1), { ...last, name }];
  return { ...session, sceneName: name, scenes };
}

const VISIT_SUFFIX = /^(.*?) \((\d+)\)$/;

/**
 * The name for a new visit to a scene: "Arrival" becomes "Arrival (2)", and
 * a further visit "Arrival (3)". Null when the index is out of range.
 */
export function nextVisitName(
  scenes: readonly SoloScene[],
  index: number,
): string | null {
  const target = scenes[index];
  if (!target) return null;
  const base = baseName(target.name);
  let highest = 1;
  for (const scene of scenes) {
    if (baseName(scene.name) !== base) continue;
    highest = Math.max(highest, visitNumber(scene.name));
  }
  return `${base} (${highest + 1})`;
}

function baseName(name: string): string {
  const match = VISIT_SUFFIX.exec(name);
  return match ? match[1] : name;
}

function visitNumber(name: string): number {
  const match = VISIT_SUFFIX.exec(name);
  return match ? Number(match[2]) : 1;
}
