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

export class GuestStore {
  guestInfo = $state<GuestInfo | null>(null);
  guestRoster = $state<Record<string, GuestSession>>({});

  constructor(
    initialInfo: GuestInfo | null = null,
    initialRoster: Record<string, GuestSession> = {},
  ) {
    this.guestInfo = initialInfo;
    this.guestRoster = initialRoster;
  }
}

export const guestStore = new GuestStore();
