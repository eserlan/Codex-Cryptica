import type { Entity } from "schema";

const STORAGE_KEY_PREFIX = "codex.zen-popout.";

export interface ZenPopoutPayload {
  entity: Entity;
  isGuest: boolean;
}

/**
 * Opens an entity in a standalone zen popout tab.
 *
 * For guests (P2P data, no local vault), the entity is written to
 * localStorage before the tab opens. We intentionally omit `noopener`
 * for guests: in private/incognito mode, `noopener` causes the browser
 * to give the new tab an isolated storage partition, making the
 * localStorage write invisible to it.
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
    const payload: ZenPopoutPayload = {
      entity: JSON.parse(JSON.stringify(entity)),
      isGuest: true,
    };
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${entity.id}`,
      JSON.stringify(payload),
    );
    // No noopener — needed to share the same storage partition in private mode
    window.open(url, "_blank");
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function consumeZenPopoutPayload(
  entityId: string,
): ZenPopoutPayload | null {
  const key = `${STORAGE_KEY_PREFIX}${entityId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  localStorage.removeItem(key);
  try {
    return JSON.parse(raw) as ZenPopoutPayload;
  } catch {
    return null;
  }
}
