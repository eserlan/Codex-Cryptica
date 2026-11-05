/** @vitest-environment jsdom */

import { afterEach, describe, expect, it } from "vitest";
import {
  bodyPortal,
  containTab,
  focusableWithin,
} from "./adventure-phone-surface";

function tab(shiftKey = false) {
  return new KeyboardEvent("keydown", {
    key: "Tab",
    shiftKey,
    cancelable: true,
  });
}

describe("adventure phone surface", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("wraps Tab and Shift+Tab inside the surface", () => {
    document.body.innerHTML = `
      <button id="outside">Nav</button>
      <section id="surface">
        <button id="first">Leave</button>
        <button disabled>Disabled</button>
        <input id="last" />
      </section>`;
    const surface = document.getElementById("surface")!;
    expect(focusableWithin(surface).map((el) => el.id)).toEqual([
      "first",
      "last",
    ]);

    document.getElementById("last")!.focus();
    const forward = tab();
    expect(containTab(forward, surface)).toBe(true);
    expect(forward.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe("first");

    const back = tab(true);
    expect(containTab(back, surface)).toBe(true);
    expect(document.activeElement?.id).toBe("last");
  });

  it("does not interfere when focus is outside the surface (e.g. a global dialog)", () => {
    document.body.innerHTML = `
      <div role="dialog"><button id="dialog-button">OK</button></div>
      <section id="surface"><button>Leave</button></section>`;
    document.getElementById("dialog-button")!.focus();
    const event = tab();
    expect(containTab(event, document.getElementById("surface")!)).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it("moves the surface to <body> while enabled and back when disabled", () => {
    document.body.innerHTML = `<div id="translated" style="transform: translate(-50%, -50%)"><section id="surface"></section></div>`;
    const host = document.getElementById("translated")!;
    const surface = document.getElementById("surface")!;
    const portal = bodyPortal(surface, true);
    expect(surface.parentElement).toBe(document.body);
    expect(host.contains(surface)).toBe(false);

    portal.update(false);
    expect(surface.parentElement).toBe(host);

    portal.update(true);
    portal.destroy();
    expect(surface.isConnected).toBe(false);
    expect(host.childNodes.length).toBe(0);
  });

  it("leaves the surface in place when not enabled", () => {
    document.body.innerHTML = `<div id="host"><section id="surface"></section></div>`;
    const surface = document.getElementById("surface")!;
    bodyPortal(surface, false);
    expect(surface.parentElement?.id).toBe("host");
  });
});
