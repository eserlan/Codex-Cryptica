import type { Entity, Map } from "schema";
import { redactGmOnlyNote } from "map-engine";
import type { EncounterSession, Token, VTTMessage } from "../../../types/vtt";
import type { SerializedGraph } from "../types";
import type {
  GuestPresenceStatus,
  GuestSession,
} from "../../stores/guest.svelte";
import { systemClock } from "$lib/utils/runtime-deps";

type GuestRoster = Record<string, GuestSession>;

export function sanitizeEntityForGuestTransport(entity: Entity): Entity {
  const {
    _fsHandle,
    lore: _lore,
    ...safeEntity
  } = entity as Entity & {
    _fsHandle?: unknown;
    lore?: string;
  };
  return safeEntity as Entity;
}

/**
 * Removes GM-only note bodies from a VTT message before it goes to guests.
 * See `redactGmOnlyNote` for why notes are treated differently from other
 * hidden tokens. `getToken` looks up the host's copy, because a state update
 * carries only a delta and cannot say on its own what it is updating.
 */
export function sanitizeVttMessageForGuestTransport<T extends { type: string }>(
  message: T,
  getToken: (tokenId: string) => Token | undefined,
): T {
  const vttMessage = message as unknown as VTTMessage;

  if (vttMessage.type === "TOKEN_ADDED") {
    const token = redactGmOnlyNote(vttMessage.token);
    return token === vttMessage.token
      ? message
      : ({ ...message, token } as unknown as T);
  }

  if (vttMessage.type === "TOKEN_STATE_UPDATE") {
    if (vttMessage.delta.noteBody === undefined) return message;
    const current = getToken(vttMessage.tokenId);
    // An update that reveals the note carries its body deliberately.
    const visibleTo = vttMessage.delta.visibleTo ?? current?.visibleTo;
    if (current?.kind !== "note" || visibleTo !== "gm-only") return message;
    return {
      ...message,
      delta: { ...vttMessage.delta, noteBody: "" },
    } as unknown as T;
  }

  return message;
}

/** The whole-session equivalent of `sanitizeVttMessageForGuestTransport`. */
export function sanitizeSessionForGuestTransport(
  session: EncounterSession,
): EncounterSession {
  let changed = false;
  const tokens: Record<string, Token> = {};
  for (const [id, token] of Object.entries(session.tokens ?? {})) {
    const safe = redactGmOnlyNote(token);
    if (safe !== token) changed = true;
    tokens[id] = safe;
  }
  return changed ? { ...session, tokens } : session;
}

export function normalizeGuestName(name: unknown, fallback: string) {
  if (typeof name !== "string") return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 32);
}

export function deriveGuestPresenceStatus(
  payloadStatus: unknown,
  currentEntityId: string | null,
): GuestPresenceStatus {
  if (payloadStatus === "viewing") return "viewing";
  return currentEntityId ? "viewing" : "connected";
}

export function upsertGuestRoster(
  current: GuestRoster,
  peerId: string,
  patch: Partial<{
    displayName: string;
    status: GuestPresenceStatus;
    currentEntityId: string | null;
    currentEntityTitle: string | null;
  }>,
  now = systemClock.now(),
) {
  const existing = current[peerId];
  const base = existing ?? {
    peerId,
    displayName: peerId,
    joinedAt: now,
    lastSeenAt: now,
    status: "connected" as const,
    currentEntityId: null,
    currentEntityTitle: null,
  };

  return {
    ...current,
    [peerId]: {
      ...base,
      ...patch,
      peerId,
      lastSeenAt: now,
    },
  };
}

export function removeGuestFromRoster(current: GuestRoster, peerId: string) {
  if (!current[peerId]) return current;
  const next = { ...current };
  delete next[peerId];
  return next;
}

