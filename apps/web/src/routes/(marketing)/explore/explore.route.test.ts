/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/svelte";

vi.mock("$app/paths", () => ({ base: "" }));

import Page from "./+page.svelte";

const emptyData = { label: "", results: [] };

describe("/explore route", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("publishes dedicated Open Graph and Twitter metadata", () => {
    render(Page, { props: { data: emptyData } });

    const expectedImage =
      "https://assets.codexcryptica.com/screenshots/feature-connect.jpg";

    expect(document.title).toBe("Explore Codex Cryptica | Codex Cryptica");
    expect(
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content"),
    ).toBe(
      "Every section of Codex Cryptica in one place: features, worlds, examples, generators, tools, topics, guides, and the campaign directory.",
    );
    expect(
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content"),
    ).toBe(expectedImage);
    expect(
      document
        .querySelector('meta[property="og:image:alt"]')
        ?.getAttribute("content"),
    ).toBe("Explore Codex Cryptica's connected campaign-building tools");
    expect(
      document
        .querySelector('meta[name="twitter:image"]')
        ?.getAttribute("content"),
    ).toBe(expectedImage);
    expect(
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content"),
    ).not.toBe("https://codexcryptica.com/og-image.png");
  });

  it("renders Features and silhouettes links under Build & Explore", () => {
    render(Page, { props: { data: emptyData } });

    const featuresLink = document.querySelector('a[href="/features"]');
    expect(featuresLink).toBeTruthy();
    expect(featuresLink?.textContent).toContain("Features");

    const silhouettesLink = document.querySelector('a[href="/silhouettes"]');
    expect(silhouettesLink).toBeTruthy();
    expect(silhouettesLink?.textContent).toContain("Vector Silhouettes");
  });

  it("groups the topic links under Browse by Topic in directory order", () => {
    render(Page, { props: { data: emptyData } });

    const headingNames = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent?.trim());
    expect(headingNames).toEqual([
      "Build & Explore",
      "Find Your Setup",
      "Browse by Topic",
      "Learn",
      "Community & Legal",
    ]);

    const topicSection = screen
      .getByRole("heading", { name: "Browse by Topic", level: 2 })
      .closest("section");
    expect(topicSection?.textContent).toContain(
      "Guides, worked examples, and tools for the campaign you’re running.",
    );
    const topicLinks = Array.from(
      topicSection?.querySelectorAll<HTMLAnchorElement>(
        'a[href^="/topics/"]',
      ) ?? [],
    );
    expect(topicLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/topics/heists",
      "/topics/puzzles",
      "/topics/pirates",
      "/topics/dnd",
      "/topics/dnd-beginners",
    ]);
    for (const href of [
      "/topics/heists",
      "/topics/puzzles",
      "/topics/pirates",
      "/topics/dnd",
      "/topics/dnd-beginners",
    ]) {
      expect(document.querySelectorAll(`a[href="${href}"]`)).toHaveLength(1);
    }
    expect(
      topicLinks.map((link) =>
        link.querySelector("span.flex.flex-col > span")?.textContent?.trim(),
      ),
    ).toEqual([
      "Heists",
      "Puzzles",
      "Pirates & High Seas",
      "Running D&D",
      "D&D for Beginners",
    ]);

    const learnSection = screen
      .getByRole("heading", { name: "Learn", level: 2 })
      .closest("section");
    expect(learnSection?.querySelectorAll('a[href^="/topics/"]')).toHaveLength(
      0,
    );
  });

  it("hides the directory while searching and restores it when search clears", async () => {
    render(Page, { props: { data: emptyData } });
    const search = screen.getByRole("searchbox", {
      name: "Search Codex Cryptica",
    });

    await fireEvent.input(search, { target: { value: "pirate" } });
    expect(
      screen.queryByRole("heading", { name: "Browse by Topic", level: 2 }),
    ).toBeNull();

    await fireEvent.input(search, { target: { value: "" } });
    expect(
      screen.getByRole("heading", { name: "Browse by Topic", level: 2 }),
    ).toBeTruthy();
  });

  it("links to the community templates directory under Build & Explore", () => {
    render(Page, { props: { data: emptyData } });

    const templatesLink = document.querySelector('a[href="/templates"]');
    expect(templatesLink).toBeTruthy();
    expect(templatesLink?.textContent).toContain("Templates");
  });

  it("does not show the templates link on a label view", () => {
    render(Page, {
      props: { data: { ...emptyData, label: "cyberpunk" } },
    });

    expect(document.querySelector('a[href="/templates"]')).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Browse by Topic", level: 2 }),
    ).toBeNull();
  });
});
