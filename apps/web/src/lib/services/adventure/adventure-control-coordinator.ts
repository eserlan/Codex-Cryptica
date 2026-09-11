import {
  adventureControlAuthority,
  type AdventureControlAuthority,
  type AdventureControlLease,
  type AdventureLeaseKey,
} from "./adventure-control-lease";

export type AdventureControlEvent =
  "renewed" | "released" | "takeover-available";

export class AdventureControlCoordinator {
  private timer: ReturnType<typeof setInterval> | null = null;
  private channel: BroadcastChannel | null = null;
  private lease: AdventureControlLease | null = null;
  private keyValue: AdventureLeaseKey | null = null;
  private listeners = new Set<(event: AdventureControlEvent) => void>();

  constructor(
    private readonly authority: AdventureControlAuthority = adventureControlAuthority,
    private readonly channelFactory: (
      name: string,
    ) => BroadcastChannel | null = (name) =>
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel(name),
  ) {}

  start(lease: AdventureControlLease): void {
    this.stopTimer();
    this.channel?.close();
    this.channel = null;
    this.lease = lease;
    this.keyValue = { vaultId: lease.vaultId, sessionId: lease.sessionId };
    this.channel = this.channelFactory(
      `adventure-control:${lease.vaultId}:${lease.sessionId}`,
    );
    this.channel?.addEventListener("message", () =>
      this.emit("takeover-available"),
    );
    this.timer = setInterval(() => void this.heartbeat(), 3_000);
    if (typeof window !== "undefined")
      window.addEventListener("pagehide", this.onPageHide);
  }

  private readonly onPageHide = () => {
    void this.stop();
  };

  private async heartbeat(): Promise<void> {
    if (!this.lease) return;
    const result = await this.authority.renew(this.lease);
    if (!result.ok) {
      await this.stop();
      this.emit("takeover-available");
      return;
    }
    this.lease = result.lease;
    this.channel?.postMessage({ type: "renewed" });
    this.emit("renewed");
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async stop(): Promise<void> {
    this.stopTimer();
    if (typeof window !== "undefined")
      window.removeEventListener("pagehide", this.onPageHide);
    if (this.lease) await this.authority.release(this.lease);
    this.channel?.postMessage({ type: "released" });
    this.channel?.close();
    this.channel = null;
    this.lease = null;
  }

  subscribe(listener: (event: AdventureControlEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: AdventureControlEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}

export const adventureControlCoordinator = new AdventureControlCoordinator();
