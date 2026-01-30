import { writable } from "svelte/store";

export interface GuestInfo {
    username: string;
    joinedAt: Date;
}

export const guestInfo = writable<GuestInfo | null>(null);
