/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { autosize } from "./prep-autosize";

function textarea(scrollHeight: () => number) {
  const node = document.createElement("textarea");
  Object.defineProperty(node, "scrollHeight", { get: scrollHeight });
  return node;
}

describe("autosize", () => {
  it("sizes the textarea to its content and grows as the GM types", () => {
    let content = 40;
    const node = textarea(() => content);
    autosize(() => node.value)(node);
    expect(node.style.height).toBe("40px");

    content = 96;
    node.dispatchEvent(new Event("input"));
    expect(node.style.height).toBe("96px");
  });

  it("stops listening once it is torn down", () => {
    let content = 40;
    const node = textarea(() => content);
    const cleanup = autosize(() => node.value)(node);
    if (typeof cleanup === "function") cleanup();

    content = 200;
    node.dispatchEvent(new Event("input"));
    expect(node.style.height).toBe("40px");
  });

  it("reads the value so programmatic changes re-run it", () => {
    let reads = 0;
    const node = textarea(() => 10);
    autosize(() => {
      reads++;
      return "AI text";
    })(node);
    expect(reads).toBe(1);
  });
});
