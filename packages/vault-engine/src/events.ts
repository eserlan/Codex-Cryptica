import type { AppEventDefinition } from "@codex/events";

export const VAULT_EVENTS = {
  VAULT_OPENING: "VAULT:VAULT_OPENING",
  CACHE_LOADED: "VAULT:CACHE_LOADED",
  ENTITY_UPDATED: "VAULT:ENTITY_UPDATED",
  VAULT_SWITCHED: "VAULT:VAULT_SWITCHED",
  ENTITY_DELETED: "VAULT:ENTITY_DELETED",
  BATCH_CREATED: "VAULT:BATCH_CREATED",
  BATCH_UPDATED: "VAULT:BATCH_UPDATED",
  SYNC_COMPLETE: "VAULT:SYNC_COMPLETE",
  SYNC_CHUNK_READY: "VAULT:SYNC_CHUNK_READY",
} as const;

export type VaultEventType = (typeof VAULT_EVENTS)[keyof typeof VAULT_EVENTS];

declare module "@codex/events" {
  interface AppEventRegistry {
    "VAULT:VAULT_OPENING": AppEventDefinition<"vault", Record<string, never>>;
    "VAULT:CACHE_LOADED": AppEventDefinition<"vault", { entities: any[] }>;
    "VAULT:ENTITY_UPDATED": AppEventDefinition<
      "vault",
      { id: string; patch: any; entity: any }
    >;
    "VAULT:VAULT_SWITCHED": AppEventDefinition<"vault", { id: string }>;
    "VAULT:ENTITY_DELETED": AppEventDefinition<"vault", { entityId: string }>;
    "VAULT:BATCH_CREATED": AppEventDefinition<"vault", { entities: any[] }>;
    "VAULT:BATCH_UPDATED": AppEventDefinition<
      "vault",
      { entities: any[]; patches?: any }
    >;
    "VAULT:SYNC_COMPLETE": AppEventDefinition<"vault", Record<string, never>>;
    "VAULT:SYNC_CHUNK_READY": AppEventDefinition<
      "vault",
      { newOrChangedIds: string[]; entities: any[] }
    >;
  }
}
