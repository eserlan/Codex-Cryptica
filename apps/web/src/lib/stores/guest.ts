import { writable } from "svelte/store";

export interface GuestInfo {
  username: string;
  joinedAt: Date;
}

export type GuestPresenceStatus = "connected" | "idle" | "viewing";

export interface GuestSession {
  peerId: string;
  displayName: string;
  joinedAt: number;
  lastSeenAt: number;
  status: GuestPresenceStatus;
  currentEntityId: string | null;
  currentEntityTitle: string | null;
}

export const guestInfo = writable<GuestInfo | null>(null);
export const guestRoster = writable<Record<string, GuestSession>>({});
