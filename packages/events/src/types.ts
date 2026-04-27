export type EventDomain = "vault" | "oracle" | "sync" | "ui" | "system";

export interface AppEventMetadata {
  sync?: boolean;
  timestamp: number;
  remote?: boolean;
  vaultId?: string;
}

export interface BaseAppEvent<
  T extends string,
  D extends EventDomain,
  P = any,
> {
  type: T;
  domain: D;
  payload: P;
  metadata: AppEventMetadata;
}

// Domain-specific event unions (to be expanded)
export type VaultAppEvent =
  | BaseAppEvent<"VAULT:ENTITY_UPDATED", "vault", { id: string; patch: any }>
  | BaseAppEvent<"VAULT:VAULT_SWITCHED", "vault", { id: string }>
  | BaseAppEvent<"VAULT:ENTITY_DELETED", "vault", { entityId: string }>
  | BaseAppEvent<"VAULT:BATCH_CREATED", "vault", { entities: any[] }>
  | BaseAppEvent<
      "VAULT:BATCH_UPDATED",
      "vault",
      { entities: any[]; patches?: any }
    >
  | BaseAppEvent<"VAULT:SYNC_COMPLETE", "vault", Record<string, never>>
  | BaseAppEvent<
      "VAULT:SYNC_CHUNK_READY",
      "vault",
      { newOrChangedIds: string[] }
    >;

export type OracleAppEvent = BaseAppEvent<
  "ORACLE:UNDO_PERFORMED",
  "oracle",
  { messageId: string }
>;

export type UIAppEvent = BaseAppEvent<
  "UI:SIDEBAR_TOGGLED",
  "ui",
  { open: boolean }
>;

export type AppEvent = VaultAppEvent | OracleAppEvent | UIAppEvent;

export type AppEventListener = (event: AppEvent) => void | Promise<void>;
