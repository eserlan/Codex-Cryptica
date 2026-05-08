import type { AppEventDefinition } from "@codex/events";

export const UI_EVENTS = {
  SIDEBAR_TOGGLED: "UI:SIDEBAR_TOGGLED",
} as const;

export type UIEventType = (typeof UI_EVENTS)[keyof typeof UI_EVENTS];

declare module "@codex/events" {
  interface AppEventRegistry {
    "UI:SIDEBAR_TOGGLED": AppEventDefinition<"ui", { open: boolean }>;
  }
}
