/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/svelte";

vi.mock("$app/paths", () => ({
  base: "",
  asset: (p: string) => p,
  resolve: (p: string) => p,
}));

import Page from "./+page.svelte";

const releases = [
  {
    version: "2.0.0",
    date: "2026-02-01",
    title: "Second",
    type: "major",
    highlights: ["Two"],
  },
  {
    version: "1.0.0",
    date: "2026-01-01",
    title: "First",
    type: "minor",
    highlights: ["One"],
  },
];

describe("/changelog route", () => {
  it("lists every release in a sticky index whose links hit the entry ids", () => {
    const { container } = render(Page, {
      props: { data: { releases, canonicalUrl: "https://x/changelog" } },
    });

    const index = screen.getByTestId("changelog-index");
    const links = [...index.querySelectorAll("a")];
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "#v2.0.0",
      "#v1.0.0",
    ]);
    for (const link of links) {
      expect(
        container.querySelector(
          `section[id="${link.getAttribute("href")!.slice(1)}"]`,
        ),
      ).not.toBeNull();
    }
    expect(index.parentElement?.className).toContain("lg:sticky");
  });

  it("keeps entries at reading width and skips the index for a single release", () => {
    const { container } = render(Page, {
      props: {
        data: {
          releases: releases.slice(0, 1),
          canonicalUrl: "https://x/changelog",
        },
      },
    });

    expect(container.querySelector("ul.max-w-3xl")).not.toBeNull();
    expect(screen.queryByTestId("changelog-index")).toBeNull();
  });
});
