import type {
  P2PTransport,
  TransportEventType,
  P2PConnection,
} from "./transport-interface";

export class MockTransport implements P2PTransport {
  id: string | null = "mock-peer-id";
  connections: P2PConnection[] = [];
  private listeners: Record<string, ((payload: any) => void)[]> = {};

  async start(peerId?: string): Promise<string> {
    this.id = peerId || "mock-peer-id";
    return this.id;
  }

  stop(): void {
    this.connections.forEach((c) => c.close());
    this.connections = [];
  }

  send(peerId: string, data: any): void {
    const conn = this.connections.find((c) => c.peer === peerId);
    if (conn) {
      console.log(`[MockTransport] Sent to ${peerId}:`, data);
    }
  }

  broadcast(data: any, excludePeerId?: string): void {
    this.connections.forEach((c) => {
      if (c.peer !== excludePeerId) {
        c.send(data);
      }
    });
  }

  on(event: TransportEventType, callback: (payload: any) => void): void {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  /** Test helper to simulate guest connection */
  simulateConnection(peerId: string) {
    const conn: P2PConnection = {
      peer: peerId,
      send: (data) => console.log(`[MockConnection] ${peerId} received:`, data),
      close: () => {
        this.connections = this.connections.filter((c) => c.peer !== peerId);
        this.emit("close", peerId);
      },
    };
    this.connections.push(conn);
    this.emit("connection", conn);
    return conn;
  }

  /** Test helper to simulate data receipt */
  simulateData(peerId: string, data: any) {
    const conn = this.connections.find((c) => c.peer === peerId);
    if (conn) {
      this.emit("data", { conn, data });
    }
  }

  private emit(event: string, payload: any) {
    (this.listeners[event] || []).forEach((cb) => cb(payload));
  }
}
