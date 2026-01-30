import type { IStorageAdapter, SerializedGraph } from "../types";
import { vault } from "../../stores/vault.svelte";
import Peer from "peerjs";

export class P2PClientAdapter implements IStorageAdapter {
    private hostId: string;
    private peer: any;
    private conn: any;
    private graphPromise: Promise<SerializedGraph>;
    private graphResolver!: (g: SerializedGraph) => void;

    // Request tracking
    private pendingRequests = new Map<string, { resolve: (b: Blob) => void, reject: (e: any) => void }>();

    constructor(hostId: string) {
        this.hostId = hostId;
        this.graphPromise = new Promise((resolve) => {
            this.graphResolver = resolve;
        });
    }

    isReadOnly() { return true; }

    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            // @ts-expect-error - PeerJS constructor types
            this.peer = new Peer(undefined, { debug: 1 });

            this.peer.on('open', () => {
                console.log('[P2P Client] Connected to signaling server.');
                this.connectToHost(resolve, reject);
            });

            this.peer.on('error', (err: any) => {
                console.error('[P2P Client] Peer error:', err);
                reject(err);
            });
        });
    }

    private connectToHost(resolve: () => void, _reject: (e: any) => void) {
        console.log('[P2P Client] Connecting to host:', this.hostId);
        this.conn = this.peer.connect(this.hostId, { reliable: true });

        this.conn.on('open', () => {
            console.log('[P2P Client] Connection established!');
            resolve();
        });

        this.conn.on('data', (data: any) => {
            this.handleMessage(data);
        });

        this.conn.on('close', () => {
            console.warn('[P2P Client] Disconnected from host.');
        });

        // Timeout if connection doesn't happen
        setTimeout(() => {
            if (!this.conn.open) {
                console.warn('[P2P Client] Connection timeout.');
                // reject(new Error("Connection timed out"));
            }
        }, 10000);
    }

    private handleMessage(data: any) {
        if (data.type === 'GRAPH_SYNC') {
            console.log('[P2P Client] Received Graph Sync');
            this.graphResolver(data.payload);
        } else if (data.type === 'ENTITY_UPDATE') {
            console.log('[P2P Client] Received Realtime Update');
            vault.ingestRemoteUpdate(data.payload);
        } else if (data.type === 'FILE_RESPONSE') {
            const req = this.pendingRequests.get(data.requestId);
            if (req) {
                if (data.found && data.data) {
                    req.resolve(new Blob([data.data], { type: data.mime || 'application/octet-stream' }));
                } else {
                    req.reject(new Error("File not found on host"));
                }
                this.pendingRequests.delete(data.requestId);
            }
        }
    }

    async loadGraph(): Promise<SerializedGraph | null> {
        console.log('[P2P Client] Waiting for graph...');
        return this.graphPromise;
    }

    async saveGraph(_graph: SerializedGraph): Promise<void> {
        throw new Error("P2P Client is Read-Only");
    }

    async resolvePath(path: string): Promise<string> {
        // Here we intercept the image request and fetch it via P2P
        // We return a Blob URL that the UI can display
        try {
            const blob = await this.fetchFile(path);
            return URL.createObjectURL(blob);
        } catch (e) {
            console.warn(`[P2P Client] Failed to resolve path ${path}`, e);
            return ""; // Broken image fallback
        }
    }

    private async fetchFile(path: string): Promise<Blob> {
        const requestId = crypto.randomUUID();
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestId, { resolve, reject });

            // Allow time for connection if not ready
            if (!this.conn || !this.conn.open) {
                reject(new Error("Not connected to host"));
                return;
            }

            this.conn.send({
                type: 'GET_FILE',
                path: path,
                requestId
            });

            // Timeout
            setTimeout(() => {
                if (this.pendingRequests.has(requestId)) {
                    this.pendingRequests.delete(requestId);
                    reject(new Error("Request timeout"));
                }
            }, 15000);
        });
    }
}
