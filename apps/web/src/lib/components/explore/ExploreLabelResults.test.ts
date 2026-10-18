/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/svelte";
import ExploreLabelResults from "./ExploreLabelResults.svelte";
import ExploreSectionList from "./ExploreSectionList.svelte";

describe("ExploreLabelResults", () => {
  it("groups results under their kind and prefixes internal links", () => {
    render(ExploreLabelResults, {
      props: {
        label: "heist",
        cleanBase: "/app",
        results: [
          { kind: "answer", title: "A1", summary: "s", href: "/answers/a1" },
          {
            kind: "generator",
            title: "G1",
            summary: "s",
            href: "https://x.test/g",
          },
        ],
      },
    });

    expect(screen.getByRole("heading", { name: "Answers" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Generators" })).toBeTruthy();
    expect(screen.getByText("A1").closest("a")?.getAttribute("href")).toBe(
      "/app/answers/a1",
    );
    expect(screen.getByText("G1").closest("a")?.getAttribute("href")).toBe(
      "https://x.test/g",
    );
  });

  it("shows an empty state that links back to Explore", () => {
    render(ExploreLabelResults, {
      props: { label: "heist", cleanBase: "/app", results: [] },
    });

    expect(screen.getByText(/Nothing is tagged/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "all of Explore" }).getAttribute("href"),
    ).toBe("/app/explore");
  });
});

describe("ExploreSectionList", () => {
  it("opens external links in a new tab and keeps internal ones on site", () => {
    render(ExploreSectionList, {
      props: {
        cleanBase: "/app",
        sections: [
          {
            title: "Links",
            description: "",
            links: [
              { href: "/features", label: "Features", summary: "", icon: "i" },
              {
                href: "https://ext.test",
                label: "Ext",
                summary: "",
                icon: "i",
                external: true,
              },
            ],
          },
        ],
      },
    });

    const internal = screen.getByText("Features").closest("a");
    const external = screen.getByText("Ext").closest("a");
    expect(internal?.getAttribute("href")).toBe("/app/features");
    expect(internal?.getAttribute("target")).toBeNull();
    expect(external?.getAttribute("href")).toBe("https://ext.test");
    expect(external?.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
