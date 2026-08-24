import type { RollResult } from "dice-engine";
import { mapSession } from "$lib/stores/map-session.svelte";
import { addToOracleChatInput } from "$lib/components/oracle/oracle-chat-input";

export type PlayToolsBridgeMessage =
  | { type: "VTT_CHAT_MESSAGE"; content: string }
  | { type: "VTT_ROLL_MESSAGE"; formula: string; result: RollResult }
  | { type: "CHAT_INPUT_DRAFT"; text: string };

const CHANNEL_NAME = "codex_play_tools_bridge";

export class PlayToolsBridge {
  private channel: BroadcastChannel | null = null;
  private isListening = false;

  constructor(channel?: BroadcastChannel | null) {
    if (channel !== undefined) {
      this.channel = channel;
    } else if (
      typeof window !== "undefined" &&
      typeof BroadcastChannel !== "undefined"
    ) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
      } catch (e) {
        console.warn("[PlayToolsBridge] BroadcastChannel unavailable:", e);
      }
    }
  }

  post(message: PlayToolsBridgeMessage) {
    try {
      this.channel?.postMessage(message);
    } catch (e) {
      console.warn("[PlayToolsBridge] Post failed:", e);
    }
  }

  initReceiver(session = mapSession) {
    if (!this.channel || this.isListening) return () => {};
    this.isListening = true;

    const handler = (event: MessageEvent<PlayToolsBridgeMessage>) => {
      const data = event.data;
      if (!data || !data.type) return;

      if (data.type === "VTT_CHAT_MESSAGE") {
        session.sendChatMessage(data.content);
      } else if (data.type === "VTT_ROLL_MESSAGE") {
        if (session.vttEnabled) {
          session.sendResolvedRollMessage(data.formula, data.result);
        } else {
          session.sendChatMessage(`/roll ${data.formula}`);
        }
      } else if (data.type === "CHAT_INPUT_DRAFT") {
        addToOracleChatInput(data.text, false);
      }
    };

    this.channel.addEventListener("message", handler);
    if ("onmessage" in this.channel) {
      this.channel.onmessage = handler;
    }

    return () => {
      this.channel?.removeEventListener("message", handler);
      this.isListening = false;
    };
  }

  destroy() {
    this.channel?.close();
    this.channel = null;
    this.isListening = false;
  }
}

export const playToolsBridge = new PlayToolsBridge();
