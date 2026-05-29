import type { AppEventDefinition } from "@codex/events";
import type { OracleIntent, DiscoveryProposal } from "./types";

export const ORACLE_EVENTS = {
  UNDO_PERFORMED: "ORACLE:UNDO_PERFORMED",
  COMMAND_STARTED: "ORACLE:COMMAND_STARTED",
  COMMAND_COMPLETED: "ORACLE:COMMAND_COMPLETED",
  COMMAND_FAILED: "ORACLE:COMMAND_FAILED",
  ENTITY_DISCOVERED: "ORACLE:ENTITY_DISCOVERED",
  ENTITY_CREATED: "ORACLE:ENTITY_CREATED",
} as const;

export type OracleEventType =
  (typeof ORACLE_EVENTS)[keyof typeof ORACLE_EVENTS];

declare module "@codex/events" {
  interface AppEventRegistry {
    "ORACLE:UNDO_PERFORMED": AppEventDefinition<
      "oracle",
      { messageId: string }
    >;
    "ORACLE:COMMAND_STARTED": AppEventDefinition<
      "oracle",
      { intent: OracleIntent }
    >;
    "ORACLE:COMMAND_COMPLETED": AppEventDefinition<
      "oracle",
      { intent: OracleIntent; result?: any }
    >;
    "ORACLE:COMMAND_FAILED": AppEventDefinition<
      "oracle",
      { intent: OracleIntent; error: string }
    >;
    "ORACLE:ENTITY_DISCOVERED": AppEventDefinition<
      "oracle",
      { proposal: DiscoveryProposal }
    >;
    "ORACLE:ENTITY_CREATED": AppEventDefinition<
      "oracle",
      { entityId: string; title: string }
    >;
  }
}
