import type { AppEventBus } from "./AppEventBus";
import type { AppEvent } from "./types";

export class SyncCoordinator {
  private channel: BroadcastChannel | null = null;
  private isProcessingRemote = false;

  constructor(
    private bus: AppEventBus,
    private channelName = "codex-system-events",
  ) {
    if (
      typeof window !== "undefined" &&
      typeof BroadcastChannel !== "undefined"
    ) {
      this.channel = new BroadcastChannel(this.channelName);
      this.channel.onmessage = (event) => this.handleRemoteEvent(event.data);

      // Subscribe to local events to broadcast them
      this.bus.subscribe(
        "*",
        (appEvent) => {
          if (appEvent.metadata.sync && !appEvent.metadata.remote) {
            this.broadcast(appEvent);
          }
        },
        "sync-coordinator",
      );
    }
  }

  private broadcast(event: AppEvent): void {
    if (this.channel) {
      this.channel.postMessage(event);
    }
  }

  private handleRemoteEvent(event: AppEvent): void {
    // Loop prevention: events arriving here are by definition remote
    // We mark them as remote so they don't get re-broadcasted by the local subscriber
    const remoteEvent: AppEvent = {
      ...event,
      metadata: {
        ...event.metadata,
        remote: true,
      },
    };

    this.bus.emit(remoteEvent);
  }

  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}
