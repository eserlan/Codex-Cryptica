import { AppEventBus } from "../src/AppEventBus";

const bus = new AppEventBus();

bus.subscribe("TEST:CREATED", (event) => {
  const id: string = event.payload.id;
  const count: number = event.payload.count;
  void id;
  void count;

  // @ts-expect-error exact event subscriptions expose only that event payload
  void event.payload.entityId;
});

bus.subscribe(["TEST:CREATED", "TEST:DELETED"] as const, (event) => {
  if (event.type === "TEST:CREATED") {
    const id: string = event.payload.id;
    const count: number = event.payload.count;
    void id;
    void count;
  }

  if (event.type === "TEST:DELETED") {
    const id: string = event.payload.id;
    void id;
  }
});

bus.subscribe("test:*", (event) => {
  const domain: "test" = event.domain;
  void domain;
});

bus.subscribe("*", (event) => {
  const type: string = event.type;
  void type;
});

bus.emit({
  type: "TEST:DELETED",
  domain: "test",
  payload: { id: "entity-1" },
  metadata: { timestamp: 1 },
});

// @ts-expect-error invalid event filters are rejected
bus.subscribe("FOOBAR:*", () => {});

// @ts-expect-error emit validates event payload shape
bus.emit({
  type: "TEST:CREATED",
  domain: "test",
  payload: { id: "entity-1" },
  metadata: { timestamp: 1 },
});

bus.emit({
  // @ts-expect-error unregistered event types are rejected
  type: "TEST:NOT_REGISTERED",
  domain: "test",
  payload: {},
  metadata: { timestamp: 1 },
});
