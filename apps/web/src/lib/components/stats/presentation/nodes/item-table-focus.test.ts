import { afterEach, describe, expect, it, vi } from "vitest";
import {
  captureRowFocus,
  restoreRowFocus,
  rowMoveDirection,
} from "./item-table-focus";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

function table() {
  const container = document.createElement("div");
  container.innerHTML = `<table><tbody><tr data-row-index="0"><td><input data-col-id="name" value="Sword"><button data-action="move-up">Up</button></td></tr><tr data-row-index="1"><td><input data-col-id="name" value="Sword"><button data-action="move-up" disabled>Up</button><button data-action="move-down">Down</button></td></tr></tbody></table>`;
  document.body.append(container);
  return container;
}

describe("item table row focus", () => {
  it("restores the same cell and selection on the destination row", () => {
    const container = table();
    const input = container.querySelector("input")!;
    input.focus();
    input.setSelectionRange(1, 3);
    const focus = captureRowFocus(container, 0, 1)!;
    restoreRowFocus(container, focus);
    const target = container.querySelectorAll("input")[1];
    expect(document.activeElement).toBe(target);
    expect(target.selectionStart).toBe(1);
    expect(target.selectionEnd).toBe(3);
  });

  it("falls back from a disabled move button to the alternate action", () => {
    const container = table();
    container.querySelector<HTMLButtonElement>("button")!.focus();
    const focus = captureRowFocus(container, 0, 1)!;
    restoreRowFocus(container, focus);
    expect(document.activeElement).toBe(
      container.querySelector('[data-action="move-down"]'),
    );
  });

  it("ignores focus outside the moved row and missing containers", () => {
    const container = table();
    container.querySelector("input")!.focus();
    expect(captureRowFocus(container, 1, 0)).toBeNull();
    expect(captureRowFocus(undefined, 0, 1)).toBeNull();
    restoreRowFocus(undefined, {
      selector: "missing",
      targetIndex: 0,
      selectionStart: null,
      selectionEnd: null,
    });
  });

  it("distinguishes formula, counter and row controls", () => {
    const container = table();
    const input = container.querySelector("input")!;
    input.dataset.action = "formula";
    input.focus();
    expect(captureRowFocus(container, 0, 1)?.selector).toContain(
      '[data-action="formula"]',
    );
    input.dataset.counterAction = "inc";
    expect(captureRowFocus(container, 0, 1)?.selector).toContain(
      '[data-counter-action="inc"]',
    );
    const row = container.querySelector("tr")!;
    row.tabIndex = -1;
    row.focus();
    expect(captureRowFocus(container, 0, 1)?.selector).toBe(
      'tr[data-row-index="1"]',
    );
  });

  it("recognises supported shortcuts and excludes Shift, read-only and plain arrows", () => {
    expect(
      rowMoveDirection(
        new KeyboardEvent("keydown", { key: "ArrowUp", ctrlKey: true }),
        false,
      ),
    ).toBe(-1);
    expect(
      rowMoveDirection(
        new KeyboardEvent("keydown", { key: "ArrowDown", metaKey: true }),
        false,
      ),
    ).toBe(1);
    expect(
      rowMoveDirection(
        new KeyboardEvent("keydown", { key: "ArrowDown", altKey: true }),
        false,
      ),
    ).toBe(1);
    expect(
      rowMoveDirection(
        new KeyboardEvent("keydown", {
          key: "ArrowDown",
          ctrlKey: true,
          shiftKey: true,
        }),
        false,
      ),
    ).toBeNull();
    expect(
      rowMoveDirection(
        new KeyboardEvent("keydown", { key: "ArrowUp", ctrlKey: true }),
        true,
      ),
    ).toBeNull();
    expect(
      rowMoveDirection(new KeyboardEvent("keydown", { key: "ArrowUp" }), false),
    ).toBeNull();
  });
});
