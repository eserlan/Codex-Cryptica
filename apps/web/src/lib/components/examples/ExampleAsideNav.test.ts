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

  it("omits the other-examples list when there is nothing to show", () => {
    render(ExampleAsideNav, { props: { example, related: [] } });

    expect(screen.queryByText("Other examples")).toBeNull();
    expect(screen.queryByRole("button", { name: /more/ })).toBeNull();
  });
});
