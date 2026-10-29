/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { fireEvent } from "@testing-library/svelte";
import { getAllExamples } from "#lib/content/examples/registry.js";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));

import ExampleAsideNav from "./ExampleAsideNav.svelte";

const [example, ...others] = getAllExamples();

describe("ExampleAsideNav", () => {
  it("shows the generation context and links to the generator", () => {
    render(ExampleAsideNav, { props: { example, related: [] } });

    expect(
      screen.getByRole("heading", { name: "How this was generated" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: example.generator.name }),
    ).toBeTruthy();
  });

  it("lists other examples and expands past six", async () => {
    const related = others.slice(0, 9).map((o) => ({
      slug: o.slug,
      title: o.title,
    }));
    render(ExampleAsideNav, { props: { example, related } });

    const toggle = screen.getByRole("button", { name: /Show \d+ more/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    const before = screen.getAllByRole("link", { name: /./ }).length;

    await fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("link", { name: /./ }).length).toBeGreaterThan(
      before,
    );
  });

  it("keeps the larger typography and scroll-bounded related list", () => {
    const related = others.slice(0, 9).map((o) => ({
      slug: o.slug,
      title: o.title,
    }));
    const exampleWithRelatedTopic = {
      ...example,
      relatedTopics: [
        {
          href: "/for/test-topic",
          title: "Related topic",
          description: "A relevant guide for this example.",
        },
      ],
    };
    render(ExampleAsideNav, {
      props: { example: exampleWithRelatedTopic, related },
    });

    const panel = screen.getByTestId("example-aside-panel");
    expect(panel.querySelector("h2")?.className).toContain("text-xs");
    expect(
      screen.getByRole("link", { name: example.generator.name }).parentElement
        ?.className,
    ).toContain("text-base");
    expect(screen.getByText("Related topic").className).toContain("text-base");
    expect(
      screen.getByText("A relevant guide for this example.").className,
    ).toContain("text-sm");

    const relatedLabel = screen.getByText(related[0].title);
    expect(relatedLabel.className).toContain("text-sm");
    expect(relatedLabel.closest("ul")?.className).toContain("flex-1");
    expect(relatedLabel.closest("ul")?.className).toContain("shrink-0");
    expect(
      panel.querySelector("div.hidden.min-h-0.flex-1.shrink-0"),
    ).toBeTruthy();
  });

  it("omits the other-examples list when there is nothing to show", () => {
    render(ExampleAsideNav, { props: { example, related: [] } });

    expect(screen.queryByText("Other examples")).toBeNull();
    expect(screen.queryByRole("button", { name: /more/ })).toBeNull();
  });
});
