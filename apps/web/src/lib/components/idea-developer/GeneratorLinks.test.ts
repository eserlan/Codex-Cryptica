// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { vi } from "vitest";
import GeneratorLinks from "./GeneratorLinks.svelte";

afterEach(cleanup);

const suggestions = [
  { generatorKey: "settlement", reason: "The town needs a shape." },
  { generatorKey: "faction", reason: "Two groups want the parts." },
];

describe("GeneratorLinks", () => {
  it("shows each suggestion as a link with its reason", () => {
    render(GeneratorLinks, { props: { suggestions } });
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(screen.getByText("The town needs a shape.")).toBeTruthy();
    expect(screen.getByText("Two groups want the parts.")).toBeTruthy();
  });

  it("links to the generator route with no query string or idea text", () => {
    render(GeneratorLinks, { props: { suggestions } });
    for (const link of screen.getAllByRole("link")) {
      const href = link.getAttribute("href")!;
      expect(href).toMatch(/\/generators\/(settlement|faction)$/);
      expect(href).not.toContain("?");
      expect(href).not.toContain("#");
    }
  });

  it("shows the default set when there are no suggestions", () => {
    render(GeneratorLinks, { props: { suggestions: [] } });
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(2);
    expect(links.length).toBeLessThanOrEqual(5);
  });

  it("never shows a link for a generator that is not in the catalogue", () => {
    render(GeneratorLinks, {
      props: {
        suggestions: [
          { generatorKey: "zzz", reason: "Unknown" },
          { generatorKey: "npc", reason: "A person." },
        ],
      },
    });
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toContain("zzz");
    }
    expect(screen.queryByText("Unknown")).toBeNull();
  });

  it("tells the reader the idea comes with them", () => {
    render(GeneratorLinks, { props: { suggestions } });
    expect(screen.getByText(/Session Hub/i)).toBeTruthy();
  });
});

describe("GeneratorLinks reporting", () => {
  it("reports which generator was opened and where it was in the list", async () => {
    const onOpen = vi.fn();
    render(GeneratorLinks, { props: { suggestions, onOpen } });
    const links = screen.getAllByRole("link");
    await fireEvent.click(links[1]);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith({
      generatorKey: "faction",
      position: 1,
    });
  });

  it("does not fail when nothing is listening", async () => {
    render(GeneratorLinks, { props: { suggestions } });
    await expect(
      fireEvent.click(screen.getAllByRole("link")[0]),
    ).resolves.not.toThrow();
  });
});
