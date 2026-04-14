import type { Entity } from "schema";

export const ZEN_POPOUT_REQUEST = "ZEN_ENTITY_REQUEST";
export const ZEN_POPOUT_DATA = "ZEN_ENTITY_DATA";

export interface ZenEntityRequest {
  type: typeof ZEN_POPOUT_REQUEST;
  entityId: string;
}

export interface ZenEntityData {
  type: typeof ZEN_POPOUT_DATA;
  entity: Entity;
  isGuest: boolean;
}

/**
 * Opens an entity in a standalone zen popout tab.
 *
 * For guests, data lives in memory (P2P), not local storage. We open the tab
 * without `noopener` so the new tab can postMessage us a request, then we
 * respond with the entity payload.
 */
export function openEntityPopout(
  vaultId: string,
  entity: Entity,
  base: string,
  isGuest: boolean,
) {
  const url = `${base}/vault/${vaultId}/entity/${entity.id}`;

  // noopener would null out window.opener in the child — skip it for guests
  const features = isGuest ? "" : "noopener,noreferrer";
  const newTab = window.open(url, "_blank", features);

  if (isGuest && newTab) {
    const origin = window.location.origin;
    const handleRequest = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      if (event.source !== newTab) return;
      const msg = event.data as ZenEntityRequest;
      if (msg?.type === ZEN_POPOUT_REQUEST && msg.entityId === entity.id) {
        // Strip Svelte reactive proxy — postMessage needs a plain cloneable object
        const plain = JSON.parse(JSON.stringify(entity)) as Entity;
        newTab.postMessage(
          {
            type: ZEN_POPOUT_DATA,
            entity: plain,
            isGuest,
          } satisfies ZenEntityData,
          origin,
        );
        window.removeEventListener("message", handleRequest);
      }
    };
    window.addEventListener("message", handleRequest);
  }
}
