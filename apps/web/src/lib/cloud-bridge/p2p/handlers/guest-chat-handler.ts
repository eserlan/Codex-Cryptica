import { BaseHandler } from "./base-handler";
import type { GuestHandlerContext } from "./guest-handler-context";
import type { P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";
import type { ChatMessagePayload } from "../../../../types/vtt";

const HANDLED = new Set(["CHAT_MESSAGE", "CHAT_CLEAR"]);

export class GuestChatHandler extends BaseHandler<GuestHandlerContext> {
  canHandle(message: P2PMessage): boolean {
    return HANDLED.has(message.type);
  }

  async handle(
    message: P2PMessage,
    _connection: P2PConnection,
    context: GuestHandlerContext,
  ): Promise<void> {
    if (message.type === "CHAT_MESSAGE") {
      context.mapSession.handleRemoteChatMessage(
        message as unknown as ChatMessagePayload,
      );
      return;
    }
    if (message.type === "CHAT_CLEAR") {
      context.mapSession.handleRemoteChatClear();
    }
  }
}
