/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import FaqSection from "./FaqSection.svelte";
import { slugMeta } from "./generator-page-meta";

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
