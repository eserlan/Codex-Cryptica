/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { dialogFocus } from "./biome-dialog-focus";

function setup() {
  document.body.innerHTML = `
    <button id="opener">Open</button>
    <div id="dialog" role="alertdialog">
      <button id="keep">Keep</button>
      <button id="discard">Discard</button>
    </div>`;
  const opener = document.getElementById("opener") as HTMLElement;
  opener.focus();
  const dialog = document.getElementById("dialog") as HTMLElement;
  const onEscape = vi.fn();
  const action = dialogFocus(dialog, { onEscape, initial: "#keep" });
  return { opener, dialog, onEscape, action };
}

const press = (el: Element, init: KeyboardEventInit) =>
  el.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }),
  );

afterEach(() => {
  document.body.innerHTML = "";
});

describe("dialogFocus", () => {
  it("moves focus to the requested control when it opens", () => {
    setup();
    expect(document.activeElement?.id).toBe("keep");
  });

  it("falls back to the first control when the requested one is missing", () => {
    document.body.innerHTML = `<div id="d"><button id="a">A</button></div>`;
    dialogFocus(document.getElementById("d")!, {
      onEscape: () => {},
      initial: "#nope",
    });
    expect(document.activeElement?.id).toBe("a");
  });

  it("wraps Tab from the last control to the first, and Shift+Tab the other way", () => {
    const { dialog } = setup();
    (document.getElementById("discard") as HTMLElement).focus();
    press(dialog, { key: "Tab" });
    expect(document.activeElement?.id).toBe("keep");
    press(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement?.id).toBe("discard");
  });

  it("pulls focus back in if it has escaped the dialog", () => {
    const { dialog, opener } = setup();
    opener.focus();
    press(dialog, { key: "Tab" });
    expect(document.activeElement?.id).toBe("keep");
  });

  it("calls onEscape on Escape and ignores other keys", () => {
    const { dialog, onEscape } = setup();
    press(dialog, { key: "a" });
    expect(onEscape).not.toHaveBeenCalled();
    press(dialog, { key: "Escape" });
    expect(onEscape).toHaveBeenCalledOnce();
  });

  it("returns focus to the opener when it goes away, but not if the opener is gone", () => {
    const { opener, action } = setup();
    action.destroy();
    expect(document.activeElement).toBe(opener);

    const second = setup();
    second.opener.remove();
    expect(() => second.action.destroy()).not.toThrow();
  });
});
