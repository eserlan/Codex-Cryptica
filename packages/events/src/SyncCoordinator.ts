import type { AppEventBus } from "./AppEventBus";
import type { AppEvent } from "./types";

export class SyncCoordinator {
  private channel: BroadcastChannel | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private bus: AppEventBus,
    private channelName = "codex-system-events",
  ) {
    if (
      typeof window !== "undefined" &&
      typeof BroadcastChannel !== "undefined"
    ) {
      this.channel = new BroadcastChannel(this.channelName);
      this.channel.onmessage = (msg) => this.handleRemoteEvent(msg.data);

      this.unsubscribe = this.bus.subscribe(
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
    if (!this.channel) return;
    try {
      this.channel.postMessage(JSON.stringify(event));
    } catch {
      // Ignore events that are not JSON-serializable
    }
  }

  private handleRemoteEvent(data: unknown): void {
    if (typeof data !== "string") return;
    let event: AppEvent;
    try {
      event = JSON.parse(data) as AppEvent;
    } catch {
      return;
    }
    // Loop prevention: mark as remote so the local subscriber won't re-broadcast
    this.bus.emit({ ...event, metadata: { ...event.metadata, remote: true } });
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}
