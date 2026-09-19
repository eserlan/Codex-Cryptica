import { ORACLE_EVENTS } from "@codex/oracle-engine";
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

const oracleEvent: AppEventOf<typeof ORACLE_EVENTS.UNDO_PERFORMED> = {
  type: ORACLE_EVENTS.UNDO_PERFORMED,
  domain: "oracle",
  payload: { messageId: "message-1" },
  metadata: { timestamp: 1, sync: true },
};

void oracleEvent;
