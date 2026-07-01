/** @vitest-environment jsdom */

import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Page from "./+page.svelte";
import { load } from "./+page";

vi.mock("$app/paths", () => ({
  resolve: (value: string) => value,
}));

describe("/worlds route", () => {
  it("loads browse and filter results from the public directory API", async () => {
    const response = (await load({
      url: new URL(
        "https://codex-cryptica.com/worlds?q=nomad&labels=cyberpunk",
      ),
      fetch: vi.fn(async (requestUrl: string) => {
        expect(requestUrl).toContain("/api/directory/listings");
        expect(requestUrl).toContain("q=nomad");
        expect(requestUrl).toContain("labels=cyberpunk");
        return new Response(
          JSON.stringify({
            results: [
              {
                publishId: "pub-123",
                guestUrl: "/guest/pub-123",
                title: "Nomad Roads",
                description: "Clan politics on the fringe.",
                labels: ["cyberpunk"],
                visibleEntityCount: 12,
                listingUpdatedAt: "2026-06-30T12:00:00.000Z",
              },
            ],
          }),
        );
      }) as any,
    } as any)) as any;

    expect(response.page.results).toHaveLength(1);
    expect(response.query.labels).toEqual(["cyberpunk"]);
  });

  it("renders browse cards that link only to the read-only guest route", () => {
    render(Page, {
      props: {
        data: {
          query: { q: "", labels: [] },
          error: "",
          page: {
            results: [
              {
                publishId: "pub-123",
                guestUrl: "/guest/pub-123",
                title: "Nomad Roads",
                description: "Clan politics on the fringe.",
                labels: ["cyberpunk"],
                visibleEntityCount: 12,
                listingUpdatedAt: "2026-06-30T12:00:00.000Z",
              },
            ],
          },
        },
      },
    });

    expect(
      screen.getByRole("heading", { name: /browse shared guest worlds/i }),
    ).toBeTruthy();
    const link = screen.getByRole("link", { name: /nomad roads/i });
    expect(link.getAttribute("href")).toBe("/guest/pub-123");
    expect(
      (screen.getByRole("searchbox", { name: /search/i }) as HTMLInputElement)
        .value,
    ).toBe("");
  });
});
