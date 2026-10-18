import type { GuestHandlerContext } from "./handlers/guest-handler-context";

/**
 * The app stores a guest session needs. They are registered from the app
 * layout (see `guest-bootstrap.ts`) instead of imported here, because the
 * stores themselves import the guest service and would otherwise form a
 * circular dependency.
 */
export type GuestStoreBundle = Pick<
  GuestHandlerContext,
  | "vault"
  | "sessionModeStore"
  | "notificationStore"
  | "modalUIStore"
  | "mapSession"
  | "mapStore"
  | "themeStore"
  | "guestChatStore"
>;

let bundle: GuestStoreBundle | null = null;

export function registerGuestStores(stores: GuestStoreBundle | null) {
  bundle = stores;
}

export function getGuestStores(): GuestStoreBundle {
  if (!bundle) {
    throw new Error("Guest stores are not registered");
  }
  return bundle;
}
