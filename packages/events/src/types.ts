export interface AppEventMetadata {
  sync?: boolean;
  timestamp: number;
  remote?: boolean;
  vaultId?: string;
}

export interface RuntimeAppEvent {
  type: string;
  domain: string;
  payload: unknown;
  metadata: AppEventMetadata;
}

export interface AppEventDefinition<
  Domain extends string,
  Payload = Record<string, never>,
> {
  domain: Domain;
  payload: Payload;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AppEventRegistry {
  // Domain packages extend this interface with module augmentation.
}

type RegisteredAppEventRegistry = AppEventRegistry;

export type AppEventType = Extract<keyof RegisteredAppEventRegistry, string>;

export type AppEventDomainOf<Type extends AppEventType> =
  RegisteredAppEventRegistry[Type] extends AppEventDefinition<
    infer Domain,
    unknown
  >
    ? Domain
    : never;

export type AppEventPayloadOf<Type extends AppEventType> =
  RegisteredAppEventRegistry[Type] extends AppEventDefinition<
    string,
    infer Payload
  >
    ? Payload
    : never;

export type AppEventOf<Type extends AppEventType> = {
  type: Type;
  domain: AppEventDomainOf<Type>;
  payload: AppEventPayloadOf<Type>;
  metadata: AppEventMetadata;
};

export type AppEventsOf<Type extends AppEventType> = {
  [EventType in Type]: AppEventOf<EventType>;
}[Type];

export type RegisteredAppEvent = {
  [Type in AppEventType]: AppEventOf<Type>;
}[AppEventType];

export type AppEventDomain = Extract<RegisteredAppEvent["domain"], string>;

export type EventDomain = AppEventDomain | "sync" | "system";

export type AppEventForDomain<Domain extends AppEventDomain> = Extract<
  RegisteredAppEvent,
  { domain: Domain }
>;

export type DomainWildcard<Domain extends AppEventDomain = AppEventDomain> =
  | `${Uppercase<Domain>}:*`
  | `${Lowercase<Domain>}:*`;

export type EventWildcard = "*" | DomainWildcard;

export type DomainFromWildcard<Filter extends DomainWildcard> = Extract<
  Lowercase<Filter extends `${infer Domain}:*` ? Domain : never>,
  AppEventDomain
>;

export type AppEvent = RegisteredAppEvent;

export type AppEventListener<Event extends RuntimeAppEvent = AppEvent> = (
  event: Event,
) => void | Promise<void>;
