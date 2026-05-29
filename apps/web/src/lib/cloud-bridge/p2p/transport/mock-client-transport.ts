import type {
  ClientTransportEventType,
  P2PClientTransport,
} from "./client-transport";

/**
 * Test double for {@link P2PClientTransport}. Exposes simulation helpers
 * so handlers, the dispatcher, and the guest service can be exercised
 * without booting a real PeerJS peer.
 */
export class MockClientTransport implements P2PClientTransport {
  id: string | null = "mock-guest-peer-id";
  private _connected = false;
  private listeners: Record<string, ((payload?: any) => void)[]> = {};
  public sent: any[] = [];

  get connected(): boolean {
    return this._connected;
  }

  async connect(_hostId: string): Promise<void> {
    this._connected = true;
    this.emit("open");
  }

  send(message: any): void {
    if (!this._connected) return;
    this.sent.push(message);
  }

  disconnect(): void {
    this._connected = false;
    this.emit("close");
  }

  on(event: ClientTransportEventType, callback: (payload?: any) => void): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(
    event: ClientTransportEventType,
    callback: (payload?: any) => void,
  ): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(
      (cb) => cb !== callback,
    );
  }

  /** Test helper: simulate inbound data. */
  simulateData(data: any) {
    this.emit("data", data);
  }

  /** Test helper: simulate transport error. */
  simulateError(err: unknown) {
    this.emit("error", err);
  }

  /** Test helper: simulate remote-initiated close. */
  simulateClose() {
    this._connected = false;
    this.emit("close");
  }

  private emit(event: ClientTransportEventType, payload?: any) {
    this.listeners[event]?.forEach((cb) => cb(payload));
  }
}
