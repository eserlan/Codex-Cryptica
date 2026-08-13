import { BaseHandler } from "./base-handler";
import type { GuestHandlerContext } from "./guest-handler-context";
import type { P2PMessage } from "../p2p-protocol";
import type { P2PConnection } from "../transport/transport-interface";
import { soundBiteService } from "@codex/audio-engine";

export class GuestSoundBiteHandler extends BaseHandler<GuestHandlerContext> {
  canHandle(message: P2PMessage): boolean {
    return message.type === "SOUND_BITE_PLAY";
  }

  async handle(
    message: P2PMessage,
    _connection: P2PConnection,
    context: GuestHandlerContext,
  ): Promise<void> {
    if (message.type !== "SOUND_BITE_PLAY") return;

    const { entityId } = message;
    const entity = context.vault.entities[entityId];
    if (!entity?.soundBite) return;

    // Load the entity's sound bite into the service and flag auto-play,
    // then open the modal — the component will start playback on mount.
    soundBiteService.loadFromEntity(entity);
    soundBiteService.pendingAutoPlay = true;
    context.modalUIStore.openSoundBite(entityId);
  }
}
