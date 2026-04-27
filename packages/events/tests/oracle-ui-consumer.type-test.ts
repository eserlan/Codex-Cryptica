import { ORACLE_EVENTS } from "../../oracle-engine/src/events";
import { UI_EVENTS } from "../../../apps/web/src/lib/events/ui";
import type { AppEventOf } from "@codex/events";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;

type Expect<Value extends true> = Value;

type _OracleUndoPayload = Expect<
  Equal<
    AppEventOf<typeof ORACLE_EVENTS.UNDO_PERFORMED>["payload"],
    { messageId: string }
  >
>;

type _UiSidebarPayload = Expect<
  Equal<
    AppEventOf<typeof UI_EVENTS.SIDEBAR_TOGGLED>["payload"],
    { open: boolean }
  >
>;

const oracleEvent: AppEventOf<typeof ORACLE_EVENTS.UNDO_PERFORMED> = {
  type: ORACLE_EVENTS.UNDO_PERFORMED,
  domain: "oracle",
  payload: { messageId: "message-1" },
  metadata: { timestamp: 1, sync: true },
};

const uiEvent: AppEventOf<typeof UI_EVENTS.SIDEBAR_TOGGLED> = {
  type: UI_EVENTS.SIDEBAR_TOGGLED,
  domain: "ui",
  payload: { open: true },
  metadata: { timestamp: 1 },
};

void oracleEvent;
void uiEvent;
