import type { Entity } from "schema";

const STORAGE_KEY_PREFIX = "codex.zen-popout.";
const MESSAGE_SOURCE = "codex.zen-popout";
const REQUEST_TYPE = "REQUEST_PAYLOAD";
const RESPONSE_TYPE = "PAYLOAD";
const LISTENER_TTL_MS = 30_000;

export interface ZenPopoutPayload {
  entity: Entity;
  isGuest: boolean;
}

function buildGuestEntitySnapshot(entity: Entity): Entity {
  const snapshot = JSON.parse(JSON.stringify(entity)) as Entity & {
    lore?: string;
  };
  delete snapshot.lore;
  return snapshot;
}

interface ZenPopoutRequestMessage {
  source: typeof MESSAGE_SOURCE;
  type: typeof REQUEST_TYPE;
  entityId: string;
}

interface ZenPopoutResponseMessage {
  source: typeof MESSAGE_SOURCE;
  type: typeof RESPONSE_TYPE;
  entityId: string;
  payload: ZenPopoutPayload;
}

function isResponseMessage(
  value: unknown,
  entityId: string,
): value is ZenPopoutResponseMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ZenPopoutResponseMessage>;
  return (
    message.source === MESSAGE_SOURCE &&
    message.type === RESPONSE_TYPE &&
    message.entityId === entityId &&
    !!message.payload
  );
}

function persistPayload(entityId: string, payload: ZenPopoutPayload) {
  sessionStorage.setItem(
    `${STORAGE_KEY_PREFIX}${entityId}`,
    JSON.stringify(payload),
  );
}

export function persistZenPopoutPayload(entity: Entity, isGuest: boolean) {
  const payload: ZenPopoutPayload = {
    entity: isGuest
      ? buildGuestEntitySnapshot(entity)
      : (JSON.parse(JSON.stringify(entity)) as Entity),
    isGuest,
  };
  persistPayload(entity.id, payload);
  return payload;
}

/**
 * Opens an entity in a standalone zen popout tab.
 *
 * For guests (P2P data, no local vault), the entity is written to
 * sessionStorage before the tab opens. We intentionally omit `noopener`
 * for guests so the child can request a payload from `window.opener`
 * if private/incognito mode prevents storage inheritance.
 *
 * For hosts, `noopener,noreferrer` is safe since no cross-tab storage
 * handshake is needed.
 */
export function openEntityPopout(
  vaultId: string,
  entity: Entity,
  base: string,
  isGuest: boolean,
) {
  const url = `${base}/vault/${vaultId}/entity/${entity.id}`;

  if (isGuest) {
    const payload = persistZenPopoutPayload(entity, true);
    const childWindow = window.open(url, "_blank");
    if (!childWindow) return;

    const origin = window.location.origin;
    const cleanup = () => {
      window.removeEventListener("message", handleMessage);
      window.clearTimeout(timeoutId);
    };
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== childWindow) return;
      const data = event.data as Partial<ZenPopoutRequestMessage> | null;
      if (
        data?.source !== MESSAGE_SOURCE ||
        data.type !== REQUEST_TYPE ||
        data.entityId !== entity.id
      ) {
        return;
      }
      childWindow.postMessage(
        {
          source: MESSAGE_SOURCE,
          type: RESPONSE_TYPE,
          entityId: entity.id,
          payload,
        } satisfies ZenPopoutResponseMessage,
        origin,
      );
      cleanup();
    };
    const timeoutId = window.setTimeout(cleanup, LISTENER_TTL_MS);
    window.addEventListener("message", handleMessage);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function consumeZenPopoutPayload(
  entityId: string,
): ZenPopoutPayload | null {
  const key = `${STORAGE_KEY_PREFIX}${entityId}`;
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  sessionStorage.removeItem(key);
  try {
    return JSON.parse(raw) as ZenPopoutPayload;
  } catch {
    return null;
  }
}

export function requestZenPopoutPayload(
  entityId: string,
  timeoutMs = 1500,
): Promise<ZenPopoutPayload | null> {
  if (typeof window === "undefined" || !window.opener) {
    return Promise.resolve(null);
  }

  const origin = window.location.origin;

  return new Promise((resolve) => {
    const cleanup = () => {
      window.removeEventListener("message", handleMessage);
      window.clearTimeout(timeoutId);
    };
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== window.opener) return;
      if (!isResponseMessage(event.data, entityId)) return;
      const sanitizedPayload = event.data.payload.isGuest
        ? persistZenPopoutPayload(event.data.payload.entity, true)
        : event.data.payload;
      cleanup();
      resolve(sanitizedPayload);
    };
    const timeoutId = window.setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);

    window.addEventListener("message", handleMessage);
    window.opener.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: REQUEST_TYPE,
        entityId,
      } satisfies ZenPopoutRequestMessage,
      origin,
    );
  });
}
