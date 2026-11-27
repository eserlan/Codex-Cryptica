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

  it("renders a custom linksTitle and link descriptions when provided", () => {
    render(GeneratorGuideSection, {
      props: {
        introTitle: "Nation Generator",
        guide: {
          summary: "Generate a named state.",
          tips: [
            { title: "Set scale", detail: "Pick city-state or dominion." },
          ],
          linksTitle: "Bring your nation to life",
          links: [
            {
              href: "/answers/how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses",
              label: "Give civilisations distinct strengths and weaknesses",
              description:
                "Develop believable institutional advantages, dependencies and weaknesses for the generated nation.",
            },
            {
              href: "/answers/how-do-i-run-political-intrigue-and-faction-play",
              label: "Run political intrigue and faction play",
              description:
                "Turn its competing power blocs into active rivalries and consequential player choices.",
            },
            {
              href: "/answers/how-do-i-build-a-believable-constitutional-crisis-or-coup",
              label: "Build a believable constitutional crisis or coup",
              description:
                "Develop its hidden problem into a political crisis with stakes and multiple outcomes.",
            },
          ],
        },
      },
    });

    expect(
      screen.getByRole("heading", { name: "Bring your nation to life" }),
    ).toBeTruthy();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    expect(links[0].getAttribute("href")).toContain(
      "/answers/how-do-i-give-different-civilisations-distinct-strengths-and-weaknesses",
    );
    expect(
      screen.getByText(
        "Turn its competing power blocs into active rivalries and consequential player choices.",
      ),
    ).toBeTruthy();
  });

  it("renders nothing when guide is omitted", () => {
    const { container } = render(GeneratorGuideSection, {
      props: { introTitle: "Star System Generator" },
    });
    expect(container.querySelector("section")).toBeNull();
  });
});
