import type { AppEventBus } from "./AppEventBus";
import type { AppEvent, RuntimeAppEvent } from "./types";

function isAppEventEnvelope(value: unknown): value is RuntimeAppEvent {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<RuntimeAppEvent>;
  return (
    typeof candidate.type === "string" &&
    typeof candidate.domain === "string" &&
    "payload" in candidate &&
    !!candidate.metadata &&
    typeof candidate.metadata === "object" &&
    typeof candidate.metadata.timestamp === "number"
  );
}

export class CrossTabBroadcaster {
  private channel: BroadcastChannel | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private bus: AppEventBus,
    private channelName = "codex-system-events",
  ) {
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(this.channelName);
      this.channel.onmessage = (msg) => this.handleRemoteEvent(msg.data);

      this.unsubscribe = this.bus.subscribe(
        "*",
        (appEvent: RuntimeAppEvent) => {
          if (appEvent.metadata.sync && !appEvent.metadata.remote) {
            this.broadcast(appEvent);
          }
        },
        "cross-tab-broadcaster",
      );
    }
  }

  private broadcast(event: RuntimeAppEvent): void {
    if (!this.channel) return;
    try {
      this.channel.postMessage(JSON.stringify(event));
    } catch {
      // Ignore events that are not JSON-serializable
    }
  }

  private handleRemoteEvent(data: unknown): void {
    if (typeof data !== "string") return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (!isAppEventEnvelope(parsed)) return;

    // Loop prevention: mark as remote so the local subscriber won't re-broadcast
    this.bus.emit({
      ...parsed,
      metadata: { ...parsed.metadata, remote: true },
    } as AppEvent);
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
