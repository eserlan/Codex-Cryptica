/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";

import {
  addToOracleChatInput,
  ORACLE_CHAT_INPUT_EVENT,
} from "./oracle-chat-input";

describe("addToOracleChatInput", () => {
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

  it("does not publish blank text", () => {
    expect(addToOracleChatInput("   ")).toBe(false);
  });

  it("reports failure when the Oracle chat composer is unavailable", () => {
    expect(addToOracleChatInput("The bridge collapses")).toBe(false);
  });
});
