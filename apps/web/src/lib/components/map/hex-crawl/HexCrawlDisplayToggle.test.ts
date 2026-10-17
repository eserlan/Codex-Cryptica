/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import HexCrawlDisplayToggle from "./HexCrawlDisplayToggle.svelte";

const base = {
  checked: false,
  onChange: vi.fn(),
  isGM: true,
  isGuest: false,
  modeOn: true,
};

describe("HexCrawlDisplayToggle", () => {
  it("shows the terrain icons switch to the GM with Hex Crawl on, and reports changes", async () => {
    const onChange = vi.fn();
    render(HexCrawlDisplayToggle, { ...base, onChange });

    await fireEvent.click(
      screen.getByRole("switch", { name: "Show terrain icons" }),
    );
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("is hidden while Hex Crawl mode is off", () => {
    render(HexCrawlDisplayToggle, { ...base, modeOn: false });

    expect(
      screen.queryByRole("switch", { name: "Show terrain icons" }),
    ).toBeNull();
  });

  it("is hidden for guests", () => {
    render(HexCrawlDisplayToggle, { ...base, isGuest: true });

    expect(
      screen.queryByRole("switch", { name: "Show terrain icons" }),
    ).toBeNull();
  });
});
