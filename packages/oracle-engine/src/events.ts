import type { AppEventDefinition } from "@codex/events";

export const ORACLE_EVENTS = {
  UNDO_PERFORMED: "ORACLE:UNDO_PERFORMED",
} as const;

export type OracleEventType =
  (typeof ORACLE_EVENTS)[keyof typeof ORACLE_EVENTS];

declare module "@codex/events" {
  interface AppEventRegistry {
    "ORACLE:UNDO_PERFORMED": AppEventDefinition<
      "oracle",
      { messageId: string }
    >;
  }
}
