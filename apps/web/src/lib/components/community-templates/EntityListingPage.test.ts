/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("$app/navigation", () => ({ goto: vi.fn() }));
vi.mock("$app/paths", () => ({ resolve: (p: string) => p }));
vi.mock(
  "$lib/services/publishing/PublicEntityTemplateDirectoryService",
  () => ({
    publicEntityTemplateDirectoryService: { probeListing: vi.fn() },
  }),
);
vi.mock("./EntityTemplateListingDetail.svelte", async () => ({
  default: (await import("./__fakes__/FakeListingDetail.svelte")).default,
}));

import EntityListingPage from "./EntityListingPage.svelte";

const detail = { listingId: "e1", title: "Guild Hall" } as any;

describe("EntityListingPage", () => {
  it("shows the listing when the id is an entity template", async () => {
    render(EntityListingPage, {
      listingId: "e1",
      probe: vi.fn(async () => ({ kind: "entity" as const, detail })),
    });
    expect((await screen.findByTestId("fake-detail")).textContent).toBe(
      "Guild Hall",
    );
  });

  it("shows the unavailable view for a missing listing", async () => {
    render(EntityListingPage, {
      listingId: "gone",
      probe: vi.fn(async () => ({ kind: "missing" as const })),
    });
    expect((await screen.findByTestId("fake-detail")).textContent).toBe(
      "unavailable",
    );
  });

  it("sends a Stat Sheet listing to its own page", async () => {
    const openStatSheet = vi.fn();
    render(EntityListingPage, {
      listingId: "s1",
      probe: vi.fn(async () => ({ kind: "stat-sheet" as const })),
      openStatSheet,
    });
    await waitFor(() => expect(openStatSheet).toHaveBeenCalledWith("s1"));
    expect(screen.queryByTestId("fake-detail")).toBeNull();
  });

  it("shows a plain-language error when the check fails", async () => {
    render(EntityListingPage, {
      listingId: "e1",
      probe: vi.fn(async () => {
        throw new Error("Could not load the template listing.");
      }),
    });
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Could not load the template listing.",
    );
  });

  it("says it is loading first", () => {
    render(EntityListingPage, {
      listingId: "e1",
      probe: vi.fn(() => new Promise<never>(() => {})),
    });
    expect(screen.getByRole("status").textContent).toMatch(/loading/i);
  });
});
