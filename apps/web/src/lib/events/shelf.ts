import type { AppEventDefinition } from "@codex/events";

export const SHELF_EVENTS = {
  CHANGED: "SHELF:CHANGED",
} as const;

export type ShelfEventType = (typeof SHELF_EVENTS)[keyof typeof SHELF_EVENTS];

/**
 * Deliberately payload-free.
 *
 * `CrossTabBroadcaster` serialises events with `JSON.stringify` and silently
 * drops whatever fails, and shelf entries hold image and audio blobs — so entry
 * contents could never survive the channel. Tabs are told only that the shelf
 * moved and re-read it from IndexedDB, which is the right shape regardless:
 * storage is the single source of truth and nothing needs duplicating
 * (research R2, FR-023a).
 */
declare module "@codex/events" {
  interface AppEventRegistry {
    "SHELF:CHANGED": AppEventDefinition<"shelf", Record<string, never>>;
  }
}
