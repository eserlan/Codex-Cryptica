/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";

import {
  takeOraclePrefill,
  addToOracleChatInput,
  clearOracleChatDraft,
  getOracleChatDraft,
  ORACLE_CHAT_INPUT_EVENT,
  setOracleChatDraft,
} from "./oracle-chat-input";

describe("addToOracleChatInput", () => {
  beforeEach(() => {
    clearOracleChatDraft();
  });

  it("publishes result text for the Oracle chat composer", () => {
    let received = "";
    window.addEventListener(
      ORACLE_CHAT_INPUT_EVENT,
      (event) => {
        received = (event as CustomEvent<string>).detail;
        event.preventDefault();
      },
      { once: true },
    );

    expect(addToOracleChatInput("The bridge collapses")).toBe(true);
    expect(received).toBe("The bridge collapses");
  });

  it("buffers draft text when no listener has consumed it immediately", () => {
    expect(addToOracleChatInput("The bridge collapses")).toBe(true);
    expect(getOracleChatDraft()).toBe("The bridge collapses");

    expect(addToOracleChatInput("A second complication")).toBe(true);
    expect(getOracleChatDraft()).toBe(
      "The bridge collapses\nA second complication",
    );
  });

  it("clears buffered draft on demand", () => {
    setOracleChatDraft("Pending draft text");
    expect(getOracleChatDraft()).toBe("Pending draft text");
    clearOracleChatDraft();
    expect(getOracleChatDraft()).toBe("");
  });

  it("does not publish or buffer blank text", () => {
    expect(addToOracleChatInput("   ")).toBe(false);
    expect(getOracleChatDraft()).toBe("");
  });
});

describe("takeOraclePrefill (Solo Play Loop, FR-019)", () => {
  it("returns a waiting shortcut prompt once and clears it", () => {
    const ui = {
      pendingPrompt: "How does this NPC react?" as string | null,
      takePendingPrompt() {
        const p = this.pendingPrompt;
        this.pendingPrompt = null;
        return p;
      },
    };
    expect(takeOraclePrefill(ui)).toBe("How does this NPC react?");
    expect(ui.pendingPrompt).toBeNull();
    expect(takeOraclePrefill(ui)).toBeNull();
  });

  it("does not send: taking a prefill never calls ask", () => {
    const ui = {
      pendingPrompt: "What happens next?" as string | null,
      takePendingPrompt() {
        const p = this.pendingPrompt;
        this.pendingPrompt = null;
        return p;
      },
    };
    const asked = { count: 0 };
    takeOraclePrefill(ui);
    expect(asked.count).toBe(0);
    expect(ui.pendingPrompt).toBeNull();
  });
});
