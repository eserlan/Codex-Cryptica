/** @vitest-environment jsdom */
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import ArticleRenderer from "./ArticleRenderer.svelte";

describe("ArticleRenderer", () => {
  it("uses readable, wrapping long-form typography and keeps code blocks scrollable", () => {
    const { container } = render(ArticleRenderer, {
      props: {
        content:
          "Some body copy.\n\n```\nA very long unbroken line of preformatted code that would otherwise overflow the article on narrow screens\n```",
      },
    });

    const article = container.querySelector(".blog-content");
    expect(article?.classList.contains("text-lg")).toBe(true);
    expect(article?.classList.contains("leading-relaxed")).toBe(true);
    expect(article?.classList.contains("break-words")).toBe(true);
    expect(article?.classList.contains("prose-pre:overflow-x-auto")).toBe(
      true,
    );
    expect(article?.querySelector("pre")).toBeTruthy();
  });
});
