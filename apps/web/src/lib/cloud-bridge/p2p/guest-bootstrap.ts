import { vault } from "../../stores/vault.svelte";
import { sessionModeStore } from "../../stores/ui/session-mode.svelte";
import { notificationStore } from "../../stores/ui/notification.svelte";
import { mapSession } from "../../stores/map-session.svelte";
import { mapStore } from "../../stores/map.svelte";
import { themeStore } from "../../stores/theme.svelte";
import { modalUIStore } from "../../stores/ui/modal-ui.svelte";
import { guestChatStore } from "../../stores/guest-chat.svelte";
import { registerGuestStores } from "./guest-stores-registry";

registerGuestStores({
  vault,
  sessionModeStore,
  notificationStore,
  modalUIStore,
  mapSession,
  mapStore,
  themeStore,
  guestChatStore,
});
