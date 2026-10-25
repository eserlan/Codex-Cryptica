/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import GeneratorRail from "./GeneratorRail.svelte";

function renderRail(variant: "default" | "names") {
  render(GeneratorRail, {
    props: {
      generatedData: {
        type: "character",
        title: "Names",
        content: "",
        lore: "",
        labels: [],
        status: "draft",
      },
      lore: "### Culture\nDrawn from old trade-guild roots.",
      variant,
      provenance: undefined,
      onSelectEntity: vi.fn(),
    },
  });
  return screen.getByText(/old trade-guild roots/).closest(".seo-rail")!;
}

describe("GeneratorRail", () => {
  it("keeps names-page notes in one readable column", () => {
    expect(renderRail("names").className).not.toMatch(/columns-/);
  });

  it("leaves other generators' notes unchanged", () => {
    expect(renderRail("default").className).not.toMatch(/columns-|py-2/);
  });
});
