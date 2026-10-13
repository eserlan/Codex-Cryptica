/** @vitest-environment jsdom */

import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$app/environment", () => ({ browser: true }));

import DraftBody from "./DraftBody.svelte";

describe("DraftBody", () => {
  it("renders generated Markdown images as text without loading their URLs", () => {
    const { container } = render(DraftBody, {
      draft: {
        title: "Generated tome",
        entityType: "item",
        summary: "A generated draft",
        content: "![tracking pixel](https://tracker.example/pixel.png)",
        lore: "",
        labels: [],
        sourceGeneratorId: "tome",
        templateApplied: false,
      },
    });

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("tracking pixel");
    expect(container.innerHTML).not.toContain("tracker.example");
  });
});
