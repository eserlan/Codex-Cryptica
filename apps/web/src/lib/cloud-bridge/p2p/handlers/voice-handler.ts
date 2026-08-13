import { BaseHandler } from "./base-handler";
import type { P2PHandlerContext } from "./base-handler";
import type { P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";
import { voiceChat, type VoiceChatService } from "../voice/voice-chat.svelte";

/** Host-side handler for voice coordination messages from guests. */
export class VoiceHandler extends BaseHandler<P2PHandlerContext> {
  constructor(private readonly voice: VoiceChatService = voiceChat) {
    super();
  }

  canHandle(message: P2PMessage): boolean {
    return (
      message.type === "VOICE_STATE" || message.type === "VOICE_SYNC_REQUEST"
    );
  }

  async handle(
    message: P2PMessage,
    connection: P2PConnection,
    _context: P2PHandlerContext,
  ): Promise<void> {
    if (message.type === "VOICE_STATE") {
      this.voice.setGuestMuted(connection.peer, !!message.payload?.muted);
      return;
    }
    if (message.type === "VOICE_SYNC_REQUEST") {
      this.send(connection, this.voice.buildRosterMessage());
    }
  }
}
