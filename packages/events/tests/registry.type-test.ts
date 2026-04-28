import type {
  AppEventDefinition,
  AppEventDomainOf,
  AppEventForDomain,
  AppEventOf,
  AppEventPayloadOf,
  AppEventRegistry,
  AppEventType,
  DomainFromWildcard,
  RegisteredAppEvent,
} from "@codex/events";

declare module "@codex/events" {
  interface AppEventRegistry {
    "TEST:CREATED": AppEventDefinition<"test", { id: string; count: number }>;
    "TEST:DELETED": AppEventDefinition<"test", { id: string }>;
  }
}

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;

type Expect<Value extends true> = Value;

type _RegisteredEventName = Expect<
  Equal<Extract<AppEventType, "TEST:CREATED">, "TEST:CREATED">
>;

type _RegisteredPayload = Expect<
  Equal<AppEventPayloadOf<"TEST:CREATED">, { id: string; count: number }>
>;

type _RegisteredDomain = Expect<
  Equal<AppEventDomainOf<"TEST:CREATED">, "test">
>;

type _SpecificEvent = Expect<
  Equal<
    AppEventOf<"TEST:CREATED">,
    {
      type: "TEST:CREATED";
      domain: "test";
      payload: { id: string; count: number };
      metadata: {
        sync?: boolean;
        timestamp: number;
        remote?: boolean;
        vaultId?: string;
      };
    }
  >
>;

type _DomainUnion = Expect<
  Equal<
    AppEventForDomain<"test">,
    AppEventOf<"TEST:CREATED"> | AppEventOf<"TEST:DELETED">
  >
>;

type _WildcardDomainUpper = Expect<Equal<DomainFromWildcard<"TEST:*">, "test">>;
type _WildcardDomainLower = Expect<Equal<DomainFromWildcard<"test:*">, "test">>;

type _VisibleRegistryEntry = Expect<
  Equal<
    AppEventRegistry["TEST:CREATED"],
    AppEventDefinition<"test", { id: string; count: number }>
  >
>;

const validEvent: AppEventOf<"TEST:CREATED"> = {
  type: "TEST:CREATED",
  domain: "test",
  payload: { id: "id-1", count: 1 },
  metadata: { timestamp: 1 },
};

const registeredEvent: RegisteredAppEvent = validEvent;
void registeredEvent;

// @ts-expect-error unregistered event names are rejected
type _InvalidEvent = AppEventOf<"TEST:MISSING">;

// @ts-expect-error malformed payloads are rejected
const invalidPayload: AppEventPayloadOf<"TEST:CREATED"> = { id: "id-1" };

void invalidPayload;
