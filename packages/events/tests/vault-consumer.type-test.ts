import { VAULT_EVENTS } from "../../vault-engine/src/events";
import type { AppEventOf } from "@codex/events";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;

type Expect<Value extends true> = Value;

type _VaultEntityUpdatedPayload = Expect<
  Equal<
    AppEventOf<typeof VAULT_EVENTS.ENTITY_UPDATED>["payload"],
    { id: string; patch: any; entity: any }
  >
>;

const event: AppEventOf<typeof VAULT_EVENTS.ENTITY_UPDATED> = {
  type: VAULT_EVENTS.ENTITY_UPDATED,
  domain: "vault",
  payload: { id: "entity-1", patch: {}, entity: {} },
  metadata: { timestamp: 1 },
};

const id: string = event.payload.id;
void id;

const invalidEvent: AppEventOf<typeof VAULT_EVENTS.ENTITY_DELETED> = {
  type: VAULT_EVENTS.ENTITY_DELETED,
  domain: "vault",
  // @ts-expect-error exported Vault constants reject invalid payloads
  payload: { id: "entity-1" },
  metadata: { timestamp: 1 },
};

void invalidEvent;
