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
 * localStorage under a per-entity key before the tab opens. The new tab
 * reads and immediately removes the entry so it doesn't linger.
 */
export function openEntityPopout(
  vaultId: string,
  entity: Entity,
  base: string,
  isGuest: boolean,
) {
  if (isGuest) {
    const payload: ZenPopoutPayload = {
      // Strip Svelte reactive proxy before serialising
      entity: JSON.parse(JSON.stringify(entity)),
      isGuest: true,
    };
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${entity.id}`,
      JSON.stringify(payload),
    );
  }

  window.open(
    `${base}/vault/${vaultId}/entity/${entity.id}`,
    "_blank",
    "noopener,noreferrer",
  );
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
