/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import {
  createMarkdownEditingController,
  toggleLinePrefix,
  wrapInlineMarker,
} from "./markdown-editing";

describe("wrapInlineMarker", () => {
  it("wraps a selection in the marker and keeps it selected", () => {
    const result = wrapInlineMarker(
      { text: "The bridge groans", start: 4, end: 10 },
      "**",
    );
    expect(result.text).toBe("The **bridge** groans");
    expect(result.text.slice(result.start, result.end)).toBe("bridge");
  });

  it("opens an empty pair with the caret in the middle when nothing is selected", () => {
    const result = wrapInlineMarker({ text: "Note: ", start: 6, end: 6 }, "*");
    expect(result.text).toBe("Note: **");
    expect(result.start).toBe(7);
    expect(result.end).toBe(7);
  });
});

describe("toggleLinePrefix", () => {
  it("adds a bullet to every line the selection touches", () => {
    const text = "First clue\nSecond clue";
    const result = toggleLinePrefix({ text, start: 0, end: text.length }, "- ");
    expect(result.text).toBe("- First clue\n- Second clue");
  });

  it("removes the bullet again when every touched line already has one", () => {
    const text = "- First clue\n- Second clue";
    const result = toggleLinePrefix({ text, start: 0, end: text.length }, "- ");
    expect(result.text).toBe("First clue\nSecond clue");
  });

  it("only touches the lines the selection actually spans", () => {
    const text = "Untouched\nThe bridge groans\nAlso untouched";
    const lineStart = text.indexOf("The bridge");
    const lineEnd = lineStart + "The bridge groans".length;
    const result = toggleLinePrefix(
      { text, start: lineStart + 2, end: lineEnd - 2 },
      "- ",
    );
    expect(result.text).toBe("Untouched\n- The bridge groans\nAlso untouched");
  });
});

describe("createMarkdownEditingController", () => {
  function setup(text = "") {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    let value = text;
    const onSubmitShortcut = vi.fn();
    const controller = createMarkdownEditingController({
      getTextarea: () => textarea,
      getText: () => value,
      setText: (t) => (value = t),
      onSubmitShortcut,
    });
    return { textarea, controller, getValue: () => value, onSubmitShortcut };
  }

  it("applies bold via the keyboard shortcut", async () => {
    const { textarea, controller, getValue } = setup("bridge");
    textarea.setSelectionRange(0, 6);
    controller.handleKeydown(
      new KeyboardEvent("keydown", { key: "b", ctrlKey: true }),
    );
    await Promise.resolve();
    // controller.format is async; flush a microtask for the DOM update.
    await new Promise((r) => setTimeout(r, 0));
    // setText writes back through the caller's own state, not the DOM
    // textarea directly — a real component's bind:value does that part.
    expect(getValue()).toBe("**bridge**");
  });

  it("routes Ctrl/Cmd+Enter to the submit callback instead of formatting", () => {
    const { controller, onSubmitShortcut } = setup("Ready");
    controller.handleKeydown(
      new KeyboardEvent("keydown", { key: "Enter", metaKey: true }),
    );
    expect(onSubmitShortcut).toHaveBeenCalledTimes(1);
  });

  it("does nothing for a plain Enter or an unmodified letter (negative)", () => {
    const { controller, onSubmitShortcut } = setup("Ready");
    controller.handleKeydown(new KeyboardEvent("keydown", { key: "Enter" }));
    controller.handleKeydown(new KeyboardEvent("keydown", { key: "b" }));
    expect(onSubmitShortcut).not.toHaveBeenCalled();
  });
});
