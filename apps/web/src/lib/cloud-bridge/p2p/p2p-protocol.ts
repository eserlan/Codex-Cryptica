import type { VTTMessage } from "$types/vtt";

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
  | { type: "GUEST_STATUS"; payload: any }
  | { type: "ENTITY_UPDATE"; payload: any }
  | { type: "ENTITY_BATCH_UPDATE"; payload: Record<string, any> }
  | { type: "ENTITY_DELETE"; payload: string }
  | { type: "THEME_UPDATE"; payload: string }
  | VTTMessage;

export function isVTTMessage(message: any): message is VTTMessage {
  return (
    message &&
    typeof message === "object" &&
    typeof message.type === "string" &&
    [
      "SESSION_SNAPSHOT",
      "TOKEN_STATE_UPDATE",
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
      "CHAT_MESSAGE",
      "MAP_SYNC",
      "MAP_FOG_SYNC",
      "MAP_PING",
    ].includes(message.type)
  );
}

export function isHostOnlyVTTMessage(message: VTTMessage): boolean {
  return [
    "SESSION_SNAPSHOT",
    "TOKEN_STATE_UPDATE",
    "TOKEN_ADDED",
    "TOKEN_REMOVED",
    "TURN_ADVANCE",
    "FOG_REVEAL",
    "SET_MODE",
    "MAP_PING",
    "SESSION_SAVE",
    "SESSION_ENDED",
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
  ].includes(message.type);
}
