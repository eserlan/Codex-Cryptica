import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/svelte";
import GeneratorGuideSection from "./GeneratorGuideSection.svelte";

describe("GeneratorGuideSection", () => {
  it("renders heading, summary, tips, and further reading links when guide is provided", () => {
    render(GeneratorGuideSection, {
      props: {
        introTitle: "Star System Generator",
        guide: {
          summary: "Treat a star system as a playable region map.",
          tips: [
            { title: "Start with stakes", detail: "Pick two rival factions." },
            { title: "Use hazards", detail: "Add radiation or debris fields." },
          ],
          links: [
            {
              href: "/answers/how-do-i-run-common-character-roles-in-a-sci-fi-or-space-opera-rpg",
              label: "Running sci-fi party roles",
            },
          ],
        },
      },
    });

    expect(
      screen.getByRole("heading", {
        name: "How to use the Star System Generator",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText("Treat a star system as a playable region map."),
    ).toBeTruthy();
    expect(screen.getByText("Start with stakes")).toBeTruthy();
    const link = screen.getByRole("link", {
      name: "Running sci-fi party roles",
    });
    expect(link.getAttribute("href")).toContain(
      "/answers/how-do-i-run-common-character-roles-in-a-sci-fi-or-space-opera-rpg",
    );
  });

  it("renders nothing when guide is omitted", () => {
    const { container } = render(GeneratorGuideSection, {
      props: { introTitle: "Star System Generator" },
    });
    expect(container.querySelector("section")).toBeNull();
  });
});
