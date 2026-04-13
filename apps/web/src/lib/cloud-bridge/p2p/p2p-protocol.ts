import type {
  CompressedSessionSnapshotPayload,
  EncounterSession,
  MapPingPayload,
  SessionSnapshotPayload,
  VTTMessage,
} from "$types/vtt";

const SNAPSHOT_COMPRESS_THRESHOLD = 10_000; // bytes

export type P2PMessage =
  | { type: "GRAPH_SYNC"; payload: any }
  | {
      type: "MAP_SYNC";
      payload: {
        map: import("schema").Map;
        image?: { mime: string; data: ArrayBuffer };
        fog?: { mime: string; data: ArrayBuffer };
      };
    }
  | {
      type: "MAP_FOG_SYNC";
      payload: {
        mapId: string;
        fog?: { mime: string; data: ArrayBuffer };
      };
    }
  | MapPingPayload
  | { type: "GET_FILE"; path: string; requestId: string }
  | {
      type: "FILE_RESPONSE";
      requestId: string;
      found: boolean;
      mime?: string;
      data?: ArrayBuffer;
    }
  | { type: "GUEST_JOIN"; payload: { displayName: string } }
  | {
      type: "GUEST_JOIN_REJECTED";
      payload: { reason: "duplicate-display-name"; displayName: string };
    }
  | { type: "GUEST_LEAVE"; payload: { displayName: string } }
  | { type: "GUEST_STATUS"; payload: any }
  | { type: "ENTITY_UPDATE"; payload: any }
  | { type: "ENTITY_BATCH_UPDATE"; payload: Record<string, any> }
  | { type: "ENTITY_DELETE"; payload: string }
  | { type: "THEME_UPDATE"; payload: string }
  | VTTMessage;

export function isValidP2PMessage(
  message: unknown,
): message is { type: string } & Record<string, any> {
  return (
    message !== null &&
    typeof message === "object" &&
    "type" in message &&
    typeof (message as Record<string, unknown>).type === "string"
  );
}

export async function encodeSessionSnapshot(
  session: EncounterSession,
): Promise<SessionSnapshotPayload | CompressedSessionSnapshotPayload> {
  const json = JSON.stringify(session);
  if (
    json.length < SNAPSHOT_COMPRESS_THRESHOLD ||
    typeof CompressionStream === "undefined"
  ) {
    return { type: "SESSION_SNAPSHOT", session };
  }
  const source = new Response(json).body;
  if (!source) {
    return { type: "SESSION_SNAPSHOT", session };
  }
  const data = await new Response(
    source.pipeThrough(new CompressionStream("gzip")),
  ).arrayBuffer();
  const ratio = ((1 - data.byteLength / json.length) * 100).toFixed(1);
  console.log(
    `[P2P] SESSION_SNAPSHOT_GZIP: ${json.length} → ${data.byteLength} bytes (${ratio}% smaller)`,
  );
  return { type: "SESSION_SNAPSHOT_GZIP", data };
}

export async function decodeSessionSnapshot(
  message: SessionSnapshotPayload | CompressedSessionSnapshotPayload,
): Promise<EncounterSession> {
  if (message.type === "SESSION_SNAPSHOT") {
    return message.session;
  }
  if (message.type === "SESSION_SNAPSHOT_GZIP") {
    const source = new Response(message.data).body;
    if (!source) {
      throw new Error("Compressed snapshot body is unavailable");
    }
    const json = await new Response(
      source.pipeThrough(new DecompressionStream("gzip")),
    ).text();
    return JSON.parse(json);
  }
  throw new Error(`Unknown snapshot message type: ${(message as any).type}`);
}

export function isVTTMessage(message: any): message is VTTMessage {
  return (
    message &&
    typeof message === "object" &&
    typeof message.type === "string" &&
    [
      "SESSION_SNAPSHOT",
      "SESSION_SNAPSHOT_GZIP",
      "TOKEN_STATE_UPDATE",
      "SHOW_TOKEN_IMAGE",
      "TOKEN_ADDED",
      "TOKEN_REMOVED",
      "TURN_ADVANCE",
      "FOG_REVEAL",
      "SET_MODE",
      "MAP_PING",
      "PING",
      "TOKEN_ADD_REQUEST",
      "TOKEN_MOVE",
      "TOKEN_REMOVE",
      "TOKEN_SELECT",
      "SESSION_SAVE",
      "SESSION_ENDED",
      "CHAT_CLEAR",
      "CHAT_MESSAGE",
      "MEASUREMENT",
      "MAP_MEASUREMENT",
      "SET_GRID_SETTINGS",
    ].includes(message.type)
  );
}

export function isHostOnlyVTTMessage(message: VTTMessage): boolean {
  return [
    "SESSION_SNAPSHOT",
    "SESSION_SNAPSHOT_GZIP",
    "TOKEN_STATE_UPDATE",
    "SHOW_TOKEN_IMAGE",
    "TOKEN_ADDED",
    "TOKEN_REMOVED",
    "TURN_ADVANCE",
    "FOG_REVEAL",
    "SET_MODE",
    "MAP_PING",
    "MAP_MEASUREMENT",
    "SESSION_SAVE",
    "SESSION_ENDED",
    "CHAT_CLEAR",
    "CHAT_MESSAGE",
    "MAP_SYNC",
    "MAP_FOG_SYNC",
  ].includes(message.type);
}

export function isGuestOnlyVTTMessage(message: VTTMessage): boolean {
  return [
    "TOKEN_ADD_REQUEST",
    "TOKEN_MOVE",
    "TOKEN_REMOVE",
    "TOKEN_SELECT",
    "PING",
    "CHAT_MESSAGE",
    "MEASUREMENT",
  ].includes(message.type);
}
