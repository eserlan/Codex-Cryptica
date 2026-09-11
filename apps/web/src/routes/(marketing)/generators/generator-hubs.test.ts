/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Page from "./+page.svelte";

vi.mock("$app/paths", () => ({
  base: "",
}));

describe("Generator hubs", () => {
  it("links to the Cosmic Horror generator hub", () => {
    render(Page);

    const link = screen.getByRole("link", { name: /cosmic horror hub/i });

    expect(link.getAttribute("href")).toBe("/generators/cosmic-horror");
  });

  it("keeps the cosmic-horror hub distinct from the vampire hub", () => {
    render(Page);

    expect(
      screen.getByRole("link", { name: /vampire hub/i }).getAttribute("href"),
    ).toBe("/generators/vampire");
  });
});
