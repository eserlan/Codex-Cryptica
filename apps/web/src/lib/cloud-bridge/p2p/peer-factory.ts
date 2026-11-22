export type PeerFactory = (
  id?: string,
  options?: Record<string, unknown>,
) => any;

let loadedPeerClass: (new (id?: string, options?: any) => any) | null = null;

/**
 * Loads PeerJS on demand so it stays off the `/` entry graph. Callers that use
 * the default `createPeer` factory await this once before creating a peer.
 */
export async function loadPeerJs(): Promise<void> {
  if (loadedPeerClass) return;
  const mod = await import("peerjs");
  loadedPeerClass = mod.default as unknown as new (
    id?: string,
    options?: any,
  ) => any;
}

export function createPeer(id?: string, options?: Record<string, unknown>) {
  const PeerClass =
    (typeof window !== "undefined" && (window as any).Peer) || loadedPeerClass;
  if (!PeerClass) {
    throw new Error("PeerJS is not loaded yet; await loadPeerJs() first.");
  }
  return new PeerClass(id, options);
}
