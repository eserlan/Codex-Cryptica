import type { Entity } from "schema";
import type { SerializedGraph } from "../types";
import type { GuestPresenceStatus, GuestSession } from "../../stores/guest";

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
  now = Date.now(),
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
