import { describe, expect, it } from "vitest";
import type { AppEventOf } from "@codex/events";
import { UI_EVENTS } from "./ui";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;

type Expect<Value extends true> = Value;

type _UiSidebarPayload = Expect<
  Equal<
    AppEventOf<typeof UI_EVENTS.SIDEBAR_TOGGLED>["payload"],
    { open: boolean }
  >
>;

describe("UI_EVENTS", () => {
  it("types the sidebar toggle event through the shared AppEventOf helper", () => {
    const uiEvent: AppEventOf<typeof UI_EVENTS.SIDEBAR_TOGGLED> = {
      type: UI_EVENTS.SIDEBAR_TOGGLED,
      domain: "ui",
      payload: { open: true },
      metadata: { timestamp: 1 },
    };

    expect(uiEvent.domain).toBe("ui");
    expect(uiEvent.payload.open).toBe(true);
  });
});
