/**
 * Standardized events emitted by the transport layer to the host service.
 */
export const TransportEvents = {
  GUEST_CONNECTED: "connection",
  DATA_RECEIVED: "data",
  ERROR: "error",
  CLOSED: "close",
  DISCONNECTED: "disconnected",
} as const;

export type TransportEvent =
  (typeof TransportEvents)[keyof typeof TransportEvents];

/**
 * Standardized error payloads for the transport layer.
 */
export interface TransportErrorPayload {
  type:
    | "PEER_NOT_FOUND"
    | "DATA_CORRUPT"
    | "HOST_DISCONNECTED"
    | "CONNECTION_FAILED"
    | "UNKNOWN";
  message: string;
  fatal: boolean;
}
