import { BaseHandler } from "./base-handler";
import type { GuestHandlerContext } from "./guest-handler-context";
import type { P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";

export class GuestCharChatResponseHandler extends BaseHandler<GuestHandlerContext> {
  canHandle(message: P2PMessage): boolean {
    return (
      message.type === "GUEST_CHAR_CHAT_CHUNK" ||
      message.type === "GUEST_CHAR_CHAT_DONE"
    );
  }

  async handle(
    message: P2PMessage,
    _connection: P2PConnection,
    _context: GuestHandlerContext,
  ): Promise<void> {
    // Lazy import avoids circular deps — guestChatStore imports p2pGuestService
    const { guestChatStore } =
      await import("../../../stores/guest-chat.svelte");

    if (message.type === "GUEST_CHAR_CHAT_CHUNK") {
      guestChatStore.handleChatChunk(message.requestId, message.partial);
    } else if (message.type === "GUEST_CHAR_CHAT_DONE") {
      guestChatStore.handleChatDone(message.requestId, message.error);
    }
  }
}
