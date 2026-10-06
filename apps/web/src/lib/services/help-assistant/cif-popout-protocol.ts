import type { GuidanceAction } from "help-engine";
import type {
  HelpMessage,
  HelpStatus,
} from "$lib/stores/help-assistant/help-assistant.svelte";

/**
 * How the Cif pop-out window talks to the main window. The main window keeps
 * the conversation, the screen context and the AI request; the pop-out is only
 * a view of it. Nothing about the screen or the vault is ever sent across, only
 * the help conversation the user already sees, and only to a window of this
 * same origin.
 */
export const CIF_CHANNEL = "codex-cif-popout";
export const CIF_POPOUT_WINDOW = "CodexCrypticaCif";

/** The part of the assistant the panel draws. */
export interface HelpAssistantView {
  readonly isOpen: boolean;
  readonly status: HelpStatus;
  readonly messages: HelpMessage[];
  readonly offer: GuidanceAction | null;
  readonly notice: string | null;
  readonly quickPrompts: readonly string[];
  readonly isPending: boolean;
  ask(question: string): Promise<boolean>;
  reset(): void;
  cancel(): void;
  dismissOffer(): void;
}

export interface CifSnapshot {
  status: HelpStatus;
  messages: HelpMessage[];
  offer: GuidanceAction | null;
  notice: string | null;
  quickPrompts: string[];
  isPending: boolean;
}

export type CifToHost =
  | { type: "hello" }
  | { type: "bye" }
  | { type: "ask"; id: number; text: string }
  | { type: "reset" }
  | { type: "cancel" }
  | { type: "dismiss-offer" }
  | { type: "accept" }
  | { type: "open-article"; helpId: string }
  | { type: "open-library" };

export type CifToPopout =
  | { type: "host-ready" }
  | { type: "host-closing" }
  | { type: "snapshot"; snapshot: CifSnapshot }
  | { type: "ask-result"; id: number; started: boolean };

/** The few bytes of `BroadcastChannel` the two sides use, so tests can fake it. */
export interface CifChannel {
  postMessage(message: unknown): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  close(): void;
}

export const createCifChannel = (): CifChannel | null =>
  typeof BroadcastChannel === "undefined"
    ? null
    : (new BroadcastChannel(CIF_CHANNEL) as CifChannel);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Accepts only well-formed messages from the pop-out; anything else is ignored. */
export function parseToHost(data: unknown): CifToHost | null {
  if (!isRecord(data)) return null;
  switch (data.type) {
    case "hello":
    case "bye":
    case "reset":
    case "cancel":
    case "dismiss-offer":
    case "accept":
    case "open-library":
      return { type: data.type };
    case "ask":
      return typeof data.id === "number" && typeof data.text === "string"
        ? { type: "ask", id: data.id, text: data.text }
        : null;
    case "open-article":
      return typeof data.helpId === "string"
        ? { type: "open-article", helpId: data.helpId }
        : null;
    default:
      return null;
  }
}

export function parseToPopout(data: unknown): CifToPopout | null {
  if (!isRecord(data)) return null;
  switch (data.type) {
    case "host-ready":
    case "host-closing":
      return { type: data.type };
    case "snapshot":
      return isRecord(data.snapshot) && Array.isArray(data.snapshot.messages)
        ? {
            type: "snapshot",
            snapshot: data.snapshot as unknown as CifSnapshot,
          }
        : null;
    case "ask-result":
      return typeof data.id === "number" && typeof data.started === "boolean"
        ? { type: "ask-result", id: data.id, started: data.started }
        : null;
    default:
      return null;
  }
}
