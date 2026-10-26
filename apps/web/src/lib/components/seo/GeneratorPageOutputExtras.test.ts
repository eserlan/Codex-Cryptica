/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import {
  businessGeneratorOutput,
  generateBusinessLocal,
  generateOneShotLocal,
  generatePointCrawlLocal,
} from "generator-engine";
import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
import GeneratorPageOutputExtras from "./GeneratorPageOutputExtras.svelte";

const regenerate = vi.hoisted(() => vi.fn());
vi.mock("#lib/services/seo/generator-engine.js", () => ({
  generatorEngine: { regenerateBusinessSection: regenerate },
}));

describe("generator output refinement selection", () => {
  it("renders the one-shot panel only for the one-shot slug", async () => {
    const output = generateOneShotLocal({
      durationHours: 3,
    }) as GeneratorOutput;
    const props = {
      slug: "one-shot-adventure-generator",
      output,
      useAI: false,
      onReplace: vi.fn(),
    };
    const { rerender } = render(GeneratorPageOutputExtras, { props });
    expect(screen.getByTestId("one-shot-refine-panel")).toBeTruthy();
    await rerender({ ...props, slug: "npc" });
    expect(screen.queryByTestId("one-shot-refine-panel")).toBeNull();
  });

  it("renders point-crawl refinements for a crawl result", () => {
    const output = generatePointCrawlLocal({}) as GeneratorOutput;
    render(GeneratorPageOutputExtras, {
      props: { slug: "point-crawl", output, useAI: false, onReplace: vi.fn() },
    });
    expect(screen.getByTestId("point-crawl-refine-panel")).toBeTruthy();
    expect(screen.queryByTestId("one-shot-refine-panel")).toBeNull();
  });

  it("wraps a refined business document and forwards the AI choice", async () => {
    const business = generateBusinessLocal({ businessType: "Blacksmith" });
    business.fallbackSections = ["pressure"];
    business.warnings = ["A named stranger"];
    const next = { ...business, pressure: "A new pressure" };
    regenerate.mockResolvedValueOnce({ document: next, warnings: [] });
    const onReplace = vi.fn();
    render(GeneratorPageOutputExtras, {
      props: {
        slug: "business",
        output: businessGeneratorOutput(business) as GeneratorOutput,
        useAI: true,
        onReplace,
      },
    });
    expect(
      screen.getByText(/Some parts were written from the tables/),
    ).toBeTruthy();
    expect(screen.getByText(/A named stranger/)).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: /Rewrite current pressure/i }),
    );
    await waitFor(() =>
      expect(onReplace).toHaveBeenCalledWith(businessGeneratorOutput(next)),
    );
    expect(regenerate).toHaveBeenCalledWith(
      business,
      "pressure",
      expect.objectContaining({ useAI: true }),
    );
  });

  it("renders no business controls without a business document", () => {
    const { container } = render(GeneratorPageOutputExtras, {
      props: {
        slug: "business",
        output: { type: "note", title: "Incomplete result" } as GeneratorOutput,
        useAI: false,
        onReplace: vi.fn(),
      },
    });
    expect(container.textContent).toBe("");
  });
});