export function buildSharedGraphPayload(
  rawEntities: Record<string, Entity>,
  defaultVisibility: SerializedGraph["defaultVisibility"],
  themeId: string,
): SerializedGraph {
  const entities: Record<string, Entity> = {};
  const assets: Record<string, string> = {};

  for (const [id, localEntity] of Object.entries(rawEntities)) {
    const safeEntity = sanitizeEntityForGuestTransport(localEntity);
    entities[id] = safeEntity;

    if (safeEntity.image && !safeEntity.image.startsWith("http")) {
      assets[safeEntity.image] = safeEntity.image;
    }
  }

  return {
    version: 1,
    entities,
    assets,
    defaultVisibility,
    sharedMode: true,
    themeId,
  };
}

export async function prepareMapPayload(
  map: Map,
  mapStore: any,
  vault: any,
): Promise<{
  map: Map;
  image?: { mime: string; data: ArrayBuffer };
  fog?: { mime: string; data: ArrayBuffer };
}> {
  const payload: {
    map: Map;
    image?: { mime: string; data: ArrayBuffer };
    fog?: { mime: string; data: ArrayBuffer };
  } = {
    map: snapshotForTransport(map),
  };

  if (map.fogOfWar) {
    try {
      const maskCanvas = await mapStore.loadMask(
        Math.max(map.dimensions.width, 1),
        Math.max(map.dimensions.height, 1),
      );
      const blob = await new Promise<Blob>((resolve, reject) => {
        maskCanvas.toBlob(
          (b: any) =>
            b
              ? resolve(b)
              : reject(new Error("Failed to create fog blob from canvas")),
          "image/png",
        );
      });
      payload.fog = {
        mime: blob.type || "image/png",
        data: await blob.arrayBuffer(),
      };
    } catch (err) {
      console.warn("[P2P Helpers] Failed to prepare fog payload", err);
    }
  }

  if (!map.assetPath) {
    return payload;
  }

  try {
    const url = await vault.resolveImageUrl(map.assetPath);
    if (!url) return payload;

    const response = await fetch(url);
    if (!response.ok) return payload;

    const blob = await response.blob();
    payload.image = {
      mime: blob.type || "image/webp",
      data: await blob.arrayBuffer(),
    };
  } catch (err) {
    console.warn("[P2P Helpers] Failed to prepare map image payload", err);
  }

  return payload;
}

export function snapshotForTransport<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch {
    return { ...(value as Record<string, unknown>) } as T;
  }
}

export async function prepareFogPayload(
  map: Map,
  mapStore: any,
): Promise<{
  mapId: string;
  fog?: { mime: string; data: ArrayBuffer };
}> {
  const payload: {
    mapId: string;
    fog?: { mime: string; data: ArrayBuffer };
  } = {
    mapId: map.id,
  };

  if (!map.fogOfWar) {
    return payload;
  }

  try {
    const maskCanvas = await mapStore.loadMask(
      Math.max(map.dimensions.width, 1),
      Math.max(map.dimensions.height, 1),
    );
    const blob = await new Promise<Blob>((resolve, reject) => {
      maskCanvas.toBlob(
        (b: any) =>
          b
            ? resolve(b)
            : reject(new Error("Failed to create fog blob from canvas")),
        "image/png",
      );
    });
    payload.fog = {
      mime: blob.type || "image/png",
      data: await blob.arrayBuffer(),
    };
  } catch (err) {
    console.warn("[P2P Helpers] Failed to prepare fog payload", err);
  }

  return payload;
}

export function buildGuestPresencePayload(options: {
  selectedEntityId: string | null;
  zenModeEntityId: string | null;
  entities: Record<string, Pick<Entity, "title">>;
}) {
  const currentEntityId =
    options.selectedEntityId ?? options.zenModeEntityId ?? null;

  return {
    status: currentEntityId ? ("viewing" as const) : ("connected" as const),
    currentEntityId,
    currentEntityTitle: currentEntityId
      ? (options.entities[currentEntityId]?.title ?? currentEntityId)
      : null,
  };
}
