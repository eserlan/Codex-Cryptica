import { describe, expect, it, vi } from "vitest";

const { probeListing } = vi.hoisted(() => ({ probeListing: vi.fn() }));

vi.mock("$app/paths", () => ({ resolve: (p: string) => p }));
vi.mock(
  "$lib/services/publishing/PublicEntityTemplateDirectoryService",
  () => ({
    publicEntityTemplateDirectoryService: { probeListing },
  }),
);

import { load } from "./+page";

const run = (id: string) => load({ params: { listingId: id } });

describe("Stat Sheet listing page load", () => {
  it("sends an entity template listing to its own page", async () => {
    probeListing.mockResolvedValue({ kind: "entity", detail: {} });
    await expect(run("e1")).rejects.toMatchObject({
      status: 307,
      location: "/templates/entity/e1",
    });
  });

  it.each([
    ["a Stat Sheet listing", { kind: "stat-sheet" }],
    ["a missing listing", { kind: "missing" }],
  ])("carries on to the Stat Sheet page for %s", async (_label, probe) => {
    probeListing.mockResolvedValue(probe);
    await expect(run("s1")).resolves.toEqual({});
  });

  it("carries on when the check itself fails, so the page reports its own error", async () => {
    probeListing.mockRejectedValue(new Error("offline"));
    await expect(run("s1")).resolves.toEqual({});
  });
});
