/** @vitest-environment jsdom */
import { readFileSync } from "node:fs";
import { fireEvent, render } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ArticleRenderer from "./ArticleRenderer.svelte";
import { lightboxStore } from "#lib/stores/ui/lightbox.svelte.js";

describe("ArticleRenderer", () => {
  beforeEach(() => {
    lightboxStore.close();
    vi.restoreAllMocks();
  });
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
    expect(article?.classList.contains("prose-pre:overflow-x-auto")).toBe(true);
    expect(article?.querySelector("pre")).toBeTruthy();
  });

  it("offsets heading anchors below the sticky header", () => {
    const source = readFileSync(
      "src/lib/components/blog/ArticleRenderer.svelte",
      "utf8",
    );
    expect(source).toMatch(
      /:global\(h2\),\s*\.blog-content :global\(h3\) \{\s*scroll-margin-top: 6rem;/,
    );
  });

  it("opens lightboxStore on image click and Enter keydown, ignoring non-image elements", async () => {
    const openSpy = vi.spyOn(lightboxStore, "open");
    const { container } = render(ArticleRenderer, {
      props: {
        content:
          "Paragraph text.\n\n![World map](https://assets.codexcryptica.com/map.webp)",
      },
    });

    const paragraph = container.querySelector("p")!;
    await fireEvent.click(paragraph);
    expect(openSpy).not.toHaveBeenCalled();

    const img = container.querySelector("img")!;
    await fireEvent.click(img);
    expect(openSpy).toHaveBeenCalledWith(
      "https://assets.codexcryptica.com/map.webp",
      "World map",
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
      }),
    );

    openSpy.mockClear();
    await fireEvent.keyDown(img, { key: "Enter" });
    expect(openSpy).toHaveBeenCalledTimes(1);
  });
});
