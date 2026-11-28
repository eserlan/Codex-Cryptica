/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FaqSection from "./FaqSection.svelte";
import { slugMeta } from "./generator-page-meta";

beforeEach(() => {
  HTMLElement.prototype.animate = vi.fn().mockImplementation(() => {
    const animation = {
      cancel: vi.fn(),
      currentTime: 0,
      onfinish: null as (() => void) | null,
      playState: "running",
    };
    queueMicrotask(() => animation.onfinish?.());
    return animation as unknown as Animation;
  });
});

describe("FaqSection exclusive feature callout", () => {
  it("renders generator-specific exclusive copy without leaking dungeon wording", () => {
    render(FaqSection, {
      props: {
        introTitle: "Adventure Idea Generator",
        faqs: [
          {
            question: "Can I turn this into an interactive canvas?",
            answer: "Yes.",
            image: "/images/adventure-canvas.png",
            imageAlt: "An interactive Adventure Canvas",
            exclusiveLabel:
              "Codex Cryptica exclusive — build full Adventure Canvases inside the app",
          },
        ],
      },
    });

    expect(
      screen.getByText(
        "Codex Cryptica exclusive — build full Adventure Canvases inside the app",
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText(/generate full Delve Canvases and Dossiers/i),
    ).toBeNull();
    expect(
      screen.getByRole("img", { name: "An interactive Adventure Canvas" }),
    ).toBeTruthy();
  });

  it.each(["adventure-generator", "adventure-idea-generator"] as const)(
    "places the Adventure Canvas exclusive card last for %s",
    (slug) => {
      const faqs = slugMeta[slug].faqs ?? [];
      const exclusiveFaq = faqs.at(-1);

      expect(exclusiveFaq).toMatchObject({
        image: "/images/adventure-canvas.png",
        inlineImage: "/images/adventure-canvas-button.png",
        exclusiveLabel:
          "Codex Cryptica exclusive — build full Adventure Canvases inside the app",
        inlineImageCaption:
          "The Open Adventure Canvas button on any generated result",
      });
      expect(exclusiveFaq?.answer).toContain("Open Adventure Canvas");
    },
  );
});

describe("FaqSection image view", () => {
  it("closes from its accessible backdrop and with Escape", async () => {
    render(FaqSection, {
      props: {
        introTitle: "Adventure Idea Generator",
        faqs: [
          {
            question: "Can I turn this into an interactive canvas?",
            answer: "Yes.",
            image: "/images/adventure-canvas.png",
            imageAlt: "An interactive Adventure Canvas",
          },
        ],
      },
    });

    const openButton = screen.getByRole("button", {
      name: "View larger image: An interactive Adventure Canvas",
    });
    await fireEvent.click(openButton);

    const dialog = screen.getByRole("dialog", { name: "Image view" });
    expect(dialog).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Dismiss image view" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Image view" })).toBeNull(),
    );

    await fireEvent.click(openButton);
    await fireEvent.keyDown(
      screen.getByRole("dialog", { name: "Image view" }),
      {
        key: "Escape",
      },
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Image view" })).toBeNull(),
    );
  });
});
