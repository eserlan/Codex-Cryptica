import Peer from "peerjs";

export type PeerFactory = (
  id?: string,
  options?: Record<string, unknown>,
) => any;

export function createPeer(id?: string, options?: Record<string, unknown>) {
  const PeerClass =
    (typeof window !== "undefined" && (window as any).Peer) || Peer;
  return new PeerClass(id, options);
}
