import type {
  EncounterSession,
  SessionSnapshotPayload,
  VTTMessage,
} from "$types/vtt";

export interface CompressedSessionSnapshotPayload {
  type: "SESSION_SNAPSHOT_GZIP";
  encoding: "gzip";
  data: ArrayBuffer;
}

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
  | {
      type: "MAP_PING";
      payload: {
        mapId: string;
        x: number;
        y: number;
        peerId: string;
        color: string;
      };
    }
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
  | VTTMessage
  | CompressedSessionSnapshotPayload;

async function compressJson(value: unknown): Promise<ArrayBuffer> {
  const text = JSON.stringify(value);
  const source = new Response(text).body;
  if (!source) {
    throw new Error("Failed to create snapshot compression stream");
  }
  const compressed = source.pipeThrough(new CompressionStream("gzip"));
  return await new Response(compressed).arrayBuffer();
}

async function decompressJson(data: ArrayBuffer): Promise<string> {
  const source = new Response(data).body;
  if (!source) {
    throw new Error("Failed to create snapshot decompression stream");
  }
  const decompressed = source.pipeThrough(new DecompressionStream("gzip"));
  return await new Response(decompressed).text();
}

export async function encodeSessionSnapshot(
  session: EncounterSession,
): Promise<SessionSnapshotPayload | CompressedSessionSnapshotPayload> {
  if (
    typeof CompressionStream === "undefined" ||
    typeof DecompressionStream === "undefined"
  ) {
    return {
      type: "SESSION_SNAPSHOT",
      session,
    };
  }

  return {
    type: "SESSION_SNAPSHOT_GZIP",
    encoding: "gzip",
    data: await compressJson(session),
  };
}

export async function decodeSessionSnapshot(
  message: SessionSnapshotPayload | CompressedSessionSnapshotPayload,
): Promise<EncounterSession> {
  if (message.type === "SESSION_SNAPSHOT") {
    return message.session;
  }

  const text = await decompressJson(message.data);
  return JSON.parse(text) as EncounterSession;
}

export function isVTTMessage(message: any): message is VTTMessage {
  return (
    message &&
    typeof message === "object" &&
    typeof message.type === "string" &&
    [
      "SESSION_SNAPSHOT",
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
      "MAP_SYNC",
      "MAP_FOG_SYNC",
      "MEASUREMENT",
      "MAP_MEASUREMENT",
      "SET_GRID_SETTINGS",
    ].includes(message.type)
  );
}

export function isHostOnlyVTTMessage(message: VTTMessage): boolean {
  return [
    "SESSION_SNAPSHOT",
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
