import { BaseHandler } from "./base-handler";
import type { GuestHandlerContext } from "./guest-handler-context";
import type { P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";
import { voiceChat, type VoiceChatService } from "../voice/voice-chat.svelte";

/** Guest-side handler for the host's voice roster broadcasts. */
export class GuestVoiceHandler extends BaseHandler<GuestHandlerContext> {
  constructor(private readonly voice: VoiceChatService = voiceChat) {
    super();
  }

  canHandle(message: P2PMessage): boolean {
    return message.type === "VOICE_ROSTER";
  }

  async handle(
    message: P2PMessage,
    _connection: P2PConnection,
    _context: GuestHandlerContext,
  ): Promise<void> {
    if (message.type !== "VOICE_ROSTER") return;
    this.voice.applyRoster(message.payload);
  }
}
